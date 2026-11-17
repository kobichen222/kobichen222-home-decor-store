-- =====================================================================
-- 0001 · Foundation: extensions, shared helpers, RBAC, audit log
-- =====================================================================
create extension if not exists pg_trgm with schema extensions;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- RBAC -----------------------------------------------------
create table public.admin_roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.admin_permissions (
  code text primary key,
  description text not null
);

create table public.admin_role_permissions (
  role_id uuid not null references public.admin_roles(id) on delete cascade,
  permission_code text not null references public.admin_permissions(code) on delete cascade,
  primary key (role_id, permission_code)
);

create table public.admin_user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.admin_roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  primary key (user_id, role_id)
);
create index admin_user_roles_role_idx on public.admin_user_roles(role_id);

-- SECURITY DEFINER so RLS policies can call them without recursing into
-- the RBAC tables' own policies.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.admin_user_roles where user_id = (select auth.uid()));
$$;

create or replace function public.has_permission(p_permission text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
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

insert into public.admin_permissions (code, description) values
  ('catalog.manage',   'ניהול מוצרים, קטגוריות, קולקציות, מותגים ומדיה'),
  ('inventory.manage', 'ניהול מלאי ותנועות מלאי'),
  ('orders.view',      'צפייה בהזמנות'),
  ('orders.manage',    'עדכון הזמנות, ביטולים והחזרים'),
  ('shipping.manage',  'ניהול משלוחים ושיטות משלוח'),
  ('customers.view',   'צפייה בלקוחות'),
  ('customers.manage', 'עריכת לקוחות והערות שירות'),
  ('content.manage',   'ניהול תוכן, עמודים, באנרים ובלוג'),
  ('marketing.manage', 'קופונים, מבצעים, דיוור ולידים'),
  ('reports.view',     'צפייה בדוחות'),
  ('finance.view',     'צפייה בנתונים פיננסיים'),
  ('settings.manage',  'הגדרות חנות ואינטגרציות'),
  ('users.manage',     'ניהול משתמשי מערכת והרשאות');

insert into public.admin_roles (code, name, description) values
  ('owner',             'בעלים',         'גישה מלאה'),
  ('store_manager',     'מנהל חנות',     'מוצרים, הזמנות, לקוחות'),
  ('catalog_manager',   'מנהל קטלוג',    'מוצרים, קטגוריות ומלאי'),
  ('orders_manager',    'מנהל הזמנות',   'הזמנות ומשלוחים'),
  ('support',           'שירות לקוחות',  'לקוחות והזמנות'),
  ('content_manager',   'מנהל תוכן',     'CMS ובלוג'),
  ('marketing_manager', 'מנהל שיווק',    'קופונים, קמפיינים ודוחות'),
  ('accountant',        'רואה חשבון',    'נתונים פיננסיים מורשים');

insert into public.admin_role_permissions (role_id, permission_code)
select r.id, p.code
from public.admin_roles r
join (values
  ('store_manager','catalog.manage'),('store_manager','inventory.manage'),('store_manager','orders.view'),
  ('store_manager','orders.manage'),('store_manager','shipping.manage'),('store_manager','customers.view'),
  ('store_manager','customers.manage'),('store_manager','content.manage'),('store_manager','marketing.manage'),
  ('store_manager','reports.view'),
  ('catalog_manager','catalog.manage'),('catalog_manager','inventory.manage'),
  ('orders_manager','orders.view'),('orders_manager','orders.manage'),('orders_manager','shipping.manage'),
  ('orders_manager','customers.view'),
  ('support','orders.view'),('support','customers.view'),('support','customers.manage'),
  ('content_manager','content.manage'),
  ('marketing_manager','marketing.manage'),('marketing_manager','reports.view'),('marketing_manager','customers.view'),
  ('accountant','orders.view'),('accountant','reports.view'),('accountant','finance.view')
) as p(role_code, code) on p.role_code = r.code;

-- ---------- Audit log ------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  changes jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs(entity, entity_id);
create index audit_logs_created_idx on public.audit_logs(created_at desc);

-- Generic row-audit trigger. Stores only the changed columns on UPDATE.
create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('UPDATE','INSERT') then to_jsonb(new) end;
  v_changes jsonb;
  v_id text;
begin
  v_id := coalesce(v_new ->> 'id', v_old ->> 'id', v_new ->> 'key', v_old ->> 'key',
                   v_new ->> 'variant_id', v_old ->> 'variant_id', v_new ->> 'user_id', v_old ->> 'user_id');
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(n.key, jsonb_build_object('from', v_old -> n.key, 'to', n.value))
      into v_changes
      from jsonb_each(v_new) n
     where n.value is distinct from v_old -> n.key and n.key not in ('updated_at','search_text');
    if v_changes is null then return new; end if;
  elsif tg_op = 'INSERT' then
    v_changes := v_new;
  else
    v_changes := v_old;
  end if;
  insert into public.audit_logs (actor_id, action, entity, entity_id, changes)
  values ((select auth.uid()), lower(tg_op), tg_table_name, v_id, v_changes);
  return coalesce(new, old);
end $$;

create trigger audit_admin_user_roles after insert or update or delete on public.admin_user_roles
  for each row execute function public.audit_row();
