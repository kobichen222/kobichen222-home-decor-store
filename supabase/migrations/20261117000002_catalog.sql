-- =====================================================================
-- 0002 · Catalog
-- =====================================================================
create type public.product_status as enum ('draft', 'active', 'archived');
create type public.relation_kind as enum ('related', 'complementary', 'upsell');

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  image_url text,
  banner_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  show_on_home boolean not null default false,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is distinct from id)
);
create index categories_parent_idx on public.categories(parent_id);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sku text not null unique,
  short_description text,
  description text,
  brand_id uuid references public.brands(id) on delete set null,
  status public.product_status not null default 'draft',
  is_featured boolean not null default false,
  -- Prices are in ILS and include VAT.
  price numeric(12,2) not null check (price >= 0),
  sale_price numeric(12,2) check (sale_price is null or (sale_price >= 0 and sale_price < price)),
  sale_starts_at timestamptz,
  sale_ends_at timestamptz,
  specs jsonb not null default '[]'::jsonb,           -- [{label, value}]
  width_cm numeric(8,2), height_cm numeric(8,2), depth_cm numeric(8,2),
  weight_kg numeric(8,3),
  installation_instructions text,
  care_instructions text,
  delivery_days_min int, delivery_days_max int,
  shipping_weight_kg numeric(8,3),
  package_dimensions jsonb,
  handling_days int,
  video_url text,
  seo_title text,
  seo_description text,
  og_image_url text,
  noindex boolean not null default false,
  sales_count int not null default 0,
  search_text text not null default '',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_status_idx on public.products(status);
create index products_brand_idx on public.products(brand_id);
create index products_created_idx on public.products(created_at desc);
create index products_search_trgm_idx on public.products using gin (search_text extensions.gin_trgm_ops);

-- Admin-only commercial data, kept out of the publicly readable row.
create table public.product_private (
  product_id uuid primary key references public.products(id) on delete cascade,
  cost_price numeric(12,2) check (cost_price is null or cost_price >= 0),
  internal_notes text,
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  storage_path text,
  alt text,
  sort_order int not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images(product_id, sort_order);
create unique index product_images_one_primary on public.product_images(product_id) where is_primary;

-- Every product has at least one variant (the default one); carts, orders
-- and inventory always reference a variant.
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  name text,
  options jsonb not null default '{}'::jsonb,          -- {"צבע":"שחור","מידה":"60×90"}
  price numeric(12,2) check (price is null or price >= 0),   -- null = inherit product price
  sale_price numeric(12,2) check (sale_price is null or sale_price >= 0),
  image_id uuid references public.product_images(id) on delete set null,
  lead_time_days int,
  is_default boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_variants_product_idx on public.product_variants(product_id, sort_order);
create unique index product_variants_one_default on public.product_variants(product_id) where is_default;

create table public.product_attributes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  kind text not null default 'select' check (kind in ('select', 'color')),
  is_filterable boolean not null default true,
  sort_order int not null default 0
);

create table public.product_attribute_values (
  id uuid primary key default gen_random_uuid(),
  attribute_id uuid not null references public.product_attributes(id) on delete cascade,
  value text not null,
  color_hex text,
  sort_order int not null default 0,
  unique (attribute_id, value)
);

create table public.product_attribute_assignments (
  product_id uuid not null references public.products(id) on delete cascade,
  attribute_value_id uuid not null references public.product_attribute_values(id) on delete cascade,
  primary key (product_id, attribute_value_id)
);
create index product_attribute_assignments_value_idx on public.product_attribute_assignments(attribute_value_id);

create table public.product_categories (
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  is_primary boolean not null default false,
  primary key (product_id, category_id)
);
create index product_categories_category_idx on public.product_categories(category_id);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  image_url text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collection_products (
  collection_id uuid not null references public.collections(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  sort_order int not null default 0,
  primary key (collection_id, product_id)
);
create index collection_products_product_idx on public.collection_products(product_id);

create table public.product_relations (
  product_id uuid not null references public.products(id) on delete cascade,
  related_product_id uuid not null references public.products(id) on delete cascade,
  kind public.relation_kind not null default 'related',
  sort_order int not null default 0,
  primary key (product_id, related_product_id, kind),
  check (product_id <> related_product_id)
);

create trigger brands_updated before update on public.brands for each row execute function public.set_updated_at();
create trigger categories_updated before update on public.categories for each row execute function public.set_updated_at();
create trigger products_updated before update on public.products for each row execute function public.set_updated_at();
create trigger product_variants_updated before update on public.product_variants for each row execute function public.set_updated_at();
create trigger collections_updated before update on public.collections for each row execute function public.set_updated_at();

create trigger audit_products after insert or update or delete on public.products for each row execute function public.audit_row();
create trigger audit_categories after insert or update or delete on public.categories for each row execute function public.audit_row();
create trigger audit_product_variants after update or delete on public.product_variants for each row execute function public.audit_row();

-- ---------- Search document -----------------------------------------
-- One denormalised text per product (name, SKU, brand, categories,
-- attribute values) so a query such as "שעון קיר שחור גדול" matches
-- across name, category, colour and size.
create or replace function public.refresh_product_search(p_product_id uuid)
returns void language sql security definer set search_path = public, pg_temp as $$
  update public.products p
     set search_text = lower(concat_ws(' ',
           p.name, p.sku, p.short_description,
           (select b.name from public.brands b where b.id = p.brand_id),
           (select string_agg(c.name, ' ') from public.product_categories pc
              join public.categories c on c.id = pc.category_id where pc.product_id = p.id),
           (select string_agg(v.value, ' ') from public.product_attribute_assignments a
              join public.product_attribute_values v on v.id = a.attribute_value_id where a.product_id = p.id),
           (select string_agg(pv.sku, ' ') from public.product_variants pv where pv.product_id = p.id)))
   where p.id = p_product_id;
$$;

create or replace function public.trg_product_search()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_table_name = 'products' then
    perform public.refresh_product_search(new.id);
  else
    perform public.refresh_product_search(coalesce(new.product_id, old.product_id));
  end if;
  return null;
end $$;

create trigger products_search after insert or update of name, sku, short_description, brand_id on public.products
  for each row execute function public.trg_product_search();
create trigger product_categories_search after insert or delete on public.product_categories
  for each row execute function public.trg_product_search();
create trigger product_attribute_assignments_search after insert or delete on public.product_attribute_assignments
  for each row execute function public.trg_product_search();
create trigger product_variants_search after insert or delete or update of sku on public.product_variants
  for each row execute function public.trg_product_search();
