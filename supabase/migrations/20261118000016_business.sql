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
