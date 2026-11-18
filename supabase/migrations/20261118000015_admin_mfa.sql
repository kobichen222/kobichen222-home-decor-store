-- =====================================================================
-- 0015 · Two-factor authentication for admins, enforced in the database
-- =====================================================================
-- An admin who enrolled an authenticator app holds admin rights only in
-- a session that completed the second factor (aal2). The check lives in
-- is_admin()/has_permission(), so every RLS policy and admin function
-- inherits it — not just the UI.
create or replace function public.admin_mfa_ok()
returns boolean language sql stable security definer set search_path = public, auth, pg_temp as $$
  select not exists (select 1 from auth.mfa_factors f where f.user_id = (select auth.uid()) and f.status = 'verified')
      or coalesce((select auth.jwt()) ->> 'aal', 'aal1') = 'aal2';
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.admin_user_roles where user_id = (select auth.uid())) and public.admin_mfa_ok();
$$;

create or replace function public.has_permission(p_permission text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.admin_mfa_ok() and exists (
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
    when not public.admin_mfa_ok() then '{}'::text[]
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

-- Whether the signed-in user is an admin at all (ignores the second
-- factor) — used only to route a half-signed-in admin to the code screen.
create or replace function public.is_admin_member()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.admin_user_roles where user_id = (select auth.uid()));
$$;

-- Admins without 2FA, for the owner's security overview.
create or replace function public.admin_mfa_status()
returns jsonb language plpgsql stable security definer set search_path = public, auth, pg_temp as $$
begin
  if not public.has_permission('users.manage') then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  return coalesce((select jsonb_object_agg(ur.user_id, exists (select 1 from auth.mfa_factors f where f.user_id = ur.user_id and f.status = 'verified'))
                     from (select distinct user_id from public.admin_user_roles) ur), '{}'::jsonb);
end $$;

revoke execute on function public.admin_mfa_ok(), public.is_admin_member(), public.admin_mfa_status() from public, anon;
grant execute on function public.admin_mfa_ok(), public.is_admin_member(), public.admin_mfa_status() to authenticated, service_role;
