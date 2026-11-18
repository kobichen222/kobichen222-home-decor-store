-- =====================================================================
-- 0014 · Admin notifications and e-mail automation bookkeeping
-- =====================================================================
alter table public.carts add column if not exists reminder_sent_at timestamptz;

-- In-admin notifications for events that need attention.
create or replace function public.trg_notify()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_table_name = 'stock_alerts' then
    insert into public.notifications (kind, title, body, link, permission_code)
    select 'stock',
           case when new.kind = 'out_of_stock' then 'מוצר אזל מהמלאי' else 'מלאי נמוך' end,
           p.name || coalesce(' · ' || v.name, ''),
           '/admin/products/' || p.id, 'inventory.manage'
      from public.product_variants v join public.products p on p.id = v.product_id
     where v.id = new.variant_id;
  elsif tg_table_name = 'leads' then
    insert into public.notifications (kind, title, body, link, permission_code)
    values ('lead', 'פנייה חדשה מהאתר', coalesce(new.full_name, '') || coalesce(' · ' || new.phone, ''),
            '/admin/leads/' || new.id, 'marketing.manage');
  elsif tg_table_name = 'reviews' then
    insert into public.notifications (kind, title, body, link, permission_code)
    values ('review', 'חוות דעת ממתינה לאישור', new.author_name || ' · ' || new.rating || '★', '/admin/reviews/' || new.id, 'content.manage');
  end if;
  return null;
end $$;
create trigger stock_alerts_notify after insert on public.stock_alerts for each row execute function public.trg_notify();
create trigger leads_notify after insert on public.leads for each row
  when (new.kind <> 'newsletter') execute function public.trg_notify();
create trigger reviews_notify after insert on public.reviews for each row
  when (new.status = 'pending') execute function public.trg_notify();

-- Unread count + latest items for the signed-in admin.
create or replace function public.my_notifications(p_limit int default 15)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  with visible as (
    select * from public.notifications n
     where public.is_admin() and (n.permission_code is null or public.has_permission(n.permission_code))
  )
  select jsonb_build_object(
    'unread', (select count(*) from visible where read_at is null),
    'items', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select id, kind, title, body, link, read_at, created_at from visible order by created_at desc limit least(p_limit, 50)) x), '[]'::jsonb));
$$;

create or replace function public.mark_notifications_read()
returns void language sql security definer set search_path = public, pg_temp as $$
  update public.notifications n set read_at = now()
   where n.read_at is null and public.is_admin() and (n.permission_code is null or public.has_permission(n.permission_code));
$$;

revoke execute on function public.trg_notify(), public.my_notifications(int), public.mark_notifications_read() from public, anon;
grant execute on function public.my_notifications(int), public.mark_notifications_read() to authenticated;
grant execute on all functions in schema public to service_role;
