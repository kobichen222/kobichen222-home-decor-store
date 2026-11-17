-- =====================================================================
-- 0004 · Customers, B2B, leads
-- =====================================================================
create type public.customer_type as enum ('private', 'business');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  customer_type public.customer_type not null default 'private',
  marketing_opt_in boolean not null default false,
  marketing_opt_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  full_name text not null,
  phone text not null,
  city text not null,
  street text not null,
  house_number text not null,
  apartment text,
  zip text,
  notes text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index customer_addresses_user_idx on public.customer_addresses(user_id);

create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'מועדפים',
  created_at timestamptz not null default now()
);
create index wishlists_user_idx on public.wishlists(user_id);

create table public.wishlist_items (
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (wishlist_id, product_id)
);

create table public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index customer_notes_user_idx on public.customer_notes(user_id);

create table public.business_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  company_name text not null,
  company_number text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  discount_percent numeric(5,2) not null default 0 check (discount_percent between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'contact' check (kind in ('contact', 'quote', 'business_project', 'newsletter')),
  full_name text,
  email text,
  phone text,
  message text,
  data jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'in_progress', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_status_idx on public.leads(status, created_at desc);

create table public.business_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  total numeric(12,2) not null default 0,
  valid_until date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.business_quotes(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  description text not null,
  quantity int not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0)
);
create index business_quote_items_quote_idx on public.business_quote_items(quote_id);

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  consent_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  source text
);
