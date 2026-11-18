-- =====================================================================
-- 0011 · Back office: promotions in pricing, reports, customers,
-- refunds, quotes, abandoned carts, admin users, content defaults
-- =====================================================================

-- ---------- Promotions: automatic discounts --------------------------
-- A promotion applies by itself (no code). Scope: one category subtree,
-- one product, or the whole order; optional minimum order.
alter table public.promotions drop constraint if exists promotions_kind_check;
alter table public.promotions
  add constraint promotions_kind_check check (kind in ('percent', 'fixed', 'free_shipping')),
  add column if not exists description text,
  add column if not exists category_id uuid references public.categories(id) on delete set null,
  add column if not exists product_id uuid references public.products(id) on delete set null,
  add column if not exists min_subtotal numeric(12,2) not null default 0 check (min_subtotal >= 0),
  add column if not exists updated_at timestamptz not null default now(),
  add constraint promotions_value_check check (value >= 0 and (kind <> 'percent' or value <= 100));
create trigger promotions_updated before update on public.promotions for each row execute function public.set_updated_at();

alter table public.orders add column if not exists promotion_name text;

create or replace function public.cart_summary(p_cart_id uuid, p_shipping_method_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_cart public.carts;
  v_items jsonb;
  v_subtotal numeric(12,2);
  v_count int;
  v_promo_discount numeric(12,2) := 0;
  v_promo_name text;
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
          v_coupon_discount := case when v_coupon.kind = 'percent' then round((v_subtotal - v_promo_discount) * v_coupon.value / 100, 2)
                                    else least(v_coupon.value, v_subtotal - v_promo_discount) end;
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
        when v_method.free_above is not null and v_subtotal - v_promo_discount - v_coupon_discount >= v_method.free_above then 0
        else v_method.price end;
    end if;
  end if;

  v_total := v_subtotal - v_promo_discount - v_coupon_discount + v_shipping;
  return jsonb_build_object(
    'cart_id', v_cart.id,
    'items', v_items,
    'item_count', v_count,
    'subtotal', v_subtotal,
    'discount', v_promo_discount + v_coupon_discount,
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

-- Record which promotion an order got.
create or replace function public.trg_order_promotion()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_summary jsonb;
begin
  if new.cart_id is not null and new.promotion_name is null then
    v_summary := public.cart_summary(new.cart_id, new.shipping_method_id);
    new.promotion_name := v_summary -> 'promotion' ->> 'name';
  end if;
  return new;
end $$;
create trigger orders_promotion before insert on public.orders for each row execute function public.trg_order_promotion();

-- ---------- Owner safeguards -----------------------------------------
create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.admin_user_roles ur join public.admin_roles r on r.id = ur.role_id
                  where ur.user_id = (select auth.uid()) and r.code = 'owner');
$$;

create or replace function public.trg_admin_roles_guard()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_owner uuid := (select id from public.admin_roles where code = 'owner');
begin
  -- Only an owner may grant or revoke the owner role (the server's service
  -- role, used by the bootstrap script, has no auth.uid()).
  if coalesce(new.role_id, old.role_id) = v_owner and (select auth.uid()) is not null and not public.is_owner() then
    raise exception 'OWNER_ONLY' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' and old.role_id = v_owner
     and not exists (select 1 from public.admin_user_roles where role_id = v_owner and user_id <> old.user_id) then
    raise exception 'LAST_OWNER';
  end if;
  return coalesce(new, old);
end $$;
create trigger admin_user_roles_guard before insert or update or delete on public.admin_user_roles
  for each row execute function public.trg_admin_roles_guard();

-- Admin users with their e-mail (auth.users is not exposed through the API).
create or replace function public.admin_list_users()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.has_permission('users.manage') then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'user_id', u.id, 'email', u.email, 'last_sign_in_at', u.last_sign_in_at, 'created_at', u.created_at,
             'roles', (select jsonb_agg(jsonb_build_object('id', r.id, 'code', r.code, 'name', r.name) order by r.name)
                         from public.admin_user_roles ur join public.admin_roles r on r.id = ur.role_id
                        where ur.user_id = u.id))
           order by u.email)
      from auth.users u
     where exists (select 1 from public.admin_user_roles ur where ur.user_id = u.id)), '[]'::jsonb);
