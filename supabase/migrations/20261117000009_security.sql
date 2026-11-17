-- =====================================================================
-- 0009 · Row Level Security, grants, storage
-- =====================================================================
-- Model:
--   anon / authenticated  → read the public catalog and published content.
--   authenticated         → additionally their own profile, addresses,
--                           wishlists and orders.
--   admins                → gated per permission by has_permission().
--   service_role (server) → carts, checkout, payments. Bypasses RLS; its
--                           key exists only in server environment variables.

-- RLS on every table in the schema; a table without a policy is closed.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- Helper to declare "<permission> may do everything on <table>".
create or replace function public._admin_policy(p_table text, p_permission text)
returns void language plpgsql as $$
begin
  execute format(
    'create policy %I on public.%I for all to authenticated using ((select public.has_permission(%L))) with check ((select public.has_permission(%L)))',
    p_table || '_admin_' || replace(p_permission, '.', '_'), p_table, p_permission, p_permission);
end $$;

-- ---------- RBAC ------------------------------------------------------
create policy admin_roles_read on public.admin_roles for select to authenticated using ((select public.is_admin()));
create policy admin_permissions_read on public.admin_permissions for select to authenticated using ((select public.is_admin()));
create policy admin_role_permissions_read on public.admin_role_permissions for select to authenticated using ((select public.is_admin()));
create policy admin_user_roles_read on public.admin_user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_permission('users.manage')));
select public._admin_policy('admin_user_roles', 'users.manage');
select public._admin_policy('admin_role_permissions', 'users.manage');
create policy audit_logs_read on public.audit_logs for select to authenticated using ((select public.has_permission('settings.manage')));
create policy notifications_read on public.notifications for select to authenticated
  using ((select public.is_admin()) and (permission_code is null or (select public.has_permission(permission_code))));
create policy notifications_mark on public.notifications for update to authenticated
  using ((select public.is_admin()) and (permission_code is null or (select public.has_permission(permission_code))));

-- ---------- Catalog: public read of active rows -----------------------
create policy brands_public on public.brands for select using (is_active);
create policy categories_public on public.categories for select using (is_active);
create policy products_public on public.products for select using (status = 'active');
create policy product_images_public on public.product_images for select
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'active'));
create policy product_variants_public on public.product_variants for select
  using (is_active and exists (select 1 from public.products p where p.id = product_id and p.status = 'active'));
create policy product_attributes_public on public.product_attributes for select using (true);
create policy product_attribute_values_public on public.product_attribute_values for select using (true);
create policy product_attribute_assignments_public on public.product_attribute_assignments for select using (true);
create policy product_categories_public on public.product_categories for select using (true);
create policy collections_public on public.collections for select using (is_active);
create policy collection_products_public on public.collection_products for select using (true);
create policy product_relations_public on public.product_relations for select using (true);

select public._admin_policy(t, 'catalog.manage') from unnest(array[
  'brands', 'categories', 'products', 'product_private', 'product_images', 'product_variants',
  'product_attributes', 'product_attribute_values', 'product_attribute_assignments',
  'product_categories', 'collections', 'collection_products', 'product_relations']) t;

-- ---------- Inventory: admin only (the public sees catalog_variants) ---
create policy inventory_read on public.inventory for select to authenticated
  using ((select public.has_permission('inventory.manage')) or (select public.has_permission('catalog.manage')));
create policy inventory_write on public.inventory for update to authenticated
  using ((select public.has_permission('inventory.manage'))) with check ((select public.has_permission('inventory.manage')));
create policy inventory_movements_read on public.inventory_movements for select to authenticated using ((select public.has_permission('inventory.manage')));
create policy inventory_reservations_read on public.inventory_reservations for select to authenticated using ((select public.has_permission('inventory.manage')));
create policy stock_alerts_read on public.stock_alerts for select to authenticated
  using ((select public.has_permission('inventory.manage')) or (select public.has_permission('catalog.manage')));

-- ---------- Customers -------------------------------------------------
create policy profiles_own_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.has_permission('customers.view')));
create policy profiles_own_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
select public._admin_policy('profiles', 'customers.manage');

create policy customer_addresses_own on public.customer_addresses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy customer_addresses_admin on public.customer_addresses for select to authenticated using ((select public.has_permission('customers.view')));
create policy wishlists_own on public.wishlists for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy wishlist_items_own on public.wishlist_items for all to authenticated
  using (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = (select auth.uid())))
  with check (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = (select auth.uid())));
create policy customer_notes_read on public.customer_notes for select to authenticated using ((select public.has_permission('customers.view')));
select public._admin_policy('customer_notes', 'customers.manage');
create policy business_accounts_own on public.business_accounts for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_permission('customers.view')));
select public._admin_policy('business_accounts', 'customers.manage');
select public._admin_policy('leads', 'marketing.manage');
select public._admin_policy('newsletter_subscribers', 'marketing.manage');
create policy business_quotes_own on public.business_quotes for select to authenticated using (user_id = (select auth.uid()));
select public._admin_policy('business_quotes', 'orders.manage');
create policy business_quote_items_own on public.business_quote_items for select to authenticated
  using (exists (select 1 from public.business_quotes q where q.id = quote_id and q.user_id = (select auth.uid())));
