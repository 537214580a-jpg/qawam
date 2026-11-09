create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create type public.app_role as enum ('client','specialist','clinic_admin','super_admin');
create type public.goal_type as enum ('cut','bulk','maintain');
create type public.subscription_status as enum ('trialing','active','past_due','cancelled','expired');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', phone text, email text,
  role public.app_role not null default 'client', avatar_path text,
  locale text not null default 'ar', consent_health_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.clinics (
  id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null,
  logo_path text, brand_primary text not null default '#0B2E1F', brand_accent text not null default '#1FA971',
  plan_id uuid, owner_id uuid not null references public.profiles(id) on delete cascade, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.plans (
  id uuid primary key default gen_random_uuid(), name text unique not null, client_limit integer,
  price_sar numeric(10,2) not null default 0, interval text not null default 'month' check(interval in ('month','year')),
  features jsonb not null default '[]', audience text not null default 'clinic' check(audience in ('clinic','client')),
  is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.clinics add constraint clinics_plan_id_fkey foreign key(plan_id) references public.plans(id);
create table public.clinic_members (
  id uuid primary key default gen_random_uuid(), clinic_id uuid references public.clinics(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role public.app_role not null check(member_role in ('specialist','clinic_admin')),
  is_active boolean not null default true, invited_at timestamptz not null default now(), unique(clinic_id,user_id)
);
create table public.clients (
  id uuid primary key default gen_random_uuid(), clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  specialist_id uuid references public.profiles(id) on delete set null,
  birth_date date, sex text check(sex in ('male','female','other')), height_cm numeric(5,1),
  starting_weight_kg numeric(5,2), activity_level numeric(3,2) not null default 1.2,
  goal public.goal_type not null default 'maintain', bmr integer, tdee integer,
  target_calories integer, target_protein integer, target_carbs integer, target_fat integer,
  status text not null default 'on_track' check(status in ('on_track','lagging','attention')),
  last_activity_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.plan_templates (
  id uuid primary key default gen_random_uuid(), clinic_id uuid references public.clinics(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null, name text not null,
  goal public.goal_type not null default 'cut', calories integer not null, protein_g integer not null, carbs_g integer not null, fat_g integer not null,
  meal_suggestions jsonb not null default '[]', is_platform_template boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.plan_assignments (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id) on delete cascade,
  template_id uuid references public.plan_templates(id) on delete set null, assigned_by uuid references public.profiles(id) on delete set null,
  name text not null, calories integer not null, protein_g integer not null, carbs_g integer not null, fat_g integer not null,
  meal_suggestions jsonb not null default '[]', active boolean not null default true, sent_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table public.client_notes (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null, note text not null check(length(note) between 1 and 5000),
  created_at timestamptz not null default now()
);
create table public.foods (
  id uuid primary key default gen_random_uuid(), clinic_id uuid references public.clinics(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null, name_ar text not null, name_en text,
  calories numeric(7,2) not null default 0, protein_g numeric(7,2) not null default 0,
  carbs_g numeric(7,2) not null default 0, fat_g numeric(7,2) not null default 0,
  fiber_g numeric(7,2) not null default 0, serving_unit text not null default 'غ', is_public boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.recipes (
  id uuid primary key default gen_random_uuid(), clinic_id uuid references public.clinics(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, name text not null,
  servings numeric(6,2) not null default 1, is_usual boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.recipe_items (
  id uuid primary key default gen_random_uuid(), recipe_id uuid not null references public.recipes(id) on delete cascade,
  food_id uuid not null references public.foods(id), grams numeric(8,2) not null check(grams>0), created_at timestamptz not null default now()
);
create table public.meal_logs (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id) on delete cascade,
  logged_at timestamptz not null default now(), meal_type text not null default 'وجبة', photo_path text,
  note text, source text not null default 'manual', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.meal_items (
  id uuid primary key default gen_random_uuid(), meal_log_id uuid not null references public.meal_logs(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null, name text not null,
  grams numeric(8,2) not null check(grams>0), calories numeric(8,2) not null default 0,
  protein_g numeric(8,2) not null default 0, carbs_g numeric(8,2) not null default 0, fat_g numeric(8,2) not null default 0,
  specialist_comment text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.water_logs (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id) on delete cascade,
  amount_ml integer not null check(amount_ml between 1 and 5000), logged_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table public.weight_logs (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id) on delete cascade,
  weight_kg numeric(5,2) not null check(weight_kg between 20 and 500), logged_on date not null default current_date,
  note text, created_at timestamptz not null default now(), unique(client_id,logged_on)
);
create table public.measurements (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id) on delete cascade,
  measured_on date not null default current_date, waist_cm numeric(5,1), hip_cm numeric(5,1), chest_cm numeric(5,1), arm_cm numeric(5,1), thigh_cm numeric(5,1),
  photo_paths text[] not null default '{}', created_at timestamptz not null default now(), unique(client_id,measured_on)
);
create table public.checkins (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id) on delete cascade,
  week_start date not null, sleep_score smallint check(sleep_score between 1 and 10), hunger_score smallint check(hunger_score between 1 and 10),
  energy_score smallint check(energy_score between 1 and 10), adherence_pct smallint check(adherence_pct between 0 and 100), notes text,
  specialist_reply text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(client_id,week_start)
);
create table public.messages (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null, body text not null check(length(body) between 1 and 5000),
  meal_item_id uuid references public.meal_items(id) on delete set null, read_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null, body text not null, kind text not null, payload jsonb not null default '{}',
  scheduled_at timestamptz, sent_at timestamptz, read_at timestamptz, created_at timestamptz not null default now()
);
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete cascade, plan_id uuid not null references public.plans(id),
  status public.subscription_status not null default 'trialing', starts_at timestamptz not null default now(), ends_at timestamptz,
  renews_at timestamptz, moyasar_id text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((user_id is not null) <> (clinic_id is not null))
);
create table public.payments (
  id uuid primary key default gen_random_uuid(), subscription_id uuid references public.subscriptions(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null, clinic_id uuid references public.clinics(id) on delete set null,
  amount_sar numeric(10,2) not null, currency text not null default 'SAR', status text not null default 'initiated',
  moyasar_id text unique, invoice_url text, raw_event jsonb, paid_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.consents (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  consent_type text not null, version text not null, granted boolean not null, granted_at timestamptz not null default now(), revoked_at timestamptz,
  unique(user_id,consent_type,version)
);
create table public.audit_log (
  id bigint generated always as identity primary key, actor_id uuid references public.profiles(id) on delete set null,
  clinic_id uuid references public.clinics(id) on delete set null, action text not null, entity text not null,
  entity_id text, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique, p256dh text not null, auth text not null, created_at timestamptz not null default now()
);
create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  meal_enabled boolean not null default true, meal_time time not null default '08:00',
  water_enabled boolean not null default true, water_time time not null default '10:00',
  weighin_enabled boolean not null default true, weighin_weekday smallint not null default 1 check(weighin_weekday between 0 and 6),
  last_meal_sent_on date, last_water_sent_on date, last_weighin_sent_on date,
  updated_at timestamptz not null default now()
);

create index clients_clinic_status_idx on public.clients(clinic_id,status);
create index meal_logs_client_time_idx on public.meal_logs(client_id,logged_at desc);
create index weight_logs_client_date_idx on public.weight_logs(client_id,logged_on desc);
create index messages_client_time_idx on public.messages(client_id,created_at);
create index notifications_user_time_idx on public.notifications(user_id,created_at desc);
create index subscriptions_status_end_idx on public.subscriptions(status,ends_at);
create index foods_name_ar_idx on public.foods using gin(to_tsvector('simple',name_ar));
create unique index foods_global_name_unique_idx on public.foods(name_ar) where clinic_id is null;
create index checkins_client_week_idx on public.checkins(client_id,week_start desc);
create index audit_log_clinic_time_idx on public.audit_log(clinic_id,created_at desc);

create or replace function private.touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
create or replace function private.current_role() returns public.app_role language sql stable security definer set search_path='' as $$
  select role from public.profiles where id=(select auth.uid())
$$;
create or replace function private.is_clinic_member(target uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.clinic_members m where m.clinic_id=target and m.user_id=(select auth.uid()) and m.is_active)
  or exists(select 1 from public.clinics c where c.id=target and c.owner_id=(select auth.uid()))
$$;
create or replace function private.can_access_client(target uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.clients c where c.id=target and (c.user_id=(select auth.uid()) or c.specialist_id=(select auth.uid()) or private.is_clinic_member(c.clinic_id)))
  or private.current_role()='super_admin'
$$;
revoke all on function private.current_role() from public;
revoke all on function private.is_clinic_member(uuid) from public;
revoke all on function private.can_access_client(uuid) from public;
grant execute on function private.current_role(), private.is_clinic_member(uuid), private.can_access_client(uuid) to authenticated;

create or replace function private.create_profile_for_auth_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,email,phone,full_name,role) values(new.id,new.email,new.phone,coalesce(new.raw_user_meta_data->>'full_name',''),'client') on conflict(id) do nothing;
  return new;
end $$;
create or replace function private.enforce_clinic_client_limit() returns trigger language plpgsql security definer set search_path='' as $$
declare lim integer; used integer;
begin
  if new.clinic_id is null then return new; end if;
  select p.client_limit into lim from public.clinics c left join public.plans p on p.id=c.plan_id where c.id=new.clinic_id;
  if lim is null then return new; end if;
  select count(*) into used from public.clients c where c.clinic_id=new.clinic_id and (tg_op='INSERT' or c.id<>new.id);
  if used >= lim then raise exception 'clinic client limit reached'; end if;
  return new;
end $$;
create trigger enforce_clinic_client_limit before insert or update of clinic_id on public.clients for each row execute function private.enforce_clinic_client_limit();
create or replace function private.touch_client_activity() returns trigger language plpgsql security definer set search_path='' as $$
begin update public.clients set last_activity_at=now(),status='on_track' where id=new.client_id; return new; end $$;
create trigger meal_log_activity after insert on public.meal_logs for each row execute function private.touch_client_activity();
create or replace function private.log_audit_change() returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; target_clinic uuid; target_id text;
begin
  payload=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  target_id=payload->>'id';
  target_clinic=nullif(payload->>'clinic_id','')::uuid;
  if target_clinic is null and payload ? 'client_id' then select clinic_id into target_clinic from public.clients where id=(payload->>'client_id')::uuid; end if;
  insert into public.audit_log(actor_id,clinic_id,action,entity,entity_id,metadata)
  values((select auth.uid()),target_clinic,tg_op,tg_table_name,target_id,jsonb_build_object('changed_at',now()));
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
create trigger audit_client_changes after insert or update or delete on public.clients for each row execute function private.log_audit_change();
create trigger audit_plan_assignments after insert or update or delete on public.plan_assignments for each row execute function private.log_audit_change();
create trigger audit_client_notes after insert or update or delete on public.client_notes for each row execute function private.log_audit_change();
create trigger on_auth_user_created after insert on auth.users for each row execute function private.create_profile_for_auth_user();

do $$ declare t text; begin
  foreach t in array array['profiles','clinics','plans','clients','plan_templates','foods','recipes','meal_logs','meal_items','checkins','subscriptions','payments'] loop
    execute format('create trigger touch_%I before update on public.%I for each row execute function private.touch_updated_at()',t,t);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.clinics enable row level security;
alter table public.clinic_members enable row level security;
alter table public.clients enable row level security;
alter table public.plans enable row level security;
alter table public.plan_templates enable row level security;
alter table public.plan_assignments enable row level security;
alter table public.client_notes enable row level security;
alter table public.foods enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_items enable row level security;
alter table public.meal_logs enable row level security;
alter table public.meal_items enable row level security;
alter table public.water_logs enable row level security;
alter table public.weight_logs enable row level security;
alter table public.measurements enable row level security;
alter table public.checkins enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.consents enable row level security;
alter table public.audit_log enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_preferences enable row level security;

create policy profile_read on public.profiles for select to authenticated using(id=(select auth.uid()) or private.current_role()='super_admin');
create policy profile_read_clinic on public.profiles for select to authenticated using(exists(select 1 from public.clients c where c.user_id=profiles.id and private.is_clinic_member(c.clinic_id)));
create policy profile_insert on public.profiles for insert to authenticated with check(id=(select auth.uid()) and role='client');
create policy profile_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()) and role=private.current_role());
create policy clinics_read on public.clinics for select to authenticated using(owner_id=(select auth.uid()) or private.is_clinic_member(id) or private.current_role()='super_admin');
create policy clinics_read_client on public.clinics for select to authenticated using(exists(select 1 from public.clients c where c.clinic_id=clinics.id and c.user_id=(select auth.uid())));
create policy clinics_insert on public.clinics for insert to authenticated with check(owner_id=(select auth.uid()) and private.current_role() in ('clinic_admin','super_admin'));
create policy clinics_update on public.clinics for update to authenticated using(owner_id=(select auth.uid()) or (private.is_clinic_member(id) and private.current_role()='clinic_admin') or private.current_role()='super_admin') with check(owner_id=(select auth.uid()) or (private.is_clinic_member(id) and private.current_role()='clinic_admin') or private.current_role()='super_admin');
create policy members_read on public.clinic_members for select to authenticated using(user_id=(select auth.uid()) or private.is_clinic_member(clinic_id) or private.current_role()='super_admin');
create policy members_manage on public.clinic_members for all to authenticated using(private.is_clinic_member(clinic_id) and private.current_role() in ('clinic_admin','super_admin')) with check(private.is_clinic_member(clinic_id) and private.current_role() in ('clinic_admin','super_admin'));
create policy plans_read on public.plans for select to authenticated using(is_active or private.current_role()='super_admin');
create policy plans_manage on public.plans for all to authenticated using(private.current_role()='super_admin') with check(private.current_role()='super_admin');
create policy clients_read on public.clients for select to authenticated using(user_id=(select auth.uid()) or specialist_id=(select auth.uid()) or private.is_clinic_member(clinic_id) or private.current_role()='super_admin');
create policy clients_insert on public.clients for insert to authenticated with check(user_id=(select auth.uid()) or (private.is_clinic_member(clinic_id) and private.current_role() in ('clinic_admin','specialist','super_admin')));
create policy clients_update on public.clients for update to authenticated using(private.is_clinic_member(clinic_id) or private.current_role()='super_admin') with check(private.is_clinic_member(clinic_id) or private.current_role()='super_admin');

create policy template_read on public.plan_templates for select to authenticated using(is_platform_template or private.is_clinic_member(clinic_id) or created_by=(select auth.uid()));
create policy template_manage on public.plan_templates for all to authenticated using(created_by=(select auth.uid()) or private.is_clinic_member(clinic_id) or private.current_role()='super_admin') with check(created_by=(select auth.uid()) or private.is_clinic_member(clinic_id) or private.current_role()='super_admin');
create policy assignments_access on public.plan_assignments for all to authenticated using(private.can_access_client(client_id)) with check(private.can_access_client(client_id) and (assigned_by=(select auth.uid()) or private.current_role()='super_admin'));
create policy client_notes_access on public.client_notes for all to authenticated using(private.is_clinic_member((select clinic_id from public.clients where id=client_id)) or private.current_role()='super_admin') with check(private.is_clinic_member((select clinic_id from public.clients where id=client_id)) and author_id=(select auth.uid()));
create policy foods_read on public.foods for select to authenticated using(is_public or created_by=(select auth.uid()) or private.is_clinic_member(clinic_id));
create policy foods_manage on public.foods for all to authenticated using(created_by=(select auth.uid()) or private.is_clinic_member(clinic_id) or private.current_role()='super_admin') with check(created_by=(select auth.uid()) or private.is_clinic_member(clinic_id) or private.current_role()='super_admin');
create policy recipes_read on public.recipes for select to authenticated using(user_id=(select auth.uid()) or private.is_clinic_member(clinic_id));
create policy recipes_manage on public.recipes for all to authenticated using(user_id=(select auth.uid()) or private.is_clinic_member(clinic_id)) with check(user_id=(select auth.uid()) or private.is_clinic_member(clinic_id));
create policy recipe_items_access on public.recipe_items for all to authenticated using(exists(select 1 from public.recipes r where r.id=recipe_id and (r.user_id=(select auth.uid()) or private.is_clinic_member(r.clinic_id)))) with check(exists(select 1 from public.recipes r where r.id=recipe_id and (r.user_id=(select auth.uid()) or private.is_clinic_member(r.clinic_id))));
create policy meal_logs_access on public.meal_logs for all to authenticated using(private.can_access_client(client_id)) with check(private.can_access_client(client_id));
create policy meal_items_access on public.meal_items for all to authenticated using(exists(select 1 from public.meal_logs l where l.id=meal_log_id and private.can_access_client(l.client_id))) with check(exists(select 1 from public.meal_logs l where l.id=meal_log_id and private.can_access_client(l.client_id)));
create policy water_logs_access on public.water_logs for all to authenticated using(private.can_access_client(client_id)) with check(private.can_access_client(client_id));
create policy weight_logs_access on public.weight_logs for all to authenticated using(private.can_access_client(client_id)) with check(private.can_access_client(client_id));
create policy measurements_access on public.measurements for all to authenticated using(private.can_access_client(client_id)) with check(private.can_access_client(client_id));
create policy checkins_access on public.checkins for all to authenticated using(private.can_access_client(client_id)) with check(private.can_access_client(client_id));
create policy messages_access on public.messages for all to authenticated using(private.can_access_client(client_id)) with check(private.can_access_client(client_id) and sender_id=(select auth.uid()));
create policy notifications_access on public.notifications for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy subscriptions_access on public.subscriptions for select to authenticated using(user_id=(select auth.uid()) or (clinic_id is not null and private.is_clinic_member(clinic_id)) or private.current_role()='super_admin');
create policy subscriptions_admin_manage on public.subscriptions for all to authenticated using(private.current_role()='super_admin') with check(private.current_role()='super_admin');
create policy payments_access on public.payments for select to authenticated using(user_id=(select auth.uid()) or (clinic_id is not null and private.is_clinic_member(clinic_id)) or private.current_role()='super_admin');
create policy consents_access on public.consents for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy audit_read on public.audit_log for select to authenticated using(private.current_role()='super_admin' or (clinic_id is not null and private.is_clinic_member(clinic_id)));
create policy push_access on public.push_subscriptions for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy notification_preferences_access on public.notification_preferences for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

grant select,insert,update,delete on all tables in schema public to authenticated;
grant usage,select on all sequences in schema public to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('qawam-private','qawam-private',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do nothing;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('clinic-branding','clinic-branding',true,5242880,array['image/jpeg','image/png','image/webp','image/svg+xml'])
on conflict(id) do nothing;
create policy storage_own_folder_read on storage.objects for select to authenticated using(bucket_id='qawam-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy storage_own_folder_insert on storage.objects for insert to authenticated with check(bucket_id='qawam-private' and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.consent_health_at is not null));
create policy storage_own_folder_update on storage.objects for update to authenticated using(bucket_id='qawam-private' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='qawam-private' and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.consent_health_at is not null));
create policy storage_own_folder_delete on storage.objects for delete to authenticated using(bucket_id='qawam-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy branding_public_read on storage.objects for select to anon,authenticated using(bucket_id='clinic-branding');
create policy branding_member_insert on storage.objects for insert to authenticated with check(bucket_id='clinic-branding' and private.is_clinic_member(((storage.foldername(name))[1])::uuid));
create policy branding_member_update on storage.objects for update to authenticated using(bucket_id='clinic-branding' and private.is_clinic_member(((storage.foldername(name))[1])::uuid)) with check(bucket_id='clinic-branding' and private.is_clinic_member(((storage.foldername(name))[1])::uuid));
create policy branding_member_delete on storage.objects for delete to authenticated using(bucket_id='clinic-branding' and private.is_clinic_member(((storage.foldername(name))[1])::uuid));

alter publication supabase_realtime add table public.messages;
insert into public.plans(name,client_limit,price_sar,interval,features,audience) values
('20 عميل',20,99,'month','["إدارة العملاء","تقارير PDF"]','clinic'),('50 عميل',50,199,'month','["إدارة الفريق","تقارير PDF","تحليلات"]','clinic'),('غير محدود',null,399,'month','["كل المزايا","علامة بيضاء"]','clinic'),
('اشتراك عميل شهري',null,149,'month','["متابعة غذائية","سجل وجبات","تقييم أسبوعي"]','client'),('اشتراك عميل 3 أشهر',null,399,'month','["متابعة غذائية","سجل وجبات","تقييم أسبوعي"]','client')
on conflict(name) do nothing;
insert into public.plan_templates(created_by,name,goal,calories,protein_g,carbs_g,fat_g,meal_suggestions,is_platform_template)
select null,v.name,v.goal,v.calories,v.protein,v.carbs,v.fat,v.meals,true from (values
('خفض الوزن - نموذج','cut',1700,140,175,55,'[{"meal":"إفطار","items":["بيض","خبز كامل"]},{"meal":"غداء","items":["دجاج","أرز","سلطة"]},{"meal":"عشاء","items":["سمك","بطاطس","خضار"]}]'::jsonb),
('زيادة الوزن - نموذج','bulk',2800,170,350,85,'[{"meal":"إفطار","items":["شوفان","حليب","موز"]},{"meal":"غداء","items":["كبسة دجاج","سلطة"]},{"meal":"وجبة خفيفة","items":["زبادي","تمر"]}]'::jsonb),
('إنقاص الوزن - نموذج','cut',1900,150,195,60,'[{"meal":"إفطار","items":["لبنة","خبز","خضار"]},{"meal":"غداء","items":["شاورما دجاج","أرز"]},{"meal":"عشاء","items":["تونة","بطاطس"]}]'::jsonb),
('رياضي - نموذج','maintain',2600,180,320,75,'[{"meal":"قبل التمرين","items":["موز","زبادي"]},{"meal":"بعد التمرين","items":["دجاج","أرز"]},{"meal":"عشاء","items":["سمك","بطاطس"]}]'::jsonb),
('متوازن لمرضى السكري - نموذج','maintain',1800,120,180,65,'[{"meal":"إفطار","items":["بيض","خبز كامل","خضار"]},{"meal":"غداء","items":["دجاج","أرز","سلطة"]},{"meal":"عشاء","items":["زبادي","مكسرات"]}]'::jsonb)
) as v(name,goal,calories,protein,carbs,fat,meals)
where not exists(select 1 from public.plan_templates t where t.name=v.name and t.is_platform_template);
