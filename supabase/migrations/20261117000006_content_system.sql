-- =====================================================================
-- 0006 · Content (CMS) and system tables
-- =====================================================================
create table public.store_settings (
  key text primary key,
  value jsonb not null,
  -- Public settings are readable by the storefront. Secrets never live
  -- here: API keys stay in server environment variables.
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger store_settings_updated before update on public.store_settings for each row execute function public.set_updated_at();
create trigger audit_store_settings after insert or update or delete on public.store_settings for each row execute function public.audit_row();

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  body text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  is_system boolean not null default false,
  seo_title text,
  seo_description text,
  noindex boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger pages_updated before update on public.pages for each row execute function public.set_updated_at();

create table public.page_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  kind text not null check (kind in (
    'hero', 'banner', 'categories', 'product_grid', 'collections', 'text_image',
    'gallery', 'testimonials', 'benefits', 'faq', 'lead_form', 'blog', 'rooms', 'newsletter')),
  title text,
  data jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  is_active boolean not null default true,
  hide_on_mobile boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index page_sections_page_idx on public.page_sections(page_id, sort_order);
create trigger page_sections_updated before update on public.page_sections for each row execute function public.set_updated_at();

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  placement text not null default 'announcement',
  title text not null,
  subtitle text,
  image_url text,
  link_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.blog_categories(id) on delete set null,
  title text not null,
  slug text not null unique,
  excerpt text,
  body text,
  cover_image_url text,
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  seo_title text,
  seo_description text,
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger blog_posts_updated before update on public.blog_posts for each row execute function public.set_updated_at();

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  body text,
  is_verified boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
create index reviews_product_idx on public.reviews(product_id) where status = 'approved';

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  question text not null,
  answer text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table public.navigation_menus (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

create table public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.navigation_menus(id) on delete cascade,
  parent_id uuid references public.navigation_items(id) on delete cascade,
  label text not null,
  url text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);
create index navigation_items_menu_idx on public.navigation_items(menu_id, sort_order);

create table public.redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null unique,
  to_path text not null,
  status_code int not null default 301 check (status_code in (301, 302, 307, 308)),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id bigint generated always as identity primary key,
  kind text not null,
  title text not null,
  body text,
  link text,
  permission_code text references public.admin_permissions(code) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_unread_idx on public.notifications(created_at desc) where read_at is null;

create table public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  channel text not null check (channel in ('email', 'whatsapp', 'admin')),
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true
);

create table public.automation_jobs (
  id bigint generated always as identity primary key,
  rule_id uuid references public.automation_rules(id) on delete set null,
  event text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  attempts int not null default 0,
  run_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now()
);
create index automation_jobs_pending_idx on public.automation_jobs(run_at) where status = 'pending';

create table public.integration_events (
  id bigint generated always as identity primary key,
  integration text not null,
  direction text not null check (direction in ('in', 'out')),
  type text not null,
  payload jsonb,
  status text not null default 'ok',
  created_at timestamptz not null default now()
);

create table public.webhook_deliveries (
  id bigint generated always as identity primary key,
  target text not null,
  event text not null,
  payload jsonb,
  response_status int,
  attempts int not null default 0,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
