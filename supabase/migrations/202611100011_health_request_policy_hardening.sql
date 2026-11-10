alter policy health_record_requests_client_insert on public.health_record_requests
with check (
  user_id=(select auth.uid())
  and exists(
    select 1 from public.clients c
    where c.id=health_record_requests.client_id
      and c.user_id=(select auth.uid())
      and c.clinic_id=health_record_requests.clinic_id
  )
  and status='requested' and delivery_path is null
);

alter policy qawam_health_exports_admin_insert on storage.objects
with check (
  bucket_id='qawam-health-exports'
  and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='super_admin')
  and split_part(name,'/',1) ~* '^[0-9a-f-]{36}$'
  and exists(
    select 1 from public.health_record_requests r
    where split_part(name,'/',2)=r.id::text || '.pdf'
      and r.user_id=split_part(name,'/',1)::uuid
  )
);
