-- =====================================================================
-- 0012 · Product videos (uploaded files or YouTube links)
-- =====================================================================
create table public.product_videos (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  kind text not null check (kind in ('file', 'youtube')),
  -- file: public URL in the product-videos bucket; youtube: the video id
  url text not null,
  storage_path text,
  title text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  check (kind <> 'youtube' or url ~ '^[A-Za-z0-9_-]{11}$')
);
create index product_videos_product_idx on public.product_videos(product_id, sort_order);
alter table public.product_videos enable row level security;

create policy product_videos_public on public.product_videos for select
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'active'));
create policy product_videos_admin_catalog_manage on public.product_videos for all to authenticated
  using ((select public.has_permission('catalog.manage'))) with check ((select public.has_permission('catalog.manage')));
grant select on public.product_videos to anon;
grant select, insert, update, delete on public.product_videos to authenticated;
grant all on public.product_videos to service_role;

create trigger audit_product_videos after insert or delete on public.product_videos for each row execute function public.audit_row();

-- Separate public bucket: videos are large and get their own limits.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('product-videos', 'product-videos', true, 52428800, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do nothing;

create policy product_videos_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'product-videos' and (select public.has_permission('catalog.manage')));
create policy product_videos_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'product-videos' and (select public.has_permission('catalog.manage')));
create policy product_videos_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'product-videos' and (select public.has_permission('catalog.manage')));
create policy product_videos_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-videos' and (select public.has_permission('catalog.manage')));
