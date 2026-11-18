begin;
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

insert into supabase_migrations.schema_migrations (version, name) values ('20261118000013', 'customers_search_seo') on conflict (version) do nothing;

-- =====================================================================
-- 0014 · Admin notifications and e-mail automation bookkeeping
-- =====================================================================
alter table public.carts add column if not exists reminder_sent_at timestamptz;

-- In-admin notifications for events that need attention.
create or replace function public.trg_notify()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_table_name = 'stock_alerts' then
    insert into public.notifications (kind, title, body, link, permission_code)
    select 'stock',
           case when new.kind = 'out_of_stock' then 'מוצר אזל מהמלאי' else 'מלאי נמוך' end,
           p.name || coalesce(' · ' || v.name, ''),
           '/admin/products/' || p.id, 'inventory.manage'
      from public.product_variants v join public.products p on p.id = v.product_id
     where v.id = new.variant_id;
  elsif tg_table_name = 'leads' then
    insert into public.notifications (kind, title, body, link, permission_code)
    values ('lead', 'פנייה חדשה מהאתר', coalesce(new.full_name, '') || coalesce(' · ' || new.phone, ''),
            '/admin/leads/' || new.id, 'marketing.manage');
  elsif tg_table_name = 'reviews' then
    insert into public.notifications (kind, title, body, link, permission_code)
    values ('review', 'חוות דעת ממתינה לאישור', new.author_name || ' · ' || new.rating || '★', '/admin/reviews/' || new.id, 'content.manage');
  end if;
  return null;
end $$;
create trigger stock_alerts_notify after insert on public.stock_alerts for each row execute function public.trg_notify();
create trigger leads_notify after insert on public.leads for each row
  when (new.kind <> 'newsletter') execute function public.trg_notify();
create trigger reviews_notify after insert on public.reviews for each row
  when (new.status = 'pending') execute function public.trg_notify();

-- Unread count + latest items for the signed-in admin.
create or replace function public.my_notifications(p_limit int default 15)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  with visible as (
    select * from public.notifications n
     where public.is_admin() and (n.permission_code is null or public.has_permission(n.permission_code))
  )
  select jsonb_build_object(
    'unread', (select count(*) from visible where read_at is null),
    'items', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select id, kind, title, body, link, read_at, created_at from visible order by created_at desc limit least(p_limit, 50)) x), '[]'::jsonb));
$$;

create or replace function public.mark_notifications_read()
returns void language sql security definer set search_path = public, pg_temp as $$
  update public.notifications n set read_at = now()
   where n.read_at is null and public.is_admin() and (n.permission_code is null or public.has_permission(n.permission_code));
$$;

revoke execute on function public.trg_notify(), public.my_notifications(int), public.mark_notifications_read() from public, anon;
grant execute on function public.my_notifications(int), public.mark_notifications_read() to authenticated;
grant execute on all functions in schema public to service_role;

insert into supabase_migrations.schema_migrations (version, name) values ('20261118000014', 'notifications') on conflict (version) do nothing;

-- =====================================================================
-- 0015 · Two-factor authentication for admins, enforced in the database
-- =====================================================================
-- An admin who enrolled an authenticator app holds admin rights only in
-- a session that completed the second factor (aal2). The check lives in
-- is_admin()/has_permission(), so every RLS policy and admin function
-- inherits it — not just the UI.
create or replace function public.admin_mfa_ok()
returns boolean language sql stable security definer set search_path = public, auth, pg_temp as $$
  select not exists (select 1 from auth.mfa_factors f where f.user_id = (select auth.uid()) and f.status = 'verified')
      or coalesce((select auth.jwt()) ->> 'aal', 'aal1') = 'aal2';
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.admin_user_roles where user_id = (select auth.uid())) and public.admin_mfa_ok();
$$;

create or replace function public.has_permission(p_permission text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.admin_mfa_ok() and exists (
    select 1
    from public.admin_user_roles ur
    join public.admin_roles r on r.id = ur.role_id
    left join public.admin_role_permissions rp on rp.role_id = r.id
    where ur.user_id = (select auth.uid())
      and (r.code = 'owner' or rp.permission_code = p_permission)
  );
$$;

create or replace function public.my_permissions()
returns text[] language sql stable security definer set search_path = public, pg_temp as $$
  select case
    when not public.admin_mfa_ok() then '{}'::text[]
    when exists (
      select 1 from public.admin_user_roles ur join public.admin_roles r on r.id = ur.role_id
      where ur.user_id = (select auth.uid()) and r.code = 'owner'
    ) then (select coalesce(array_agg(code), '{}') from public.admin_permissions)
    else (
      select coalesce(array_agg(distinct rp.permission_code), '{}')
      from public.admin_user_roles ur
      join public.admin_role_permissions rp on rp.role_id = ur.role_id
      where ur.user_id = (select auth.uid())
    )
  end;
$$;

-- Whether the signed-in user is an admin at all (ignores the second
-- factor) — used only to route a half-signed-in admin to the code screen.
create or replace function public.is_admin_member()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.admin_user_roles where user_id = (select auth.uid()));
$$;

