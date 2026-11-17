-- =====================================================================
-- 0005 · Commerce: carts, shipping, coupons, orders, payments
-- =====================================================================
create type public.order_status as enum (
  'pending_payment', 'paid', 'processing', 'preparing', 'ready_to_ship',
  'shipped', 'delivered', 'cancelled', 'returned');
create type public.payment_status as enum (
  'unpaid', 'pending', 'paid', 'failed', 'refunded', 'partially_refunded');

create table public.shipping_methods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  kind text not null default 'delivery' check (kind in ('delivery', 'pickup', 'business')),
  price numeric(12,2) not null default 0 check (price >= 0),
  free_above numeric(12,2) check (free_above is null or free_above >= 0),
  delivery_days_min int,
  delivery_days_max int,
  requires_address boolean not null default true,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cities text[] not null default '{}',
  surcharge numeric(12,2) not null default 0,
  is_active boolean not null default true
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,32}$'),
  description text,
  kind text not null check (kind in ('percent', 'fixed', 'free_shipping')),
  value numeric(12,2) not null default 0 check (value >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit int check (usage_limit is null or usage_limit > 0),
  per_customer_limit int check (per_customer_limit is null or per_customer_limit > 0),
  min_order numeric(12,2) not null default 0,
  used_count int not null default 0 check (used_count >= 0),
  is_stackable boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'percent' or value <= 100),
  check (usage_limit is null or used_count <= usage_limit)
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('percent', 'fixed', 'free_shipping', 'quantity', 'buy_x_get_y')),
  value numeric(12,2) not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.promotion_rules (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  rule_type text not null check (rule_type in ('category', 'product', 'min_subtotal', 'min_quantity', 'customer_type')),
  config jsonb not null default '{}'::jsonb
);
create index promotion_rules_promotion_idx on public.promotion_rules(promotion_id);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  -- Secret bearer token stored in an httpOnly cookie; the id never leaves the server.
  token uuid not null unique default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  coupon_code text,
  email text,
  status text not null default 'active' check (status in ('active', 'converted', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index carts_user_idx on public.carts(user_id);
create index carts_status_idx on public.carts(status, updated_at);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity int not null check (quantity between 1 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

create sequence public.order_number_seq start 10001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint not null unique default nextval('public.order_number_seq'),
  -- Unguessable token for the guest order-status link.
  public_token uuid not null unique default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  cart_id uuid references public.carts(id) on delete set null,
  status public.order_status not null default 'pending_payment',
  payment_status public.payment_status not null default 'unpaid',
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  customer_type public.customer_type not null default 'private',
  company_name text,
  company_number text,
  shipping_method_id uuid references public.shipping_methods(id) on delete set null,
  shipping_method_name text not null,
  currency text not null default 'ILS',
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  shipping_total numeric(12,2) not null default 0 check (shipping_total >= 0),
  total numeric(12,2) not null check (total >= 0),
  vat_rate numeric(5,2) not null,
  vat_amount numeric(12,2) not null,
  coupon_code text,
  customer_note text,
  tracking_number text,
  cancel_reason text,
  reservation_expires_at timestamptz,
  placed_at timestamptz not null default now(),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total = subtotal - discount_total + shipping_total)
);
create index orders_user_idx on public.orders(user_id);
create index orders_status_idx on public.orders(status, placed_at desc);
create index orders_email_idx on public.orders(lower(customer_email));
create index orders_pending_idx on public.orders(reservation_expires_at) where status = 'pending_payment';
create index orders_cart_idx on public.orders(cart_id);

alter table public.inventory_reservations
  add constraint inventory_reservations_order_fk foreign key (order_id) references public.orders(id) on delete cascade;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  -- Snapshots: an order must stay readable after the catalog changes.
  product_name text not null,
  variant_name text,
  sku text not null,
  options jsonb not null default '{}'::jsonb,
  image_url text,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity int not null check (quantity > 0),
  line_total numeric(12,2) not null,
  check (line_total = unit_price * quantity)
);
create index order_items_order_idx on public.order_items(order_id);
create index order_items_product_idx on public.order_items(product_id);

create table public.order_addresses (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  kind text not null default 'shipping' check (kind in ('shipping', 'billing')),
  full_name text not null,
  phone text not null,
  city text not null,
  street text not null,
  house_number text not null,
  apartment text,
  zip text,
  notes text,
  unique (order_id, kind)
);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  type text not null,
  data jsonb not null default '{}'::jsonb,
  is_internal boolean not null default true,
  actor_id uuid,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events(order_id, created_at);

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);
create index coupon_redemptions_coupon_idx on public.coupon_redemptions(coupon_id, lower(email));

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  provider_ref text,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'ILS',
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed', 'cancelled')),
  failure_reason text,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_order_idx on public.payments(order_id);
-- A provider transaction can settle at most one payment row.
create unique index payments_provider_ref_idx on public.payments(provider, provider_ref) where provider_ref is not null;

-- Raw provider notifications. The unique key is what makes webhook
-- processing idempotent: a replayed event cannot be inserted twice.
create table public.payment_events (
  id bigint generated always as identity primary key,
  provider text not null,
  event_id text not null,
  order_id uuid references public.orders(id) on delete set null,
  type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  reason text,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  provider_ref text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index refunds_order_idx on public.refunds(order_id);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  carrier text,
  tracking_number text,
  status text not null default 'pending' check (status in ('pending', 'shipped', 'in_transit', 'delivered', 'returned')),
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
create index shipments_order_idx on public.shipments(order_id);

create table public.shipment_events (
  id bigint generated always as identity primary key,
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  status text not null,
  description text,
  occurred_at timestamptz not null default now()
);
create index shipment_events_shipment_idx on public.shipment_events(shipment_id);

create trigger shipping_methods_updated before update on public.shipping_methods for each row execute function public.set_updated_at();
create trigger coupons_updated before update on public.coupons for each row execute function public.set_updated_at();
create trigger carts_updated before update on public.carts for each row execute function public.set_updated_at();
create trigger cart_items_updated before update on public.cart_items for each row execute function public.set_updated_at();
create trigger orders_updated before update on public.orders for each row execute function public.set_updated_at();
create trigger payments_updated before update on public.payments for each row execute function public.set_updated_at();

create trigger audit_orders after update or delete on public.orders for each row execute function public.audit_row();
create trigger audit_coupons after insert or update or delete on public.coupons for each row execute function public.audit_row();
create trigger audit_shipping_methods after insert or update or delete on public.shipping_methods for each row execute function public.audit_row();
