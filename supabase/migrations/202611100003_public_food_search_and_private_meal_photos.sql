create unique index if not exists foods_global_name_ar_uidx
  on public.foods(name_ar) where clinic_id is null;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('qawam-private','qawam-private',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function private.can_access_client_user(p_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
 select coalesce((select auth.uid() is not null),false) and exists (
   select 1 from public.clients c
   where c.user_id=p_user_id
     and (c.user_id=(select auth.uid())
       or c.assigned_staff_user_id=(select auth.uid())
       or public.is_clinic_member(c.clinic_id))
 );
$$;
revoke all on function private.can_access_client_user(uuid) from public,anon;
grant execute on function private.can_access_client_user(uuid) to authenticated;

drop policy if exists qawam_meal_photos_read on storage.objects;
create policy qawam_meal_photos_read on storage.objects
for select to authenticated
using (
 bucket_id='qawam-private'
 and case when split_part(name,'/',1) ~* '^[0-9a-f-]{36}$'
   then private.can_access_client_user(split_part(name,'/',1)::uuid)
   else false end
);
drop policy if exists qawam_meal_photos_insert on storage.objects;
create policy qawam_meal_photos_insert on storage.objects
for insert to authenticated
with check (bucket_id='qawam-private' and split_part(name,'/',1)=(select auth.uid())::text);
drop policy if exists qawam_meal_photos_update on storage.objects;
create policy qawam_meal_photos_update on storage.objects
for update to authenticated
using (bucket_id='qawam-private' and split_part(name,'/',1)=(select auth.uid())::text)
with check (bucket_id='qawam-private' and split_part(name,'/',1)=(select auth.uid())::text);
drop policy if exists qawam_meal_photos_delete on storage.objects;
create policy qawam_meal_photos_delete on storage.objects
for delete to authenticated
using (bucket_id='qawam-private' and split_part(name,'/',1)=(select auth.uid())::text);