select public._admin_policy('business_quote_items', 'orders.manage');

-- ---------- Commerce --------------------------------------------------
-- carts, cart_items, payment_events: no policies → server (service role) only.
create policy shipping_methods_public on public.shipping_methods for select using (is_active);
select public._admin_policy('shipping_methods', 'shipping.manage');
select public._admin_policy('shipping_zones', 'shipping.manage');
select public._admin_policy('coupons', 'marketing.manage');
select public._admin_policy('promotions', 'marketing.manage');
select public._admin_policy('promotion_rules', 'marketing.manage');
create policy coupon_redemptions_read on public.coupon_redemptions for select to authenticated using ((select public.has_permission('marketing.manage')));

-- Orders are written only through SECURITY DEFINER functions.
create policy orders_read on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_permission('orders.view')));
create policy order_items_read on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id
                  and (o.user_id = (select auth.uid()) or (select public.has_permission('orders.view')))));
create policy order_addresses_read on public.order_addresses for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id
                  and (o.user_id = (select auth.uid()) or (select public.has_permission('orders.view')))));
create policy order_events_read on public.order_events for select to authenticated using ((select public.has_permission('orders.view')));
create policy order_events_note on public.order_events for insert to authenticated
  with check ((select public.has_permission('orders.manage')) and type = 'note' and actor_id = (select auth.uid()));
create policy payments_read on public.payments for select to authenticated
  using ((select public.has_permission('orders.view')) or (select public.has_permission('finance.view')));
create policy refunds_read on public.refunds for select to authenticated
  using ((select public.has_permission('orders.view')) or (select public.has_permission('finance.view')));
create policy shipments_read on public.shipments for select to authenticated
  using ((select public.has_permission('orders.view'))
         or exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
select public._admin_policy('shipments', 'shipping.manage');
create policy shipment_events_read on public.shipment_events for select to authenticated using ((select public.has_permission('orders.view')));

-- ---------- Content & system -----------------------------------------
create policy store_settings_public on public.store_settings for select using (is_public);
select public._admin_policy('store_settings', 'settings.manage');
create policy pages_public on public.pages for select using (status = 'published');
create policy page_sections_public on public.page_sections for select
  using (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())
         and exists (select 1 from public.pages p where p.id = page_id and p.status = 'published'));
create policy banners_public on public.banners for select
  using (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
create policy blog_categories_public on public.blog_categories for select using (true);
create policy blog_posts_public on public.blog_posts for select using (status = 'published' and published_at <= now());
create policy reviews_public on public.reviews for select using (status = 'approved');
create policy faqs_public on public.faqs for select using (is_active);
create policy navigation_menus_public on public.navigation_menus for select using (true);
create policy navigation_items_public on public.navigation_items for select using (is_active);
create policy redirects_public on public.redirects for select using (true);

select public._admin_policy(t, 'content.manage') from unnest(array[
  'pages', 'page_sections', 'banners', 'blog_categories', 'blog_posts', 'reviews', 'faqs',
  'navigation_menus', 'navigation_items', 'redirects']) t;
select public._admin_policy(t, 'settings.manage') from unnest(array[
  'automation_rules', 'automation_jobs', 'integration_events', 'webhook_deliveries']) t;

drop function public._admin_policy(text, text);

-- ---------- Function privileges --------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
grant execute on function
  public.is_admin(), public.has_permission(text), public.my_permissions(),
  public.category_tree(uuid),
  public.catalog_search(uuid, uuid, text, uuid[], numeric, numeric, boolean, boolean, text, int, int),
  public.catalog_facets(uuid, uuid, text)
  to anon, authenticated;
grant execute on function
  public.admin_set_stock(uuid, int, text),
  public.admin_set_order_status(uuid, public.order_status, text)
  to authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- The catalog views are the only door to inventory figures for the public.
grant select on public.catalog_variants, public.catalog_products to anon, authenticated;

-- ---------- Storage ---------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('private', 'private', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- 'media' is a public bucket: files are served by URL, so no SELECT policy
-- is needed for visitors (and none is granted, which also blocks listing).
create policy media_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'media' and ((select public.has_permission('catalog.manage')) or (select public.has_permission('content.manage'))));
create policy media_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and ((select public.has_permission('catalog.manage')) or (select public.has_permission('content.manage'))));
create policy media_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and ((select public.has_permission('catalog.manage')) or (select public.has_permission('content.manage'))));
create policy media_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and ((select public.has_permission('catalog.manage')) or (select public.has_permission('content.manage'))));
