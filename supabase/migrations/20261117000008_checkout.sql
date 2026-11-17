-- =====================================================================
-- 0008 · Cart pricing, order creation, payments, reservations
-- =====================================================================
-- All money logic lives here, in one place, and runs only for the
-- service role. The browser never supplies a price: the cart holds
-- variant ids and quantities, everything else is read from the catalog.

create or replace function public.store_setting(p_key text)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select value from public.store_settings where key = p_key;
$$;

-- Price a cart. Used for display and, inside create_order, for the
-- amounts that are actually charged.
create or replace function public.cart_summary(p_cart_id uuid, p_shipping_method_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_cart public.carts;
  v_items jsonb;
  v_subtotal numeric(12,2);
  v_count int;
  v_discount numeric(12,2) := 0;
  v_shipping numeric(12,2) := 0;
  v_free_shipping boolean := false;
  v_coupon public.coupons;
  v_coupon_info jsonb := null;
  v_method public.shipping_methods;
  v_vat_rate numeric := coalesce((public.store_setting('commerce') ->> 'vat_rate')::numeric, 18);
  v_total numeric(12,2);
begin
  select * into v_cart from public.carts where id = p_cart_id;
  if not found then return null; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'item_id', ci.id,
           'variant_id', ci.variant_id,
           'product_id', p.id,
           'name', p.name,
           'slug', p.slug,
           'variant_name', v.name,
           'options', v.options,
           'sku', v.sku,
           'image_url', coalesce(vi.url, pimg.url),
           'quantity', ci.quantity,
           'unit_price', cv.price,
           'regular_price', cv.regular_price,
           'line_total', coalesce(cv.price * ci.quantity, 0),
           'available', coalesce(cv.available, 0),
           'allow_backorder', coalesce(cv.allow_backorder, false),
           -- purchasable = still on sale and enough stock for the quantity
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
      if v_coupon.kind = 'percent' then
        v_discount := round(v_subtotal * v_coupon.value / 100, 2);
      elsif v_coupon.kind = 'fixed' then
        v_discount := least(v_coupon.value, v_subtotal);
      else
        v_free_shipping := true;
      end if;
      v_coupon_info := jsonb_build_object('code', v_coupon.code, 'valid', true, 'kind', v_coupon.kind,
                                          'id', v_coupon.id, 'description', v_coupon.description);
    end if;
  end if;

  if p_shipping_method_id is not null then
    select * into v_method from public.shipping_methods where id = p_shipping_method_id and is_active;
    if found then
      v_shipping := case
        when v_free_shipping then 0
        when v_method.free_above is not null and v_subtotal - v_discount >= v_method.free_above then 0
        else v_method.price end;
    end if;
  end if;

  v_total := v_subtotal - v_discount + v_shipping;
  return jsonb_build_object(
    'cart_id', v_cart.id,
    'items', v_items,
    'item_count', v_count,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'coupon', v_coupon_info,
    'shipping', v_shipping,
    'shipping_method', case when v_method.id is null then null else
       jsonb_build_object('id', v_method.id, 'name', v_method.name, 'kind', v_method.kind,
                          'requires_address', v_method.requires_address) end,
    'total', v_total,
    'vat_rate', v_vat_rate,
    'vat_amount', round(v_total - v_total / (1 + v_vat_rate / 100), 2));
end $$;

-- Give back everything a pending order was holding: reserved stock and
-- its coupon redemption. Safe to call more than once.
create or replace function public._release_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare r record;
begin
  for r in
    select id, variant_id, quantity from public.inventory_reservations
     where order_id = p_order_id and status = 'active'
     order by variant_id
       for update
  loop
    update public.inventory set reserved = greatest(reserved - r.quantity, 0) where variant_id = r.variant_id;
    update public.inventory_reservations set status = 'released' where id = r.id;
  end loop;

  with gone as (
    delete from public.coupon_redemptions where order_id = p_order_id returning coupon_id
  )
  update public.coupons c set used_count = greatest(c.used_count - 1, 0)
    from gone where c.id = gone.coupon_id;
end $$;

create or replace function public._cancel_pending_order(p_order_id uuid, p_reason text, p_payment_status public.payment_status)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.status <> 'pending_payment' then return false; end if;
  perform public._release_order(p_order_id);
  update public.orders
     set status = 'cancelled', payment_status = p_payment_status, cancel_reason = p_reason
   where id = p_order_id;
  insert into public.order_events (order_id, type, data) values (p_order_id, 'cancelled', jsonb_build_object('reason', p_reason));
  return true;
end $$;

-- Turn a cart into an order awaiting payment.
-- Atomic: either the order exists with all of its stock reserved, or
-- nothing changed. Errors are raised as 'CODE' or 'CODE:detail'.
create or replace function public.create_order(
  p_cart_id uuid,
  p_customer jsonb,
  p_address jsonb,
  p_shipping_method_id uuid,
  p_note text default null,
  p_user_id uuid default null
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_cart public.carts;
  v_method public.shipping_methods;
  v_summary jsonb;
  v_item jsonb;
  v_order public.orders;
  v_old uuid;
  v_coupon_id uuid;
  v_coupon public.coupons;
  v_email text := lower(btrim(p_customer ->> 'email'));
  v_minutes int := coalesce((public.store_setting('commerce') ->> 'reservation_minutes')::int, 30);
  v_expires timestamptz;
begin
  select * into v_cart from public.carts where id = p_cart_id for update;
  if not found or v_cart.status <> 'active' then raise exception 'CART_NOT_FOUND'; end if;

  -- A new attempt replaces any earlier unpaid order of the same cart, so
  -- one cart can never hold two reservations.
  for v_old in select id from public.orders where cart_id = p_cart_id and status = 'pending_payment' loop
    perform public._cancel_pending_order(v_old, 'superseded', 'unpaid');
  end loop;

  select * into v_method from public.shipping_methods where id = p_shipping_method_id and is_active;
  if not found then raise exception 'SHIPPING_METHOD_INVALID'; end if;
  if v_method.requires_address and (p_address is null or coalesce(p_address ->> 'city', '') = '') then
    raise exception 'ADDRESS_REQUIRED';
  end if;

  v_summary := public.cart_summary(p_cart_id, p_shipping_method_id);
  if jsonb_array_length(v_summary -> 'items') = 0 then raise exception 'CART_EMPTY'; end if;
  if v_summary -> 'coupon' is not null and jsonb_typeof(v_summary -> 'coupon') = 'object'
     and not (v_summary -> 'coupon' ->> 'valid')::boolean then
    raise exception 'COUPON_INVALID:%', v_summary -> 'coupon' ->> 'message';
  end if;

  v_expires := now() + make_interval(mins => v_minutes);

  insert into public.orders (
    user_id, cart_id, customer_name, customer_email, customer_phone, customer_type, company_name, company_number,
    shipping_method_id, shipping_method_name, subtotal, discount_total, shipping_total, total,
    vat_rate, vat_amount, coupon_code, customer_note, reservation_expires_at)
  values (
    p_user_id, p_cart_id, btrim(p_customer ->> 'name'), v_email, btrim(p_customer ->> 'phone'),
    coalesce((p_customer ->> 'type')::public.customer_type, 'private'),
    nullif(btrim(p_customer ->> 'company_name'), ''), nullif(btrim(p_customer ->> 'company_number'), ''),
    v_method.id, v_method.name,
    (v_summary ->> 'subtotal')::numeric, (v_summary ->> 'discount')::numeric,
    (v_summary ->> 'shipping')::numeric, (v_summary ->> 'total')::numeric,
    (v_summary ->> 'vat_rate')::numeric, (v_summary ->> 'vat_amount')::numeric,
    case when (v_summary -> 'coupon' ->> 'valid')::boolean then v_summary -> 'coupon' ->> 'code' end,
    nullif(btrim(p_note), ''), v_expires)
  returning * into v_order;

  -- Reserve stock. Variants are processed in a fixed order so concurrent
  -- checkouts cannot deadlock; the conditional UPDATE is the atomic guard
  -- against overselling.
  for v_item in
    select value from jsonb_array_elements(v_summary -> 'items') order by value ->> 'variant_id'
  loop
    if (v_item ->> 'unit_price') is null then
      raise exception 'ITEM_UNAVAILABLE:%', v_item ->> 'name';
    end if;
    update public.inventory
       set reserved = reserved + (v_item ->> 'quantity')::int
     where variant_id = (v_item ->> 'variant_id')::uuid
       and (allow_backorder or on_hand - reserved >= (v_item ->> 'quantity')::int);
    if not found then
      raise exception 'OUT_OF_STOCK:%', v_item ->> 'name';
    end if;

    insert into public.inventory_reservations (order_id, variant_id, quantity, expires_at)
    values (v_order.id, (v_item ->> 'variant_id')::uuid, (v_item ->> 'quantity')::int, v_expires);

    insert into public.order_items (order_id, product_id, variant_id, product_name, variant_name, sku, options,
                                    image_url, unit_price, quantity, line_total)
    values (v_order.id, (v_item ->> 'product_id')::uuid, (v_item ->> 'variant_id')::uuid, v_item ->> 'name',
            v_item ->> 'variant_name', v_item ->> 'sku', coalesce(v_item -> 'options', '{}'::jsonb),
            v_item ->> 'image_url', (v_item ->> 'unit_price')::numeric, (v_item ->> 'quantity')::int,
            (v_item ->> 'line_total')::numeric);
  end loop;

  -- Redeem the coupon under a row lock so its limits hold under concurrency.
  if v_order.coupon_code is not null then
    v_coupon_id := (v_summary -> 'coupon' ->> 'id')::uuid;
    select * into v_coupon from public.coupons where id = v_coupon_id for update;
    if v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit then
      raise exception 'COUPON_INVALID:הקופון מומש במלואו';
    end if;
    if v_coupon.per_customer_limit is not null and (
         select count(*) from public.coupon_redemptions
          where coupon_id = v_coupon_id and lower(email) = v_email) >= v_coupon.per_customer_limit then
      raise exception 'COUPON_INVALID:כבר השתמשת בקופון זה';
    end if;
    update public.coupons set used_count = used_count + 1 where id = v_coupon_id;
    insert into public.coupon_redemptions (coupon_id, order_id, email) values (v_coupon_id, v_order.id, v_email);
  end if;

  if v_method.requires_address then
    insert into public.order_addresses (order_id, full_name, phone, city, street, house_number, apartment, zip, notes)
    values (v_order.id, coalesce(nullif(btrim(p_address ->> 'full_name'), ''), v_order.customer_name),
            coalesce(nullif(btrim(p_address ->> 'phone'), ''), v_order.customer_phone),
            btrim(p_address ->> 'city'), btrim(p_address ->> 'street'), btrim(p_address ->> 'house_number'),
            nullif(btrim(p_address ->> 'apartment'), ''), nullif(btrim(p_address ->> 'zip'), ''),
            nullif(btrim(p_address ->> 'notes'), ''));
  end if;

  update public.carts set email = v_email where id = p_cart_id;
  insert into public.order_events (order_id, type, data)
  values (v_order.id, 'created', jsonb_build_object('total', v_order.total));

  return jsonb_build_object('order_id', v_order.id, 'order_number', v_order.order_number,
                            'public_token', v_order.public_token, 'total', v_order.total,
                            'expires_at', v_expires);
end $$;

-- Settle an order after the payment provider confirmed the charge.
-- Idempotent: confirming an already-paid order is a no-op.
create or replace function public.confirm_order_payment(
  p_order_id uuid,
  p_provider text,
  p_provider_ref text,
  p_amount numeric,
  p_raw jsonb default null
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_order public.orders;
  r record;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if v_order.payment_status = 'paid' then
    return jsonb_build_object('status', 'already_paid', 'order_number', v_order.order_number);
  end if;
  if p_amount is distinct from v_order.total then
    insert into public.order_events (order_id, type, data)
    values (p_order_id, 'payment_amount_mismatch', jsonb_build_object('expected', v_order.total, 'received', p_amount));
    raise exception 'AMOUNT_MISMATCH';
  end if;

  insert into public.payments (order_id, provider, provider_ref, amount, status, raw)
  values (p_order_id, p_provider, p_provider_ref, p_amount, 'succeeded', p_raw)
  on conflict (provider, provider_ref) where provider_ref is not null do nothing;
  if not found then
    -- The same provider transaction was already used for a payment.
    raise exception 'PAYMENT_REFERENCE_REUSED';
  end if;

  if v_order.status = 'cancelled' then
    -- Paid after the reservation lapsed. Take the stock again if it is
    -- still there; otherwise keep the order cancelled and flag it for a refund.
    begin
      for r in select variant_id, quantity from public.order_items where order_id = p_order_id order by variant_id loop
        update public.inventory set reserved = reserved + r.quantity
         where variant_id = r.variant_id and (allow_backorder or on_hand - reserved >= r.quantity);
        if not found then raise exception 'RESTOCK_FAILED'; end if;
        insert into public.inventory_reservations (order_id, variant_id, quantity, expires_at)
        values (p_order_id, r.variant_id, r.quantity, now());
      end loop;
    exception when raise_exception then
      update public.orders set payment_status = 'paid', paid_at = now() where id = p_order_id;
      insert into public.order_events (order_id, type, data)
      values (p_order_id, 'paid_after_cancellation', jsonb_build_object('action', 'refund_required'));
      insert into public.notifications (kind, title, body, link, permission_code)
      values ('order', 'תשלום התקבל להזמנה שבוטלה',
              format('הזמנה %s שולמה לאחר שהמלאי שוחרר. נדרש החזר כספי.', v_order.order_number),
              '/admin/orders/' || p_order_id, 'orders.manage');
      return jsonb_build_object('status', 'refund_required', 'order_number', v_order.order_number);
    end;
  end if;

  -- Commit the reservation: the stock physically leaves.
  for r in
    select id, variant_id, quantity from public.inventory_reservations
     where order_id = p_order_id and status = 'active' order by variant_id for update
  loop
    update public.inventory
       set on_hand = greatest(on_hand - r.quantity, 0), reserved = greatest(reserved - r.quantity, 0)
     where variant_id = r.variant_id;
    update public.inventory_reservations set status = 'committed' where id = r.id;
    insert into public.inventory_movements (variant_id, delta, reason, order_id)
    values (r.variant_id, -r.quantity, 'sale', p_order_id);
  end loop;

  update public.products p set sales_count = p.sales_count + s.qty
    from (select product_id, sum(quantity)::int as qty from public.order_items
           where order_id = p_order_id and product_id is not null group by product_id) s
   where p.id = s.product_id;

  update public.orders
     set status = 'paid', payment_status = 'paid', paid_at = now(), cancel_reason = null
   where id = p_order_id;
  update public.carts set status = 'converted' where id = v_order.cart_id;

  insert into public.order_events (order_id, type, data, is_internal)
  values (p_order_id, 'paid', jsonb_build_object('provider', p_provider, 'ref', p_provider_ref), false);
  insert into public.notifications (kind, title, body, link, permission_code)
  values ('order', 'הזמנה חדשה', format('הזמנה %s על סך %s ₪', v_order.order_number, v_order.total),
          '/admin/orders/' || p_order_id, 'orders.view');

  return jsonb_build_object('status', 'paid', 'order_number', v_order.order_number);
end $$;

-- Payment declined / abandoned: release the stock and close the order.
create or replace function public.fail_order_payment(p_order_id uuid, p_provider text, p_reason text default null)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_done boolean;
begin
  v_done := public._cancel_pending_order(p_order_id, 'payment_failed', 'failed');
  if v_done then
    insert into public.payments (order_id, provider, amount, status, failure_reason)
    select id, p_provider, total, 'failed', p_reason from public.orders where id = p_order_id;
  end if;
  return v_done;
end $$;

-- Scheduled job: release reservations of orders that were never paid.
create or replace function public.release_expired_orders()
returns int language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid; v_count int := 0;
begin
  for v_id in
    select id from public.orders
     where status = 'pending_payment' and reservation_expires_at < now()
     order by reservation_expires_at
       for update skip locked
  loop
    if public._cancel_pending_order(v_id, 'expired', 'unpaid') then v_count := v_count + 1; end if;
  end loop;
  return v_count;
end $$;

-- Record a provider notification exactly once. Returns false for a replay.
create or replace function public.register_payment_event(
  p_provider text, p_event_id text, p_order_id uuid, p_type text, p_payload jsonb
) returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.payment_events (provider, event_id, order_id, type, payload)
  values (p_provider, p_event_id, p_order_id, p_type, p_payload)
  on conflict (provider, event_id) do nothing;
  return found;
end $$;

-- Admin: move an order along its fulfilment lifecycle.
create or replace function public.admin_set_order_status(p_order_id uuid, p_status public.order_status, p_tracking text default null)
returns public.orders language plpgsql security definer set search_path = public, pg_temp as $$
declare v_order public.orders;
begin
  if not public.has_permission('orders.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if p_status = 'cancelled' and v_order.status = 'pending_payment' then
    perform public._cancel_pending_order(p_order_id, 'cancelled_by_admin', v_order.payment_status);
  elsif p_status in ('paid', 'pending_payment') then
    raise exception 'STATUS_NOT_ALLOWED';
  elsif v_order.payment_status <> 'paid' and p_status not in ('cancelled') then
    raise exception 'ORDER_NOT_PAID';
  else
    update public.orders
       set status = p_status, tracking_number = coalesce(nullif(btrim(p_tracking), ''), tracking_number)
     where id = p_order_id;
  end if;
  insert into public.order_events (order_id, type, data, actor_id, is_internal)
  values (p_order_id, 'status_changed', jsonb_build_object('from', v_order.status, 'to', p_status),
          (select auth.uid()), false);
  select * into v_order from public.orders where id = p_order_id;
  return v_order;
end $$;
