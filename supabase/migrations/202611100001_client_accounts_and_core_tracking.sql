-- Compatibility migration for the already-provisioned QAWAM Supabase project.
-- Keeps existing clinic, membership, and client records intact.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  email text,
  role text not null default 'client' check (role in ('client','specialist','clinic_admin','super_admin')),
  avatar_path text,
  consent_health_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
grant select on public.profiles to authenticated;
grant update(full_name, phone, avatar_path, consent_health_at) on public.profiles to authenticated;
drop policy if exists qawam_profiles_self_read on public.profiles;
create policy qawam_profiles_self_read on public.profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists qawam_profiles_self_update on public.profiles;
create policy qawam_profiles_self_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create or replace function private.create_qawam_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles(id, email, full_name, role)
  values(new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''), 'client')
  on conflict(id) do update set email = excluded.email;
  return new;
end;
$$;
revoke all on function private.create_qawam_profile() from public, anon, authenticated;
drop trigger if exists qawam_profile_on_signup on auth.users;
create trigger qawam_profile_on_signup after insert on auth.users for each row execute function private.create_qawam_profile();

insert into public.profiles(id,email,full_name,role)
select u.id,u.email,coalesce(up.full_name,''),'client'
from auth.users u left join public.user_profiles up on up.user_id=u.id
on conflict(id) do update set email=excluded.email,
full_name=case when public.profiles.full_name='' then excluded.full_name else public.profiles.full_name end;

alter table public.clients add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.clients add column if not exists birth_date date;
alter table public.clients add column if not exists height_cm numeric(5,1);
alter table public.clients add column if not exists starting_weight_kg numeric(6,2);
alter table public.clients add column if not exists activity_level numeric(4,3) not null default 1.2;
alter table public.clients add column if not exists goal text not null default 'maintain';
alter table public.clients add column if not exists bmr integer;
alter table public.clients add column if not exists tdee integer;
alter table public.clients add column if not exists target_calories integer;
alter table public.clients add column if not exists target_protein integer;
alter table public.clients add column if not exists target_carbs integer;
alter table public.clients add column if not exists target_fat integer;
create unique index if not exists clients_user_id_unique_idx on public.clients(user_id) where user_id is not null;
create index if not exists clients_user_id_idx on public.clients(user_id);
grant select on public.clients to authenticated;
drop policy if exists qawam_clients_self_read on public.clients;
create policy qawam_clients_self_read on public.clients for select to authenticated using (user_id = (select auth.uid()));

create or replace function private.can_access_client(p_client_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((select auth.uid() is not null), false) and exists (
    select 1 from public.clients c
    where c.id = p_client_id
      and (c.user_id = (select auth.uid())
        or c.assigned_staff_user_id = (select auth.uid())
        or public.is_clinic_member(c.clinic_id))
  );
$$;
revoke all on function private.can_access_client(uuid) from public, anon;
grant execute on function private.can_access_client(uuid) to authenticated;

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null,
  version text not null,
  granted boolean not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique(user_id,consent_type,version)
);
alter table public.consents enable row level security;
grant select,insert,update on public.consents to authenticated;
drop policy if exists qawam_consents_self on public.consents;
create policy qawam_consents_self on public.consents for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  name_ar text not null,
  name_en text,
  calories numeric(8,2) not null default 0,
  protein_g numeric(8,2) not null default 0,
  carbs_g numeric(8,2) not null default 0,
  fat_g numeric(8,2) not null default 0,
  fiber_g numeric(8,2) not null default 0,
  source text not null default 'QAWAM reference data',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  servings numeric(6,2) not null default 1 check(servings>0),
  is_usual boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null,
  name text not null default '',
  grams numeric(8,2) not null check(grams>0),
  created_at timestamptz not null default now()
);
create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  logged_at timestamptz not null default now(),
  meal_type text not null default 'وجبة',
  photo_path text,
  note text,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);
