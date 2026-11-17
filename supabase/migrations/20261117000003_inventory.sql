-- =====================================================================
-- 0003 · Inventory
-- =====================================================================
create table public.inventory (
  variant_id uuid primary key references public.product_variants(id) on delete cascade,
  on_hand int not null default 0 check (on_hand >= 0),
  reserved int not null default 0 check (reserved >= 0),
  low_stock_threshold int not null default 3 check (low_stock_threshold >= 0),
  allow_backorder boolean not null default false,
  updated_at timestamptz not null default now(),
  -- The oversell guard: stock promised to orders can never exceed stock on
  -- hand unless pre-order is explicitly enabled for the variant.
  constraint inventory_no_oversell check (allow_backorder or reserved <= on_hand)
);

create table public.inventory_movements (
  id bigint generated always as identity primary key,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  delta int not null,
  reason text not null check (reason in ('adjustment', 'sale', 'return', 'import', 'initial')),
  order_id uuid,
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index inventory_movements_variant_idx on public.inventory_movements(variant_id, created_at desc);

create table public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity int not null check (quantity > 0),
  status text not null default 'active' check (status in ('active', 'committed', 'released')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index inventory_reservations_order_idx on public.inventory_reservations(order_id);
create index inventory_reservations_active_idx on public.inventory_reservations(expires_at) where status = 'active';

create table public.stock_alerts (
  id bigint generated always as identity primary key,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  kind text not null check (kind in ('low_stock', 'out_of_stock')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create unique index stock_alerts_open_idx on public.stock_alerts(variant_id, kind) where resolved_at is null;

create trigger inventory_updated before update on public.inventory for each row execute function public.set_updated_at();
create trigger inventory_reservations_updated before update on public.inventory_reservations for each row execute function public.set_updated_at();

-- Each variant gets an inventory row automatically.
create or replace function public.trg_variant_inventory()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.inventory (variant_id) values (new.id) on conflict do nothing;
  return null;
end $$;
create trigger product_variants_inventory after insert on public.product_variants
  for each row execute function public.trg_variant_inventory();

-- Open / resolve stock alerts as availability crosses the threshold.
create or replace function public.trg_inventory_alerts()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_available int := new.on_hand - new.reserved;
begin
  if v_available <= 0 then
    insert into public.stock_alerts (variant_id, kind) values (new.variant_id, 'out_of_stock') on conflict do nothing;
  else
    update public.stock_alerts set resolved_at = now()
     where variant_id = new.variant_id and kind = 'out_of_stock' and resolved_at is null;
  end if;
  if v_available > 0 and v_available <= new.low_stock_threshold then
    insert into public.stock_alerts (variant_id, kind) values (new.variant_id, 'low_stock') on conflict do nothing;
  elsif v_available > new.low_stock_threshold then
    update public.stock_alerts set resolved_at = now()
     where variant_id = new.variant_id and kind = 'low_stock' and resolved_at is null;
  end if;
  return null;
end $$;
create trigger inventory_alerts after update of on_hand, reserved, low_stock_threshold on public.inventory
  for each row execute function public.trg_inventory_alerts();

-- Manual stock adjustment (admin). Sets the absolute on-hand quantity and
-- records the movement; refuses to drop below what is already reserved.
create or replace function public.admin_set_stock(p_variant_id uuid, p_on_hand int, p_note text default null)
returns public.inventory language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.inventory; v_delta int;
begin
  if not public.has_permission('inventory.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select * into v_row from public.inventory where variant_id = p_variant_id for update;
  if not found then raise exception 'VARIANT_NOT_FOUND'; end if;
  if p_on_hand < v_row.reserved and not v_row.allow_backorder then
    raise exception 'BELOW_RESERVED';
  end if;
  v_delta := p_on_hand - v_row.on_hand;
  if v_delta = 0 then return v_row; end if;
  update public.inventory set on_hand = p_on_hand where variant_id = p_variant_id returning * into v_row;
  insert into public.inventory_movements (variant_id, delta, reason, note, created_by)
  values (p_variant_id, v_delta, 'adjustment', p_note, (select auth.uid()));
  return v_row;
end $$;