end $$;

-- ---------- Customers -------------------------------------------------
-- Guests are customers too: a customer is identified by e-mail.
alter table public.customer_notes alter column user_id drop not null;
alter table public.customer_notes add column if not exists email text;
create index if not exists customer_notes_email_idx on public.customer_notes(lower(email));
alter table public.customer_notes add constraint customer_notes_target check (user_id is not null or email is not null);

create or replace function public.admin_customers(
  p_q text default null, p_segment text default 'all', p_limit int default 50, p_offset int default 0
) returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.has_permission('customers.view') then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  return (
    with paid as (
      select o.* from public.orders o
       where o.payment_status in ('paid', 'refunded', 'partially_refunded')
    ),
    people as (
      select lower(customer_email) as email from public.orders
      union
      select lower(email) from public.profiles where email is not null
    ),
    agg as (
      select pe.email,
             (select max(o.customer_name) from public.orders o where lower(o.customer_email) = pe.email) as name,
             (select max(o.customer_phone) from public.orders o where lower(o.customer_email) = pe.email) as phone,
             bool_or(o.customer_type = 'business') as is_business,
             count(p.id) as orders,
             coalesce(sum(p.total), 0) as total_spent,
             max(p.paid_at) as last_order_at,
             min(p.paid_at) as first_order_at,
             (select pr.id from public.profiles pr where lower(pr.email) = pe.email limit 1) as user_id,
             (select pr.created_at from public.profiles pr where lower(pr.email) = pe.email limit 1) as registered_at,
             exists (select 1 from public.newsletter_subscribers n where lower(n.email) = pe.email and n.unsubscribed_at is null) as subscribed
        from people pe
        left join paid p on lower(p.customer_email) = pe.email
        left join public.orders o on lower(o.customer_email) = pe.email
       group by pe.email
    ),
    filtered as (
      select * from agg a
       where (coalesce(btrim(p_q), '') = '' or a.email ilike '%' || btrim(p_q) || '%' or a.name ilike '%' || btrim(p_q) || '%'
              or a.phone ilike '%' || btrim(p_q) || '%')
         and case coalesce(p_segment, 'all')
               when 'new' then a.first_order_at >= now() - interval '30 days'
               when 'returning' then a.orders >= 2
               when 'business' then coalesce(a.is_business, false)
               when 'high_value' then a.total_spent >= 2000
               when 'dormant' then a.last_order_at < now() - interval '180 days'
               when 'no_orders' then a.orders = 0
               else true end
    )
    select jsonb_build_object(
      'total', (select count(*) from filtered),
      'items', coalesce((select jsonb_agg(to_jsonb(f) order by f.last_order_at desc nulls last, f.email)
                           from (select * from filtered order by last_order_at desc nulls last, email
                                 limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0)) f), '[]'::jsonb))
  );
end $$;

