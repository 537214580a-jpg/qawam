create or replace function private.health_user_write_access()
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.consent_health_at is not null)
    and exists (select 1 from public.clients c where c.user_id=(select auth.uid()))
    and coalesce((
      select s.status in ('active','trialing','past_due') and (s.ends_at is null or s.ends_at > now())
      from public.subscriptions s where s.user_id=(select auth.uid())
      order by s.starts_at desc, s.created_at desc limit 1
    ), true);
$$;

create or replace function private.health_client_write_access(p_client_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.health_user_write_access()
    and exists (select 1 from public.clients c where c.id=p_client_id and c.user_id=(select auth.uid()));
$$;

revoke all on function private.health_user_write_access() from public, anon;
revoke all on function private.health_client_write_access(uuid) from public, anon;
grant execute on function private.health_user_write_access() to authenticated;
grant execute on function private.health_client_write_access(uuid) to authenticated;

create table public.health_conditions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  condition_code text not null check (condition_code in ('diabetes','hypertension','heart_disease','high_cholesterol','insulin_resistance','kidney_disease','food_allergy','pcos','other')),
  details text not null default '' check (char_length(details) <= 3000),
  status text not null default 'active' check (status in ('active','resolved')),
  diagnosed_on date,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index health_conditions_client_created_idx on public.health_conditions(client_id, created_at desc);
create unique index health_conditions_one_active_code on public.health_conditions(client_id, condition_code) where status='active';

create table public.health_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  uploaded_by uuid not null default auth.uid() references auth.users(id),
  storage_path text not null unique,
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  document_type text not null check (document_type in ('lab_result','medical_report','prescription','other')),
  content_type text not null check (content_type in ('application/pdf','image/jpeg','image/png','image/webp')),
  byte_size integer not null check (byte_size between 1 and 10485760),
  document_date date,
  created_at timestamptz not null default now(),
  check (storage_path like uploaded_by::text || '/health/%')
);
create index health_documents_client_date_idx on public.health_documents(client_id, document_date desc nulls last, created_at desc);

create table public.lab_results (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  document_id uuid references public.health_documents(id) on delete set null,
  test_name text not null check (char_length(test_name) between 1 and 160),
  result_value text not null check (char_length(result_value) between 1 and 160),
  unit text not null default '' check (char_length(unit) <= 40),
  reference_range text not null default '' check (char_length(reference_range) <= 100),
  lab_name text not null default '' check (char_length(lab_name) <= 160),
  tested_on date,
  source text not null default 'manual' check (source in ('manual','document')),
  confirmed_at timestamptz not null default now(),
  confirmed_by uuid not null default auth.uid() references auth.users(id),
  supersedes_id uuid references public.lab_results(id) on delete set null,
  created_at timestamptz not null default now()
);
create index lab_results_client_date_idx on public.lab_results(client_id, tested_on desc nulls last, created_at desc);

create table public.health_readings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  reading_type text not null check (reading_type in ('glucose','blood_pressure','other')),
  value_primary numeric(10,2) not null check (value_primary >= 0 and value_primary <= 100000),
  value_secondary numeric(10,2) check (value_secondary is null or (value_secondary >= 0 and value_secondary <= 100000)),
  unit text not null check (char_length(unit) between 1 and 24),
  context text not null default '' check (char_length(context) <= 120),
  measured_at timestamptz not null default now(),
  notes text not null default '' check (char_length(notes) <= 1000),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
create index health_readings_client_time_idx on public.health_readings(client_id, measured_at desc);

alter table public.health_conditions enable row level security;
alter table public.health_documents enable row level security;
alter table public.lab_results enable row level security;
alter table public.health_readings enable row level security;

create policy health_conditions_read on public.health_conditions for select to authenticated
using (private.can_access_client(client_id) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='super_admin'));
create policy health_conditions_insert on public.health_conditions for insert to authenticated
with check (private.health_client_write_access(client_id) and created_by=(select auth.uid()));
create policy health_conditions_update on public.health_conditions for update to authenticated
using (private.health_client_write_access(client_id)) with check (private.health_client_write_access(client_id));

create policy health_documents_read on public.health_documents for select to authenticated
using (private.can_access_client(client_id) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='super_admin'));
create policy health_documents_insert on public.health_documents for insert to authenticated
with check (private.health_client_write_access(client_id) and uploaded_by=(select auth.uid()) and storage_path like (select auth.uid())::text || '/health/%');

create policy lab_results_read on public.lab_results for select to authenticated
using (private.can_access_client(client_id) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='super_admin'));
create policy lab_results_insert on public.lab_results for insert to authenticated
with check (private.health_client_write_access(client_id) and confirmed_by=(select auth.uid()));
create policy health_readings_read on public.health_readings for select to authenticated
using (private.can_access_client(client_id) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='super_admin'));
create policy health_readings_insert on public.health_readings for insert to authenticated
with check (private.health_client_write_access(client_id) and created_by=(select auth.uid()));

revoke all on public.health_conditions, public.health_documents, public.lab_results, public.health_readings from anon;
grant select,insert,update on public.health_conditions to authenticated;
grant select,insert on public.health_documents,public.lab_results,public.health_readings to authenticated;

create or replace function private.audit_health_record_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_clinic_id uuid;
begin
  select c.clinic_id into v_clinic_id from public.clients c where c.id=new.client_id;
  insert into public.audit_log(actor_id,clinic_id,action,entity,entity_id,metadata)
  values ((select auth.uid()),v_clinic_id,'health_record.'||lower(tg_op),tg_table_name,new.id::text,jsonb_build_object('client_id',new.client_id));
  return new;
end;
$$;
revoke all on function private.audit_health_record_change() from public,anon,authenticated;
create trigger health_conditions_audit after insert or update on public.health_conditions for each row execute function private.audit_health_record_change();
create trigger health_documents_audit after insert on public.health_documents for each row execute function private.audit_health_record_change();
create trigger lab_results_audit after insert on public.lab_results for each row execute function private.audit_health_record_change();
create trigger health_readings_audit after insert on public.health_readings for each row execute function private.audit_health_record_change();

update storage.buckets set public=false,file_size_limit=10485760,allowed_mime_types=array['image/jpeg','image/png','image/webp','application/pdf'] where id='qawam-private';
drop policy if exists qawam_meal_photos_insert on storage.objects;
create policy qawam_meal_photos_insert on storage.objects for insert to authenticated
with check (bucket_id='qawam-private' and split_part(name,'/',1)=(select auth.uid())::text
  and (split_part(name,'/',2)<>'health' or private.health_user_write_access()));
