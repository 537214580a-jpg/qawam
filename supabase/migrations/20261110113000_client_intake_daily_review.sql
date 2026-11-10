alter table public.clients
  add column if not exists journey_start_date date;

alter table public.nutrition_profiles
  add column if not exists dietary_preferences text,
  add column if not exists disliked_foods text;

alter table public.daily_checkins
  add column if not exists client_review jsonb not null default '{}'::jsonb;

create policy "qawam_nutrition_profiles_self_select"
  on public.nutrition_profiles for select to authenticated
  using (exists (
    select 1 from public.clients c
    where c.id = nutrition_profiles.client_id
      and c.clinic_id = nutrition_profiles.clinic_id
      and c.user_id = (select auth.uid())
  ));

create policy "qawam_nutrition_profiles_self_insert"
  on public.nutrition_profiles for insert to authenticated
  with check (exists (
    select 1 from public.clients c
    where c.id = nutrition_profiles.client_id
      and c.clinic_id = nutrition_profiles.clinic_id
      and c.user_id = (select auth.uid())
  ));

create policy "qawam_nutrition_profiles_self_update"
  on public.nutrition_profiles for update to authenticated
  using (exists (
    select 1 from public.clients c
    where c.id = nutrition_profiles.client_id
      and c.clinic_id = nutrition_profiles.clinic_id
      and c.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.clients c
    where c.id = nutrition_profiles.client_id
      and c.clinic_id = nutrition_profiles.clinic_id
      and c.user_id = (select auth.uid())
  ));

create policy "qawam_daily_checkins_self_select"
  on public.daily_checkins for select to authenticated
  using (exists (
    select 1 from public.clients c
    where c.id = daily_checkins.client_id
      and c.clinic_id = daily_checkins.clinic_id
      and c.user_id = (select auth.uid())
  ));

create policy "qawam_daily_checkins_self_insert"
  on public.daily_checkins for insert to authenticated
  with check (exists (
    select 1 from public.clients c
    where c.id = daily_checkins.client_id
      and c.clinic_id = daily_checkins.clinic_id
      and c.user_id = (select auth.uid())
  ));

create policy "qawam_daily_checkins_self_update"
  on public.daily_checkins for update to authenticated
  using (exists (
    select 1 from public.clients c
    where c.id = daily_checkins.client_id
      and c.clinic_id = daily_checkins.clinic_id
      and c.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.clients c
    where c.id = daily_checkins.client_id
      and c.clinic_id = daily_checkins.clinic_id
      and c.user_id = (select auth.uid())
  ));

grant select, insert, update on public.nutrition_profiles to authenticated;
grant select, insert, update on public.daily_checkins to authenticated;