-- ---------- Refunds and returns --------------------------------------
-- Records a refund that was carried out at the clearing provider, and
-- optionally returns the goods to stock. Money is never moved from here.
create or replace function public.admin_record_refund(
  p_order_id uuid, p_amount numeric, p_reason text, p_restock boolean default false
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_order public.orders;
  v_refunded numeric;
  v_full boolean;
  r record;
begin
  if not public.has_permission('orders.manage') then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.payment_status not in ('paid', 'partially_refunded') then raise exception 'ORDER_NOT_PAID'; end if;
  select coalesce(sum(amount), 0) into v_refunded from public.refunds where order_id = p_order_id and status = 'succeeded';
  if p_amount is null or p_amount <= 0 or p_amount > v_order.total - v_refunded then raise exception 'AMOUNT_INVALID'; end if;

  insert into public.refunds (order_id, payment_id, amount, reason, status, created_by)
  values (p_order_id, (select id from public.payments where order_id = p_order_id and status = 'succeeded' limit 1),
          p_amount, nullif(btrim(p_reason), ''), 'succeeded', (select auth.uid()));

  v_full := v_refunded + p_amount >= v_order.total;
  update public.orders
     set payment_status = case when v_full then 'refunded' else 'partially_refunded' end::public.payment_status,
         status = case when v_full and p_restock then 'returned'
                       when v_full then 'cancelled'
                       else status end::public.order_status,
         cancel_reason = case when v_full and not p_restock then coalesce(cancel_reason, 'refunded') else cancel_reason end
   where id = p_order_id;

  if p_restock then
    for r in select variant_id, quantity from public.order_items where order_id = p_order_id and variant_id is not null order by variant_id loop
      update public.inventory set on_hand = on_hand + r.quantity where variant_id = r.variant_id;
      insert into public.inventory_movements (variant_id, delta, reason, order_id, note, created_by)
      values (r.variant_id, r.quantity, 'return', p_order_id, 'החזרת מוצר', (select auth.uid()));
    end loop;
  end if;

  insert into public.order_events (order_id, type, data, actor_id, is_internal)
  values (p_order_id, 'refunded', jsonb_build_object('amount', p_amount, 'reason', p_reason, 'restock', p_restock, 'full', v_full),
          (select auth.uid()), false);
  return jsonb_build_object('full', v_full, 'refunded_total', v_refunded + p_amount);
end $$;

-- ---------- Abandoned carts ------------------------------------------
create or replace function public.admin_abandoned_carts(p_hours int default 1)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.has_permission('marketing.manage') then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(x) order by x.updated_at desc)
      from (
        select c.id, c.email, c.updated_at, c.coupon_code,
               (select count(*) from public.cart_items ci where ci.cart_id = c.id) as lines,
               (select coalesce(sum(ci.quantity), 0) from public.cart_items ci where ci.cart_id = c.id) as units,
               (select coalesce(sum(cv.price * ci.quantity), 0) from public.cart_items ci
                  join public.catalog_variants cv on cv.id = ci.variant_id where ci.cart_id = c.id) as value,
               (select string_agg(p.name, ', ') from public.cart_items ci join public.product_variants v on v.id = ci.variant_id
                  join public.products p on p.id = v.product_id where ci.cart_id = c.id) as products,
               (select o.status from public.orders o where o.cart_id = c.id order by o.placed_at desc limit 1) as last_order_status,
               (select o.customer_name from public.orders o where o.cart_id = c.id order by o.placed_at desc limit 1) as customer_name
          from public.carts c
         where c.status = 'active'
           and c.updated_at < now() - make_interval(hours => greatest(p_hours, 0))
           and exists (select 1 from public.cart_items ci where ci.cart_id = c.id)
         order by c.updated_at desc
         limit 300) x), '[]'::jsonb);
end $$;

