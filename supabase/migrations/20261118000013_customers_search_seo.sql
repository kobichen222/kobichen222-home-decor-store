-- =====================================================================
-- 0013 · Customer accounts, reviews, smart search, redirects, rate limits
-- =====================================================================

-- ---------- Reviews ---------------------------------------------------
alter table public.reviews add column if not exists title text;
alter table public.reviews add column if not exists email text;
create unique index if not exists reviews_one_per_order_product on public.reviews(order_id, product_id) where order_id is not null;
create trigger audit_reviews after update or delete on public.reviews for each row execute function public.audit_row();

-- Rating summary per product (approved reviews only), for cards and pages.
create or replace view public.product_ratings with (security_invoker = false) as
select product_id, round(avg(rating)::numeric, 1) as average, count(*)::int as count
  from public.reviews where status = 'approved' and product_id is not null
 group by product_id;
grant select on public.product_ratings to anon, authenticated;

-- ---------- Search: typo tolerance, suggestions, popular searches -----
create index if not exists products_name_trgm_idx on public.products using gin (lower(name) extensions.gin_trgm_ops);

-- Same as before, plus a fuzzy fallback: a product matches when every word
-- is present, OR when the query is close enough to its text (typos such
-- as "שעום" for "שעון").
create or replace function public.catalog_base(p_category_id uuid, p_collection_id uuid, p_q text)
returns setof public.catalog_products language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select cp.*
    from public.catalog_products cp
    join public.products p on p.id = cp.id
   where (p_category_id is null or exists (
            select 1 from public.product_categories pc
             where pc.product_id = cp.id and pc.category_id in (select public.category_tree(p_category_id))))
     and (p_collection_id is null or exists (
            select 1 from public.collection_products c where c.product_id = cp.id and c.collection_id = p_collection_id))
     and (coalesce(btrim(p_q), '') = ''
          or not exists (
               select 1 from regexp_split_to_table(lower(btrim(p_q)), '\s+') w
                where w <> '' and position(w in p.search_text) = 0)
          or (char_length(btrim(p_q)) >= 3
              and not exists (
                select 1 from regexp_split_to_table(lower(btrim(p_q)), '\s+') w
                 where w <> '' and extensions.word_similarity(w, p.search_text) < 0.5)));
$$;

create table public.search_log (
  id bigint generated always as identity primary key,
  q text not null,
  results int not null,
  created_at timestamptz not null default now()
);
create index search_log_created_idx on public.search_log(created_at desc);
alter table public.search_log enable row level security;
create policy search_log_admin on public.search_log for select to authenticated using ((select public.has_permission('reports.view')));
grant select on public.search_log to authenticated;
grant all on public.search_log to service_role;

create or replace function public.popular_searches(p_limit int default 6)
returns setof text language sql stable security definer set search_path = public, pg_temp as $$
  select q from public.search_log
   where created_at > now() - interval '30 days' and results > 0 and char_length(q) between 2 and 40
   group by q order by count(*) desc, max(created_at) desc limit least(p_limit, 20);
$$;

-- Autocomplete: products and categories for a partial, possibly misspelt query.
create or replace function public.catalog_suggest(p_q text)
returns jsonb language sql stable security definer set search_path = public, extensions, pg_temp as $$
  with q as (select lower(btrim(left(p_q, 60))) as v)
  select jsonb_build_object(
    'products', coalesce((
      select jsonb_agg(x) from (
        select cp.name, cp.slug, cp.price, cp.image_url
          from public.catalog_products cp join public.products p on p.id = cp.id, q
         where q.v <> '' and (p.search_text like '%' || q.v || '%' or extensions.word_similarity(q.v, p.search_text) >= 0.45)
         order by (lower(cp.name) like q.v || '%') desc, extensions.word_similarity(q.v, p.search_text) desc, cp.sales_count desc
         limit 6) x), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(x) from (
        select c.name, c.slug from public.categories c, q
         where c.is_active and q.v <> '' and (lower(c.name) like '%' || q.v || '%' or extensions.word_similarity(q.v, lower(c.name)) >= 0.5)
         order by extensions.word_similarity(q.v, lower(c.name)) desc limit 4) x), '[]'::jsonb));
$$;

-- ---------- Redirects: a changed URL keeps working (301) ---------------
create or replace function public.trg_slug_redirect()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_prefix text := tg_argv[0]; v_from text; v_to text;
begin
  if new.slug is distinct from old.slug then
    v_from := v_prefix || old.slug;
    v_to := v_prefix || new.slug;
    -- Earlier redirects to the old URL now point straight at the new one.
    update public.redirects set to_path = v_to where to_path = v_from;
    delete from public.redirects where from_path = v_to;
    insert into public.redirects (from_path, to_path, status_code) values (v_from, v_to, 301)
    on conflict (from_path) do update set to_path = excluded.to_path;
  end if;
  return null;
end $$;
create trigger products_slug_redirect after update of slug on public.products for each row execute function public.trg_slug_redirect('/product/');
create trigger categories_slug_redirect after update of slug on public.categories for each row execute function public.trg_slug_redirect('/category/');
create trigger collections_slug_redirect after update of slug on public.collections for each row execute function public.trg_slug_redirect('/collections/');
create trigger blog_posts_slug_redirect after update of slug on public.blog_posts for each row execute function public.trg_slug_redirect('/blog/');
create trigger pages_slug_redirect after update of slug on public.pages for each row execute function public.trg_slug_redirect('/');

-- ---------- Rate limiting (login, sign-up, forms) ---------------------
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security;
grant all on public.rate_limits to service_role;

-- True while the caller is within the limit. Fixed windows; atomic.
create or replace function public.rate_limit_hit(p_key text, p_limit int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
        v_hits int;
begin
  insert into public.rate_limits (key, window_start, hits) values (p_key, v_start, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  if random() < 0.01 then delete from public.rate_limits where window_start < now() - interval '1 day'; end if;
  return v_hits <= p_limit;
end $$;

-- ---------- Customer accounts -----------------------------------------
-- Customers manage their own default address flag; one default per user.
create unique index if not exists customer_addresses_one_default on public.customer_addresses(user_id) where is_default;

-- A customer may read only their own, published-to-them order events.
create policy order_events_own on public.order_events for select to authenticated
  using (not is_internal and exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));

-- Settings for analytics tags (public: rendered in the page head).
insert into public.store_settings (key, value, is_public) values
  ('analytics', jsonb_build_object('ga4_id', '', 'meta_pixel_id', '', 'gsc_verification', ''), true)
on conflict (key) do nothing;

-- ---------- Function privileges --------------------------------------
revoke execute on function public.rate_limit_hit(text, int, int), public.trg_slug_redirect() from public, anon, authenticated;
grant execute on function public.catalog_suggest(text), public.popular_searches(int) to anon, authenticated;
grant execute on all functions in schema public to service_role;
