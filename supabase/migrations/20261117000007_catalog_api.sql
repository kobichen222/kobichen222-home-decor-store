-- =====================================================================
-- 0007 · Public catalog read API (views + search functions)
-- =====================================================================
-- These views are the storefront's read model. They run with the owner's
-- rights on purpose (security_invoker = false): they expose only active
-- products and a capped availability figure, while the raw inventory and
-- cost tables stay closed to the public by RLS.

create view public.catalog_variants with (security_invoker = false) as
select
  v.id,
  v.product_id,
  v.sku,
  v.name,
  v.options,
  v.is_default,
  v.sort_order,
  v.image_id,
  coalesce(v.lead_time_days, p.handling_days) as lead_time_days,
  coalesce(v.price, p.price) as regular_price,
  case
    when v.price is not null then
      case when v.sale_price is not null and v.sale_price < v.price and s.sale_active then v.sale_price else v.price end
    else
      case when p.sale_price is not null and s.sale_active then p.sale_price else p.price end
  end as price,
  least(greatest(i.on_hand - i.reserved, 0), 20) as available,
  (i.on_hand - i.reserved > 0) as in_stock,
  i.allow_backorder,
  (i.on_hand - i.reserved > 0 and i.on_hand - i.reserved <= i.low_stock_threshold) as low_stock
from public.product_variants v
join public.products p on p.id = v.product_id
join public.inventory i on i.variant_id = v.id
cross join lateral (
  select (p.sale_starts_at is null or p.sale_starts_at <= now())
     and (p.sale_ends_at is null or p.sale_ends_at > now()) as sale_active
) s
where p.status = 'active' and v.is_active;

create view public.catalog_products with (security_invoker = false) as
select
  p.id, p.name, p.slug, p.sku, p.short_description, p.brand_id, p.is_featured,
  p.sales_count, p.created_at, p.updated_at, p.noindex,
  best.price,
  best.regular_price,
  case when best.regular_price > best.price and best.regular_price > 0
       then round((best.regular_price - best.price) / best.regular_price * 100)::int else 0 end as discount_percent,
  agg.in_stock,
  agg.purchasable,
  agg.variant_count,
  agg.price_varies,
  img.url as image_url,
  img.alt as image_alt,
  img2.url as hover_image_url
from public.products p
join lateral (
  select cv.price, cv.regular_price from public.catalog_variants cv
   where cv.product_id = p.id order by cv.price asc, cv.sort_order asc limit 1
) best on true
join lateral (
  select bool_or(cv.in_stock) as in_stock,
         bool_or(cv.in_stock or cv.allow_backorder) as purchasable,
         count(*)::int as variant_count,
         (min(cv.price) <> max(cv.price)) as price_varies
    from public.catalog_variants cv where cv.product_id = p.id
) agg on true
left join lateral (
  select url, alt from public.product_images pi where pi.product_id = p.id
   order by pi.is_primary desc, pi.sort_order asc limit 1
) img on true
left join lateral (
  select url from public.product_images pi where pi.product_id = p.id
   order by pi.is_primary desc, pi.sort_order asc offset 1 limit 1
) img2 on true
where p.status = 'active';

-- All descendants of a category (inclusive), active only.
create or replace function public.category_tree(p_category_id uuid)
returns setof uuid language sql stable set search_path = public, pg_temp as $$
  with recursive tree as (
    select id from public.categories where id = p_category_id and is_active
    union all
    select c.id from public.categories c join tree t on c.parent_id = t.id where c.is_active
  )
  select id from tree;
$$;

-- Base product set for a listing: category subtree / collection / free text.
create or replace function public.catalog_base(p_category_id uuid, p_collection_id uuid, p_q text)
returns setof public.catalog_products language sql stable security definer set search_path = public, pg_temp as $$
  select cp.*
    from public.catalog_products cp
    join public.products p on p.id = cp.id
   where (p_category_id is null or exists (
            select 1 from public.product_categories pc
             where pc.product_id = cp.id and pc.category_id in (select public.category_tree(p_category_id))))
     and (p_collection_id is null or exists (
            select 1 from public.collection_products c where c.product_id = cp.id and c.collection_id = p_collection_id))
     and (coalesce(btrim(p_q), '') = '' or not exists (
            select 1 from regexp_split_to_table(lower(btrim(p_q)), '\s+') w
             where w <> '' and position(w in p.search_text) = 0));
$$;

-- Paged, filtered, sorted product listing. Attribute filters are OR within
-- an attribute and AND across attributes.
create or replace function public.catalog_search(
  p_category_id uuid default null,
  p_collection_id uuid default null,
  p_q text default null,
  p_value_ids uuid[] default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_on_sale boolean default false,
  p_in_stock boolean default false,
  p_sort text default 'featured',
  p_limit int default 24,
  p_offset int default 0
) returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  with filtered as (
    select b.*
      from public.catalog_base(p_category_id, p_collection_id, left(p_q, 100)) b
     where (p_min_price is null or b.price >= p_min_price)
       and (p_max_price is null or b.price <= p_max_price)
       and (not coalesce(p_on_sale, false) or b.discount_percent > 0)
       and (not coalesce(p_in_stock, false) or b.in_stock)
       and (p_value_ids is null or cardinality(p_value_ids) = 0 or not exists (
             select 1 from (
               select distinct attribute_id from public.product_attribute_values where id = any(p_value_ids)
             ) wanted
             where not exists (
               select 1 from public.product_attribute_assignments a
                 join public.product_attribute_values v on v.id = a.attribute_value_id
                where a.product_id = b.id and v.attribute_id = wanted.attribute_id and v.id = any(p_value_ids))))
  ),
  page as (
    select * from filtered f
     order by
       case when p_sort = 'price_asc' then f.price end asc,
       case when p_sort = 'price_desc' then f.price end desc,
       case when p_sort = 'newest' then f.created_at end desc,
       case when p_sort = 'bestsellers' then f.sales_count end desc,
       case when p_sort = 'discount' then f.discount_percent end desc,
       f.is_featured desc, f.sales_count desc, f.created_at desc, f.id
     limit least(greatest(coalesce(p_limit, 24), 1), 60)
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'items', coalesce((select jsonb_agg(to_jsonb(page)) from page), '[]'::jsonb));
$$;

-- Filter facets for a listing: attribute values with product counts and
-- the price range, computed on the unfiltered base set.
create or replace function public.catalog_facets(
  p_category_id uuid default null,
  p_collection_id uuid default null,
  p_q text default null
) returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  with base as (
    select * from public.catalog_base(p_category_id, p_collection_id, left(p_q, 100))
  ),
  vals as (
    select v.attribute_id, v.id, v.value, v.color_hex, v.sort_order, count(*) as product_count
      from public.product_attribute_assignments a
      join base b on b.id = a.product_id
      join public.product_attribute_values v on v.id = a.attribute_value_id
     group by v.attribute_id, v.id
  )
  select jsonb_build_object(
    'price_min', (select floor(min(price)) from base),
    'price_max', (select ceil(max(price)) from base),
    'on_sale_count', (select count(*) from base where discount_percent > 0),
    'attributes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', a.id, 'code', a.code, 'name', a.name, 'kind', a.kind,
               'values', (select jsonb_agg(jsonb_build_object(
                            'id', v.id, 'value', v.value, 'color_hex', v.color_hex, 'count', v.product_count)
                            order by v.sort_order, v.value)
                            from vals v where v.attribute_id = a.id))
             order by a.sort_order, a.name)
        from public.product_attributes a
       where a.is_filterable and exists (select 1 from vals v where v.attribute_id = a.id)), '[]'::jsonb));
$$;