-- Admins without 2FA, for the owner's security overview.
create or replace function public.admin_mfa_status()
returns jsonb language plpgsql stable security definer set search_path = public, auth, pg_temp as $$
begin
  if not public.has_permission('users.manage') then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  return coalesce((select jsonb_object_agg(ur.user_id, exists (select 1 from auth.mfa_factors f where f.user_id = ur.user_id and f.status = 'verified'))
                     from (select distinct user_id from public.admin_user_roles) ur), '{}'::jsonb);
end $$;

revoke execute on function public.admin_mfa_ok(), public.is_admin_member(), public.admin_mfa_status() from public, anon;
grant execute on function public.admin_mfa_ok(), public.is_admin_member(), public.admin_mfa_status() to authenticated, service_role;

insert into supabase_migrations.schema_migrations (version, name) values ('20261118000015', 'admin_mfa') on conflict (version) do nothing;

-- =====================================================================
-- 0016 · B2B: business accounts with an agreed discount, project leads
-- =====================================================================
alter table public.business_accounts
  add column if not exists notes text,
  add column if not exists phone text;
create trigger business_accounts_updated before update on public.business_accounts for each row execute function public.set_updated_at();
create trigger audit_business_accounts after insert or update or delete on public.business_accounts for each row execute function public.audit_row();

create or replace function public.trg_notify_business()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.notifications (kind, title, body, link, permission_code)
  values ('business', 'בקשה לחשבון עסקי', new.company_name, '/admin/business-accounts/' || new.id, 'customers.manage');
  return null;
end $$;
create trigger business_accounts_notify after insert on public.business_accounts for each row execute function public.trg_notify_business();
revoke execute on function public.trg_notify_business() from public, anon, authenticated;

