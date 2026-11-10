create or replace function public.approve_subscription_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_request public.subscription_requests%rowtype;
  v_plan public.plans%rowtype;
  v_existing public.subscriptions%rowtype;
  v_start timestamptz;
  v_end timestamptz;
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and role='super_admin') then
    raise exception 'غير مصرح';
  end if;
  select * into v_request from public.subscription_requests where id=p_request_id for update;
  if not found or v_request.status not in ('under_verification','receipt_received','awaiting_payment') then
    raise exception 'طلب الاشتراك غير جاهز للاعتماد';
  end if;
  select * into v_plan from public.plans where id=v_request.plan_id and audience='client' and is_active=true;
  if not found then raise exception 'الباقة لم تعد متاحة'; end if;
  select * into v_existing from public.subscriptions where user_id=v_request.user_id order by created_at desc limit 1 for update;
  v_start:=case when v_existing.id is not null and v_existing.status='active' and v_existing.ends_at>now() then v_existing.ends_at else now() end;
  v_end:=case when v_plan.interval='year' then v_start+interval '1 year' else v_start+interval '1 month' end;
  if v_existing.id is not null then
    update public.subscriptions set status='expired',updated_at=now() where id=v_existing.id and status='active';
  end if;
  insert into public.subscriptions(user_id,plan_id,status,starts_at,ends_at,renews_at)
  values(v_request.user_id,v_plan.id,'active',v_start,v_end,v_end);
  update public.subscription_requests set status='approved',approved_by=auth.uid(),approved_at=now(),updated_at=now() where id=p_request_id;
end;
$$;
revoke all on function public.approve_subscription_request(uuid) from public, anon;
grant execute on function public.approve_subscription_request(uuid) to authenticated;