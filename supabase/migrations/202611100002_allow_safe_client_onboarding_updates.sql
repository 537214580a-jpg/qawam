-- Let an authenticated client update only their own onboarding fields.
-- The RLS policy keeps clinic ownership and account linkage immutable from the client portal.
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'clients_user_id_unique_key'
      and conrelid = 'public.clients'::regclass
  ) then
    alter table public.clients add constraint clients_user_id_unique_key unique (user_id);
  end if;
end $$;

revoke update on table public.clients from authenticated;
grant update (birth_date, sex, height_cm, starting_weight_kg, activity_level, goal, bmr, tdee, target_calories, target_protein, target_carbs, target_fat)
  on table public.clients to authenticated;

drop policy if exists qawam_clients_self_update on public.clients;
create policy qawam_clients_self_update
  on public.clients for update to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()))
  with check ((select auth.uid()) is not null and user_id = (select auth.uid()));