-- Pricing: same as before, plus the business discount (applied to the goods,
-- after automatic promotions and before a coupon).
create or replace function public.cart_summary(p_cart_id uuid, p_shipping_method_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_cart public.carts;
  v_items jsonb;
  v_subtotal numeric(12,2);
  v_count int;
  v_promo_discount numeric(12,2) := 0;
  v_promo_name text;
  v_business_pct numeric := 0;
  v_business_discount numeric(12,2) := 0;
  v_coupon_discount numeric(12,2) := 0;
  v_shipping numeric(12,2) := 0;
  v_free_shipping boolean := false;
  v_coupon public.coupons;
  v_coupon_info jsonb := null;
  v_method public.shipping_methods;
  v_vat_rate numeric := coalesce((public.store_setting('commerce') ->> 'vat_rate')::numeric, 18);
  v_total numeric(12,2);
  r record;
begin
  select * into v_cart from public.carts where id = p_cart_id;
  if not found then return null; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'item_id', ci.id, 'variant_id', ci.variant_id, 'product_id', p.id, 'name', p.name, 'slug', p.slug,
           'variant_name', v.name, 'options', v.options, 'sku', v.sku,
           'image_url', coalesce(vi.url, pimg.url), 'quantity', ci.quantity,
           'unit_price', cv.price, 'regular_price', cv.regular_price,
           'line_total', coalesce(cv.price * ci.quantity, 0),
           'available', coalesce(cv.available, 0), 'allow_backorder', coalesce(cv.allow_backorder, false),
           'purchasable', cv.id is not null and (cv.allow_backorder or i.on_hand - i.reserved >= ci.quantity)
         ) order by ci.created_at), '[]'::jsonb),
         coalesce(sum(cv.price * ci.quantity), 0),
         coalesce(sum(ci.quantity), 0)
    into v_items, v_subtotal, v_count
    from public.cart_items ci
    join public.product_variants v on v.id = ci.variant_id
    join public.products p on p.id = v.product_id
    join public.inventory i on i.variant_id = v.id
    left join public.catalog_variants cv on cv.id = ci.variant_id
    left join public.product_images vi on vi.id = v.image_id
    left join lateral (
      select url from public.product_images pi where pi.product_id = p.id
       order by pi.is_primary desc, pi.sort_order limit 1) pimg on true
   where ci.cart_id = p_cart_id;

  -- Automatic promotions: the single best money discount applies; any
  -- qualifying free-shipping promotion also applies.
  for r in
    select pr.id, pr.name, pr.kind, pr.value,
           coalesce((
             select sum(cv.price * ci.quantity)
               from public.cart_items ci
               join public.catalog_variants cv on cv.id = ci.variant_id
              where ci.cart_id = p_cart_id
                and (pr.product_id is null or cv.product_id = pr.product_id)
                and (pr.category_id is null or exists (
                      select 1 from public.product_categories pc
                       where pc.product_id = cv.product_id
                         and pc.category_id in (select public.category_tree(pr.category_id))))
           ), 0) as eligible
      from public.promotions pr
     where pr.is_active
       and (pr.starts_at is null or pr.starts_at <= now())
       and (pr.ends_at is null or pr.ends_at > now())
       and v_subtotal >= pr.min_subtotal
  loop
    continue when r.eligible <= 0;
    if r.kind = 'free_shipping' then
      v_free_shipping := true;
      v_promo_name := coalesce(v_promo_name, r.name);
    else
      declare d numeric(12,2) := case when r.kind = 'percent' then round(r.eligible * r.value / 100, 2)
                                      else least(r.value, r.eligible) end;
      begin
        if d > v_promo_discount then
          v_promo_discount := d;
          v_promo_name := r.name;
        end if;
      end;
    end if;
  end loop;

  -- Approved business customers get their agreed discount on the goods.
  if v_cart.user_id is not null then
    select coalesce(max(discount_percent), 0) into v_business_pct
      from public.business_accounts where user_id = v_cart.user_id and status = 'approved';
    v_business_discount := round((v_subtotal - v_promo_discount) * v_business_pct / 100, 2);
  end if;

  if v_cart.coupon_code is not null then
    select * into v_coupon from public.coupons where code = upper(v_cart.coupon_code);
    if not found or not v_coupon.is_active then
      v_coupon_info := jsonb_build_object('code', v_cart.coupon_code, 'valid', false, 'message', 'קוד הקופון אינו קיים');
    elsif v_coupon.starts_at is not null and v_coupon.starts_at > now() then
      v_coupon_info := jsonb_build_object('code', v_coupon.code, 'valid', false, 'message', 'הקופון עדיין לא בתוקף');
    elsif v_coupon.ends_at is not null and v_coupon.ends_at <= now() then
      v_coupon_info := jsonb_build_object('code', v_coupon.code, 'valid', false, 'message', 'תוקף הקופון פג');
    elsif v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit then
      v_coupon_info := jsonb_build_object('code', v_coupon.code, 'valid', false, 'message', 'הקופון מומש במלואו');
    elsif v_subtotal < v_coupon.min_order then
      v_coupon_info := jsonb_build_object('code', v_coupon.code, 'valid', false,
        'message', format('הקופון תקף בקנייה מעל %s ₪', trim(to_char(v_coupon.min_order, 'FM999999990.##'), '.')));
    else
      if v_coupon.kind = 'free_shipping' then
        v_free_shipping := true;
      else
        -- A non-stackable coupon competes with the promotion: the larger wins.
        if not v_coupon.is_stackable and v_promo_discount > 0 then
          v_coupon_discount := case when v_coupon.kind = 'percent' then round(v_subtotal * v_coupon.value / 100, 2)
                                    else least(v_coupon.value, v_subtotal) end;
          if v_coupon_discount > v_promo_discount then
            v_promo_discount := 0;
            v_promo_name := null;
          else
            v_coupon_discount := 0;
            v_coupon_info := jsonb_build_object('code', v_coupon.code, 'valid', false,
              'message', format('הקופון אינו משתלב עם המבצע ״%s״, שמשתלם יותר', v_promo_name));
          end if;
        else
          v_coupon_discount := case when v_coupon.kind = 'percent' then round((v_subtotal - v_promo_discount - v_business_discount) * v_coupon.value / 100, 2)
                                    else least(v_coupon.value, v_subtotal - v_promo_discount - v_business_discount) end;
        end if;
      end if;
      if v_coupon_info is null then
        v_coupon_info := jsonb_build_object('code', v_coupon.code, 'valid', true, 'kind', v_coupon.kind,
                                            'id', v_coupon.id, 'description', v_coupon.description);
      end if;
    end if;
  end if;

  if p_shipping_method_id is not null then
    select * into v_method from public.shipping_methods where id = p_shipping_method_id and is_active;
    if found then
      v_shipping := case
        when v_free_shipping then 0
        when v_method.free_above is not null and v_subtotal - v_promo_discount - v_business_discount - v_coupon_discount >= v_method.free_above then 0
        else v_method.price end;
    end if;
  end if;

  v_total := v_subtotal - v_promo_discount - v_business_discount - v_coupon_discount + v_shipping;
  return jsonb_build_object(
    'cart_id', v_cart.id,
    'items', v_items,
    'item_count', v_count,
    'subtotal', v_subtotal,
    'discount', v_promo_discount + v_business_discount + v_coupon_discount,
    'business_discount', v_business_discount,
    'business_percent', v_business_pct,
    'promotion', case when v_promo_name is null then null
                      else jsonb_build_object('name', v_promo_name, 'discount', v_promo_discount) end,
    'coupon_discount', v_coupon_discount,
    'coupon', v_coupon_info,
    'shipping', v_shipping,
    'shipping_method', case when v_method.id is null then null else
       jsonb_build_object('id', v_method.id, 'name', v_method.name, 'kind', v_method.kind,
                          'requires_address', v_method.requires_address) end,
    'total', v_total,
    'vat_rate', v_vat_rate,
    'vat_amount', round(v_total - v_total / (1 + v_vat_rate / 100), 2));
end $$;

grant execute on all functions in schema public to service_role;

insert into supabase_migrations.schema_migrations (version, name) values ('20261118000016', 'business') on conflict (version) do nothing;

commit;
