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
      select
        (s.status in ('active', 'trialing') and (s.ends_at is null or s.ends_at > now()))
        or (
          s.status = 'past_due'
          and (
            (s.ends_at is not null and s.ends_at > now())
            or (s.ends_at is null and s.updated_at > now() - interval '7 days')
          )
        )
      from public.subscriptions s
      where s.user_id = (select auth.uid())
      order by s.starts_at desc, s.created_at desc
      limit 1
    ), true);
$function$;
