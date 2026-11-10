create or replace function private.health_user_write_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.consent_health_at is not null
    )
    and exists (
      select 1 from public.clients c
      where c.user_id = (select auth.uid())
    )
    and coalesce((
      select s.status in ('active', 'trialing', 'past_due')
        and (s.ends_at is null or s.ends_at > now())
      from public.subscriptions s
      where s.user_id = (select auth.uid())
      order by s.starts_at desc, s.created_at desc
      limit 1
    ), true);
$function$;

create or replace function private.enforce_subscription_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_client_id uuid;
  v_owner_id uuid;
  v_parent_id uuid;
begin
  if tg_table_name = 'clients' then
    if tg_op = 'UPDATE'
      and new.user_id = (select auth.uid())
      and not private.health_user_write_access() then
      raise exception using errcode = '42501', message = 'QAWAM_READ_ONLY_SUBSCRIPTION';
    end if;
    return new;
  elsif tg_table_name = 'recipes' then
    v_owner_id := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
    if v_owner_id = (select auth.uid()) and not private.health_user_write_access() then
      raise exception using errcode = '42501', message = 'QAWAM_READ_ONLY_SUBSCRIPTION';
    end if;
  elsif tg_table_name = 'recipe_items' then
    v_parent_id := case when tg_op = 'DELETE' then old.recipe_id else new.recipe_id end;
    select r.user_id into v_owner_id from public.recipes r where r.id = v_parent_id;
    if v_owner_id = (select auth.uid()) and not private.health_user_write_access() then
      raise exception using errcode = '42501', message = 'QAWAM_READ_ONLY_SUBSCRIPTION';
    end if;
  elsif tg_table_name = 'meal_items' then
    v_parent_id := case when tg_op = 'DELETE' then old.meal_log_id else new.meal_log_id end;
    select l.client_id into v_client_id from public.meal_logs l where l.id = v_parent_id;
    if exists (
      select 1 from public.clients c
      where c.id = v_client_id and c.user_id = (select auth.uid())
    ) and not private.health_user_write_access() then
      raise exception using errcode = '42501', message = 'QAWAM_READ_ONLY_SUBSCRIPTION';
    end if;
  else
    v_client_id := case when tg_op = 'DELETE' then old.client_id else new.client_id end;
    if exists (
      select 1 from public.clients c
      where c.id = v_client_id and c.user_id = (select auth.uid())
    ) and not private.health_user_write_access() then
      raise exception using errcode = '42501', message = 'QAWAM_READ_ONLY_SUBSCRIPTION';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;

do $migration$
declare
  v_table text;
begin
  foreach v_table in array array[
    'recipes',
    'recipe_items',
    'meal_logs',
    'meal_items',
    'water_logs',
    'weight_logs',
    'checkins',
    'messages',
    'measurements',
    'clients'
  ] loop
    execute format('drop trigger if exists subscription_guard_%I on public.%I', v_table, v_table);
    execute format(
      'create trigger subscription_guard_%I before insert or update or delete on public.%I for each row execute function private.enforce_subscription_write()',
      v_table,
      v_table
    );
  end loop;
end;
$migration$;

drop policy if exists qawam_meal_photos_insert on storage.objects;
create policy qawam_meal_photos_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'qawam-private'
  and split_part(name, '/', 1) = (select auth.uid())::text
  and private.health_user_write_access()
);

drop policy if exists qawam_meal_photos_update on storage.objects;
create policy qawam_meal_photos_update
on storage.objects for update to authenticated
using (
  bucket_id = 'qawam-private'
  and split_part(name, '/', 1) = (select auth.uid())::text
  and private.health_user_write_access()
)
with check (
  bucket_id = 'qawam-private'
  and split_part(name, '/', 1) = (select auth.uid())::text
  and private.health_user_write_access()
);

drop policy if exists qawam_meal_photos_delete on storage.objects;
create policy qawam_meal_photos_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'qawam-private'
  and split_part(name, '/', 1) = (select auth.uid())::text
  and private.health_user_write_access()
);
