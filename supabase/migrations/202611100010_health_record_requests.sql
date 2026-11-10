create table public.health_record_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  preferred_language text not null check (preferred_language in ('ar','en')),
  include_originals boolean not null default false,
  status text not null default 'requested' check (status in ('requested','identity_check','preparing','ready','delivered','rejected')),
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  delivery_path text,
  check (status not in ('ready','delivered') or delivery_path is not null)
);
create index health_record_requests_queue_idx on public.health_record_requests(status,requested_at);
create index health_record_requests_owner_idx on public.health_record_requests(user_id,requested_at desc);
create unique index health_record_requests_one_open_per_client
  on public.health_record_requests(client_id)
  where status in ('requested','identity_check','preparing','ready');

create table public.health_record_request_reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.health_record_requests(id) on delete cascade,
  admin_id uuid not null references auth.users(id),
  admin_note text not null default '' check (char_length(admin_note)<=3000),
  rejection_reason text not null default '' check (char_length(rejection_reason)<=1000),
  reviewed_at timestamptz not null default now()
);
alter table public.health_record_requests enable row level security;
alter table public.health_record_request_reviews enable row level security;

create policy health_record_requests_client_read on public.health_record_requests
for select to authenticated using (user_id=(select auth.uid()));
create policy health_record_requests_client_insert on public.health_record_requests
for insert to authenticated with check (
  user_id=(select auth.uid())
  and exists(select 1 from public.clients c where c.id=client_id and c.user_id=(select auth.uid()) and c.clinic_id=clinic_id)
  and status='requested' and delivery_path is null
);
create policy health_record_requests_admin_read on public.health_record_requests
for select to authenticated using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='super_admin'));
create policy health_record_requests_admin_update on public.health_record_requests
for update to authenticated using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='super_admin'))
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='super_admin'));

create policy health_record_request_reviews_admin_access on public.health_record_request_reviews
for all to authenticated using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='super_admin'))
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='super_admin'));

revoke all on public.health_record_requests,public.health_record_request_reviews from anon;
grant select,insert,update on public.health_record_requests to authenticated;
grant select,insert,update on public.health_record_request_reviews to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('qawam-health-exports','qawam-health-exports',false,52428800,array['application/pdf'])
on conflict(id) do update set public=false,file_size_limit=52428800,allowed_mime_types=array['application/pdf'];

create policy qawam_health_exports_read on storage.objects for select to authenticated
using (
  bucket_id='qawam-health-exports'
  and (
    split_part(name,'/',1)=(select auth.uid())::text
    or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='super_admin')
  )
);
create policy qawam_health_exports_admin_insert on storage.objects for insert to authenticated
with check (
  bucket_id='qawam-health-exports'
  and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='super_admin')
  and split_part(name,'/',1) ~* '^[0-9a-f-]{36}$'
  and exists(select 1 from public.health_record_requests r where r.id::text=split_part(name,'/',2) and r.user_id=split_part(name,'/',1)::uuid)
);
create policy qawam_health_exports_admin_update on storage.objects for update to authenticated
using (bucket_id='qawam-health-exports' and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='super_admin'))
with check (bucket_id='qawam-health-exports' and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='super_admin'));
create policy qawam_health_exports_admin_delete on storage.objects for delete to authenticated
using (bucket_id='qawam-health-exports' and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='super_admin'));
