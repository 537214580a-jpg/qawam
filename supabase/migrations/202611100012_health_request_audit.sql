create or replace function private.audit_health_request_change()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  insert into public.audit_log(actor_id,clinic_id,action,entity,entity_id,metadata)
  values(
    (select auth.uid()),
    new.clinic_id,
    'health_record_request.'||lower(tg_op),
    'health_record_requests',
    new.id::text,
    jsonb_build_object('status',new.status,'include_originals',new.include_originals)
  );
  return new;
end;
$$;
revoke all on function private.audit_health_request_change() from public,anon,authenticated;
create trigger health_record_requests_audit
after insert or update on public.health_record_requests
for each row execute function private.audit_health_request_change();