-- ---------- Reports ---------------------------------------------------
-- Definitions used everywhere:
--   sale     = an order whose payment was confirmed (paid, or later refunded)
--   gross    = sum of order totals of sales (incl. VAT and shipping), by payment date (Israel time)
--   refunds  = refunds recorded in the period
--   net      = gross − refunds
create or replace function public.report_sales(p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_from timestamptz; v_to timestamptz;
begin
  if not (public.has_permission('reports.view') or public.has_permission('finance.view')) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  v_from := (p_from::timestamp at time zone 'Asia/Jerusalem');
  v_to := ((p_to + 1)::timestamp at time zone 'Asia/Jerusalem');
  return (
    with sales as (
      select o.*, (o.paid_at at time zone 'Asia/Jerusalem')::date as day
        from public.orders o
       where o.payment_status in ('paid', 'refunded', 'partially_refunded')
         and o.paid_at >= v_from and o.paid_at < v_to
    ),
    refunds as (
      select rf.amount, (rf.created_at at time zone 'Asia/Jerusalem')::date as day
        from public.refunds rf where rf.status = 'succeeded' and rf.created_at >= v_from and rf.created_at < v_to
    ),
    items as (
      select oi.*, s.day from public.order_items oi join sales s on s.id = oi.order_id
    ),
    first_order as (
      select lower(customer_email) as email, min(paid_at) as first_paid
        from public.orders where payment_status in ('paid', 'refunded', 'partially_refunded') group by 1
    ),
    days as (select generate_series(p_from, p_to, interval '1 day')::date as day)
    select jsonb_build_object(
      'from', p_from, 'to', p_to,
      'gross', (select coalesce(sum(total), 0) from sales),
      'refunds', (select coalesce(sum(amount), 0) from refunds),
      'net', (select coalesce(sum(total), 0) from sales) - (select coalesce(sum(amount), 0) from refunds),
      'orders', (select count(*) from sales),
      'aov', (select coalesce(round(avg(total), 2), 0) from sales),
      'units', (select coalesce(sum(quantity), 0) from items),
      'discounts', (select coalesce(sum(discount_total), 0) from sales),
      'shipping', (select coalesce(sum(shipping_total), 0) from sales),
      'vat', (select coalesce(sum(vat_amount), 0) from sales),
      'new_customers', (select count(distinct lower(s.customer_email)) from sales s join first_order f on f.email = lower(s.customer_email)
                          where f.first_paid >= v_from),
      'returning_customers', (select count(distinct lower(s.customer_email)) from sales s join first_order f on f.email = lower(s.customer_email)
                                where f.first_paid < v_from),
      'cancelled', (select count(*) from public.orders o where o.status = 'cancelled' and o.placed_at >= v_from and o.placed_at < v_to
                      and coalesce(o.cancel_reason, '') <> 'superseded'),
      'by_day', (select jsonb_agg(jsonb_build_object('day', d.day,
                    'revenue', (select coalesce(sum(total), 0) from sales s where s.day = d.day),
                    'orders', (select count(*) from sales s where s.day = d.day)) order by d.day) from days d),
      'by_category', coalesce((
         select jsonb_agg(x order by x.revenue desc) from (
           select coalesce(c.name, 'ללא קטגוריה') as name, sum(i.line_total) as revenue, sum(i.quantity) as units
             from items i
             left join public.product_categories pc on pc.product_id = i.product_id and pc.is_primary
             left join public.categories c on c.id = pc.category_id
            group by 1) x), '[]'::jsonb),
      'top_products', coalesce((
         select jsonb_agg(x order by x.revenue desc) from (
           select i.product_id, max(i.product_name) as name, sum(i.quantity) as units, sum(i.line_total) as revenue
             from items i group by i.product_id order by sum(i.line_total) desc limit 10) x), '[]'::jsonb),
      'top_customers', coalesce((
         select jsonb_agg(x order by x.total desc) from (
           select lower(customer_email) as email, max(customer_name) as name, count(*) as orders, sum(total) as total
             from sales group by 1 order by sum(total) desc limit 10) x), '[]'::jsonb),
      'coupons', coalesce((
         select jsonb_agg(x order by x.orders desc) from (
           select coupon_code as code, count(*) as orders, sum(total) as revenue
             from sales where coupon_code is not null group by 1) x), '[]'::jsonb),
      'promotions', coalesce((
         select jsonb_agg(x order by x.orders desc) from (
           select promotion_name as name, count(*) as orders, sum(total) as revenue
             from sales where promotion_name is not null group by 1) x), '[]'::jsonb)
    ));
end $$;

create or replace function public.report_products(p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_from timestamptz; v_to timestamptz;
begin
  if not (public.has_permission('reports.view') or public.has_permission('catalog.manage')) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  v_from := (p_from::timestamp at time zone 'Asia/Jerusalem');
  v_to := ((p_to + 1)::timestamp at time zone 'Asia/Jerusalem');
  return (
    with sold as (
      select oi.product_id, sum(oi.quantity) as units, sum(oi.line_total) as revenue
        from public.order_items oi join public.orders o on o.id = oi.order_id
       where o.payment_status in ('paid', 'refunded', 'partially_refunded') and o.paid_at >= v_from and o.paid_at < v_to
       group by oi.product_id
    ),
    returned as (
      select oi.product_id, sum(oi.quantity) as units
        from public.order_items oi join public.orders o on o.id = oi.order_id
       where o.status = 'returned' and o.paid_at >= v_from and o.paid_at < v_to group by oi.product_id
    ),
    stock as (
      select v.product_id, sum(i.on_hand) as on_hand, sum(i.on_hand - i.reserved) as available,
             bool_or(i.on_hand - i.reserved <= i.low_stock_threshold) as any_low
        from public.product_variants v join public.inventory i on i.variant_id = v.id where v.is_active group by v.product_id
    ),
    last_sale as (
      select oi.product_id, max(o.paid_at) as at from public.order_items oi join public.orders o on o.id = oi.order_id
       where o.payment_status in ('paid', 'refunded', 'partially_refunded') group by oi.product_id
    ),
    base as (
      select p.id, p.name, p.sku, p.status, coalesce(s.units, 0) as units, coalesce(s.revenue, 0) as revenue,
             coalesce(rt.units, 0) as returned, st.on_hand, st.available, st.any_low, ls.at as last_sale_at
        from public.products p
        left join sold s on s.product_id = p.id
        left join returned rt on rt.product_id = p.id
        left join stock st on st.product_id = p.id
        left join last_sale ls on ls.product_id = p.id
       where p.status <> 'archived'
    )
    select jsonb_build_object(
      'top', coalesce((select jsonb_agg(b order by b.revenue desc) from (select * from base where units > 0 order by revenue desc limit 15) b), '[]'::jsonb),
      'not_sold', coalesce((select jsonb_agg(b order by b.name) from (select * from base where units = 0 and status = 'active') b), '[]'::jsonb),
      'low_stock', coalesce((select jsonb_agg(b order by b.available) from (select * from base where any_low and status = 'active') b), '[]'::jsonb),
      'no_movement', coalesce((select jsonb_agg(b order by b.last_sale_at nulls first) from (
          select * from base where status = 'active' and coalesce(on_hand, 0) > 0
             and (last_sale_at is null or last_sale_at < now() - interval '90 days')) b), '[]'::jsonb),
      'high_returns', coalesce((select jsonb_agg(b order by b.returned desc) from (
          select *, round(returned::numeric / nullif(units, 0) * 100) as return_rate from base where returned > 0) b), '[]'::jsonb)
    ));
end $$;

-- ---------- Quotes ----------------------------------------------------
create sequence if not exists public.quote_number_seq start 5001;
alter table public.business_quotes
  add column if not exists quote_number bigint unique default nextval('public.quote_number_seq'),
  add column if not exists customer_name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists company_name text;
alter table public.business_quote_items add column if not exists sort_order int not null default 0;
create trigger business_quotes_updated before update on public.business_quotes for each row execute function public.set_updated_at();

create or replace function public.trg_quote_total()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid := coalesce(new.quote_id, old.quote_id);
begin
  update public.business_quotes
     set total = coalesce((select sum(quantity * unit_price) from public.business_quote_items where quote_id = v_id), 0)
   where id = v_id;
  return null;
end $$;
create trigger business_quote_items_total after insert or update or delete on public.business_quote_items
  for each row execute function public.trg_quote_total();

-- ---------- Leads: status changes are tracked -------------------------
create trigger leads_updated before update on public.leads for each row execute function public.set_updated_at();

-- ---------- Content defaults -----------------------------------------
-- The announcement bar is managed as banners from now on.
insert into public.banners (placement, title, sort_order)
select 'announcement', a.value #>> '{}', a.ordinality * 10
  from public.store_settings s, jsonb_array_elements(s.value) with ordinality a
 where s.key = 'announcements' and not exists (select 1 from public.banners where placement = 'announcement');

insert into public.blog_categories (name, slug) values ('השראה', 'inspiration'), ('מדריכים', 'guides')
on conflict (slug) do nothing;

-- Extend the section kinds the home page renders.
alter table public.page_sections drop constraint if exists page_sections_kind_check;
alter table public.page_sections add constraint page_sections_kind_check check (kind in (
  'hero', 'banner', 'categories', 'product_grid', 'collections', 'text_image',
  'gallery', 'testimonials', 'benefits', 'faq', 'lead_form', 'blog', 'rooms', 'newsletter'));

-- ---------- Audit coverage --------------------------------------------
create trigger audit_brands after insert or update or delete on public.brands for each row execute function public.audit_row();
create trigger audit_collections after insert or update or delete on public.collections for each row execute function public.audit_row();
create trigger audit_promotions after insert or update or delete on public.promotions for each row execute function public.audit_row();
create trigger audit_pages after insert or update or delete on public.pages for each row execute function public.audit_row();
create trigger audit_page_sections after insert or update or delete on public.page_sections for each row execute function public.audit_row();
create trigger audit_banners after insert or update or delete on public.banners for each row execute function public.audit_row();
create trigger audit_blog_posts after insert or update or delete on public.blog_posts for each row execute function public.audit_row();
create trigger audit_refunds after insert on public.refunds for each row execute function public.audit_row();
create trigger audit_business_quotes after insert or update or delete on public.business_quotes for each row execute function public.audit_row();
create trigger audit_inventory_adjust after insert on public.inventory_movements for each row
  when (new.reason = 'adjustment') execute function public.audit_row();

-- The audit log is readable by owners and by whoever manages settings or users.
drop policy if exists audit_logs_read on public.audit_logs;
create policy audit_logs_read on public.audit_logs for select to authenticated
  using ((select public.has_permission('settings.manage')) or (select public.has_permission('users.manage')));

-- Customer notes by e-mail (guests)
drop policy if exists customer_notes_read on public.customer_notes;
create policy customer_notes_read on public.customer_notes for select to authenticated using ((select public.has_permission('customers.view')));

-- ---------- Function privileges --------------------------------------
revoke execute on function
  public.is_owner(), public.admin_list_users(), public.admin_customers(text, text, int, int),
  public.admin_record_refund(uuid, numeric, text, boolean), public.admin_abandoned_carts(int),
  public.report_sales(date, date), public.report_products(date, date),
  public.trg_order_promotion(), public.trg_admin_roles_guard(), public.trg_quote_total()
  from public, anon, authenticated;
grant execute on function
  public.is_owner(), public.admin_list_users(), public.admin_customers(text, text, int, int),
  public.admin_record_refund(uuid, numeric, text, boolean), public.admin_abandoned_carts(int),
  public.report_sales(date, date), public.report_products(date, date)
  to authenticated;
grant execute on all functions in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- ---------- Activity log with actor e-mail -----------------------------
create or replace function public.admin_audit_log(
  p_entity text default null, p_actor uuid default null, p_limit int default 50, p_offset int default 0
) returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not (public.has_permission('settings.manage') or public.has_permission('users.manage')) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return (
    with f as (
      select a.* from public.audit_logs a
       where (p_entity is null or a.entity = p_entity) and (p_actor is null or a.actor_id = p_actor)
    )
    select jsonb_build_object(
      'total', (select count(*) from f),
      'entities', (select coalesce(jsonb_agg(distinct entity), '[]'::jsonb) from public.audit_logs),
      'items', coalesce((
        select jsonb_agg(jsonb_build_object('id', x.id, 'created_at', x.created_at, 'action', x.action, 'entity', x.entity,
                                            'entity_id', x.entity_id, 'changes', x.changes, 'actor_id', x.actor_id,
                                            'actor_email', u.email) order by x.id desc)
          from (select * from f order by id desc limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0)) x
          left join auth.users u on u.id = x.actor_id), '[]'::jsonb)));
end $$;
revoke execute on function public.admin_audit_log(text, uuid, int, int) from public, anon;
grant execute on function public.admin_audit_log(text, uuid, int, int) to authenticated, service_role;