create table if not exists public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_log_id uuid not null references public.meal_logs(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null,
  name text not null,
  grams numeric(8,2) not null check(grams>0),
  calories numeric(8,2) not null default 0,
  protein_g numeric(8,2) not null default 0,
  carbs_g numeric(8,2) not null default 0,
  fat_g numeric(8,2) not null default 0,
  specialist_comment text,
  created_at timestamptz not null default now()
);
create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  amount_ml integer not null check(amount_ml between 1 and 5000),
  logged_at timestamptz not null default now()
);
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  weight_kg numeric(5,2) not null check(weight_kg between 20 and 500),
  logged_on date not null default current_date,
  note text,
  unique(client_id,logged_on)
);
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  week_start date not null,
  sleep_score smallint check(sleep_score between 1 and 10),
  hunger_score smallint check(hunger_score between 1 and 10),
  energy_score smallint check(energy_score between 1 and 10),
  adherence_pct smallint check(adherence_pct between 0 and 100),
  notes text,
  specialist_reply text,
  created_at timestamptz not null default now(),
  unique(client_id,week_start)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  body text not null check(length(body) between 1 and 5000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.plan_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  name text not null,
  calories integer not null,
  protein_g integer not null,
  carbs_g integer not null,
  fat_g integer not null,
  meal_suggestions jsonb not null default '[]',
  active boolean not null default true,
  sent_at timestamptz not null default now()
);
create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  note text not null check(length(note) between 1 and 5000),
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['foods','recipes','recipe_items','meal_logs','meal_items','water_logs','weight_logs','checkins','messages','plan_assignments','client_notes'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  end loop;
end;
$$;

drop policy if exists qawam_foods_read on public.foods;
create policy qawam_foods_read on public.foods for select to authenticated using (
  is_public or created_by=(select auth.uid()) or
  (clinic_id is not null and public.is_clinic_member(clinic_id)) or
  exists(select 1 from public.clients c where c.user_id=(select auth.uid()) and c.clinic_id=foods.clinic_id)
);
drop policy if exists qawam_foods_manage on public.foods;
create policy qawam_foods_manage on public.foods for all to authenticated using (
  created_by=(select auth.uid()) or (clinic_id is not null and public.has_clinic_permission(clinic_id,'foods.manage'))
) with check (
  created_by=(select auth.uid()) or (clinic_id is not null and public.has_clinic_permission(clinic_id,'foods.manage'))
);
drop policy if exists qawam_recipes_access on public.recipes;
create policy qawam_recipes_access on public.recipes for all to authenticated using (
  user_id=(select auth.uid()) or (clinic_id is not null and public.is_clinic_member(clinic_id))
) with check (
  user_id=(select auth.uid()) or (clinic_id is not null and public.is_clinic_member(clinic_id))
);
drop policy if exists qawam_recipe_items_access on public.recipe_items;
create policy qawam_recipe_items_access on public.recipe_items for all to authenticated using (
  exists(select 1 from public.recipes r where r.id=recipe_id and (r.user_id=(select auth.uid()) or (r.clinic_id is not null and public.is_clinic_member(r.clinic_id))))
) with check (
  exists(select 1 from public.recipes r where r.id=recipe_id and (r.user_id=(select auth.uid()) or (r.clinic_id is not null and public.is_clinic_member(r.clinic_id))))
);
drop policy if exists qawam_meal_logs_access on public.meal_logs;
create policy qawam_meal_logs_access on public.meal_logs for all to authenticated using(private.can_access_client(client_id)) with check(private.can_access_client(client_id));
drop policy if exists qawam_meal_items_access on public.meal_items;
create policy qawam_meal_items_access on public.meal_items for all to authenticated using (
  exists(select 1 from public.meal_logs l where l.id=meal_log_id and private.can_access_client(l.client_id))
) with check (
  exists(select 1 from public.meal_logs l where l.id=meal_log_id and private.can_access_client(l.client_id))
);
drop policy if exists qawam_water_access on public.water_logs;
create policy qawam_water_access on public.water_logs for all to authenticated using(private.can_access_client(client_id)) with check(private.can_access_client(client_id));
drop policy if exists qawam_weight_access on public.weight_logs;
create policy qawam_weight_access on public.weight_logs for all to authenticated using(private.can_access_client(client_id)) with check(private.can_access_client(client_id));
drop policy if exists qawam_checkins_access on public.checkins;
create policy qawam_checkins_access on public.checkins for all to authenticated using(private.can_access_client(client_id)) with check(private.can_access_client(client_id));
drop policy if exists qawam_messages_access on public.messages;
create policy qawam_messages_access on public.messages for all to authenticated using(private.can_access_client(client_id)) with check(private.can_access_client(client_id) and sender_id=(select auth.uid()));
drop policy if exists qawam_assignments_access on public.plan_assignments;
create policy qawam_assignments_access on public.plan_assignments for all to authenticated using(private.can_access_client(client_id)) with check(private.can_access_client(client_id) and (assigned_by=(select auth.uid()) or assigned_by is null));
drop policy if exists qawam_client_notes_access on public.client_notes;
create policy qawam_client_notes_access on public.client_notes for all to authenticated using (
  exists(select 1 from public.clients c where c.id=client_id and (public.is_clinic_member(c.clinic_id) or public.has_clinic_permission(c.clinic_id,'clients.manage')))
) with check (
  exists(select 1 from public.clients c where c.id=client_id and public.has_clinic_permission(c.clinic_id,'clients.manage')) and author_id=(select auth.uid())
);

create index if not exists qawam_meal_logs_client_time_idx on public.meal_logs(client_id,logged_at desc);
create index if not exists qawam_weight_logs_client_date_idx on public.weight_logs(client_id,logged_on desc);
create index if not exists qawam_messages_client_time_idx on public.messages(client_id,created_at);

revoke execute on function public.audit_row_change() from public, anon, authenticated;
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.seed_clinic_defaults() from public, anon, authenticated;
revoke execute on function public.create_clinic(text,text) from public, anon;
revoke execute on function public.has_clinic_permission(uuid,text) from public, anon;
revoke execute on function public.is_clinic_member(uuid) from public, anon;


alter table public.clinics add column if not exists logo_path text;
alter table public.clinics add column if not exists brand_primary text not null default '#0B2E1F';
alter table public.clinics add column if not exists brand_accent text not null default '#1FA971';

alter table public.measurements add column if not exists measured_on date not null default current_date;
alter table public.measurements add column if not exists waist_cm numeric(5,1);
alter table public.measurements add column if not exists hip_cm numeric(5,1);
alter table public.measurements add column if not exists chest_cm numeric(5,1);
alter table public.measurements add column if not exists arm_cm numeric(5,1);
alter table public.measurements add column if not exists thigh_cm numeric(5,1);
alter table public.measurements add column if not exists photo_paths text[] not null default '{}';
create unique index if not exists qawam_measurements_client_day_idx on public.measurements(client_id,measured_on);

create table if not exists public.usual_meals (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null,
 items jsonb not null default '[]',
 meal_type text not null default 'وجبة',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.plan_templates (
 id uuid primary key default gen_random_uuid(),
 clinic_id uuid references public.clinics(id) on delete cascade,
 created_by uuid references auth.users(id) on delete set null,
 name text not null,
 goal text not null default 'cut',
 calories integer not null,
 protein_g integer not null,
 carbs_g integer not null,
 fat_g integer not null,
 meal_suggestions jsonb not null default '[]',
 is_platform_template boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.plans (
 id uuid primary key default gen_random_uuid(),
 name text unique not null,
 client_limit integer,
 price_sar numeric(10,2) not null default 0,
 interval text not null default 'month' check(interval in ('month','year')),
 features jsonb not null default '[]',
 audience text not null default 'clinic' check(audience in ('clinic','client')),
 is_active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid references auth.users(id) on delete cascade,
 clinic_id uuid references public.clinics(id) on delete cascade,
 plan_id uuid not null references public.plans(id),
 status text not null default 'trialing',
 starts_at timestamptz not null default now(),
 ends_at timestamptz,
 renews_at timestamptz,
 moyasar_id text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check ((user_id is not null) <> (clinic_id is not null))
);
create table if not exists public.payments (
 id uuid primary key default gen_random_uuid(),
 subscription_id uuid references public.subscriptions(id) on delete set null,
 user_id uuid references auth.users(id) on delete set null,
 clinic_id uuid references public.clinics(id) on delete set null,
 amount_sar numeric(10,2) not null,
 currency text not null default 'SAR',
 status text not null default 'initiated',
 moyasar_id text unique,
 invoice_url text,
 raw_event jsonb,
 paid_at timestamptz,
 created_at timestamptz not null default now()
);
create table if not exists public.push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique,
 p256dh text not null,
 auth text not null,
 created_at timestamptz not null default now()
);
create table if not exists public.audit_log (
 id bigint generated always as identity primary key,
 actor_id uuid references auth.users(id) on delete set null,
 clinic_id uuid references public.clinics(id) on delete set null,
 action text not null,
 entity text not null,
 entity_id text,
 metadata jsonb not null default '{}',
 created_at timestamptz not null default now()
);

alter table public.notifications add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.notifications add column if not exists kind text;
alter table public.notifications add column if not exists payload jsonb not null default '{}';
create index if not exists qawam_notifications_user_time_idx on public.notifications(user_id,created_at desc);

do $$
declare t text;
begin
 foreach t in array array['usual_meals','plan_templates','plans','subscriptions','payments','push_subscriptions','audit_log'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 end loop;
end;
$$;

drop policy if exists qawam_usual_meals_access on public.usual_meals;
create policy qawam_usual_meals_access on public.usual_meals for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists qawam_templates_access on public.plan_templates;
create policy qawam_templates_access on public.plan_templates for select to authenticated using(is_platform_template or created_by=(select auth.uid()) or (clinic_id is not null and public.is_clinic_member(clinic_id)));
drop policy if exists qawam_templates_manage on public.plan_templates;
create policy qawam_templates_manage on public.plan_templates for all to authenticated using(created_by=(select auth.uid()) or (clinic_id is not null and public.has_clinic_permission(clinic_id,'plans.manage'))) with check(created_by=(select auth.uid()) or (clinic_id is not null and public.has_clinic_permission(clinic_id,'plans.manage')));
drop policy if exists qawam_plans_read on public.plans;
create policy qawam_plans_read on public.plans for select to authenticated using(is_active);
drop policy if exists qawam_subscriptions_access on public.subscriptions;
create policy qawam_subscriptions_access on public.subscriptions for select to authenticated using(user_id=(select auth.uid()) or (clinic_id is not null and public.is_clinic_member(clinic_id)));
drop policy if exists qawam_payments_access on public.payments;
create policy qawam_payments_access on public.payments for select to authenticated using(user_id=(select auth.uid()) or (clinic_id is not null and public.is_clinic_member(clinic_id)));
drop policy if exists qawam_push_access on public.push_subscriptions;
create policy qawam_push_access on public.push_subscriptions for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists qawam_audit_read on public.audit_log;
create policy qawam_audit_read on public.audit_log for select to authenticated using(clinic_id is not null and public.has_clinic_permission(clinic_id,'audit.read'));
drop policy if exists qawam_notifications_self on public.notifications;
create policy qawam_notifications_self on public.notifications for select to authenticated using(user_id=(select auth.uid()) or recipient_user_id=(select auth.uid()));
drop policy if exists qawam_notifications_update_self on public.notifications;
create policy qawam_notifications_update_self on public.notifications for update to authenticated using(user_id=(select auth.uid()) or recipient_user_id=(select auth.uid())) with check(user_id=(select auth.uid()) or recipient_user_id=(select auth.uid()));

create index if not exists qawam_meal_items_log_idx on public.meal_items(meal_log_id);
create index if not exists qawam_checkins_client_week_idx on public.checkins(client_id,week_start desc);
create index if not exists qawam_usual_meals_user_idx on public.usual_meals(user_id);
create index if not exists qawam_push_user_idx on public.push_subscriptions(user_id);
