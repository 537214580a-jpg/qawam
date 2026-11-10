create table if not exists public.platform_settings (
  id boolean primary key default true check (id),
  whatsapp_number text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.platform_settings(id, whatsapp_number) values (true, null) on conflict (id) do nothing;
alter table public.platform_settings enable row level security;
drop policy if exists platform_settings_public_read on public.platform_settings;
create policy platform_settings_public_read on public.platform_settings for select using (true);
drop policy if exists platform_settings_admin_update on public.platform_settings;
create policy platform_settings_admin_update on public.platform_settings for update using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='super_admin')) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='super_admin'));
grant select on public.platform_settings to anon, authenticated;
grant update on public.platform_settings to authenticated;

create table if not exists public.subscription_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict,
  request_type text not null default 'new' check (request_type in ('new','renewal')),
  status text not null default 'new' check (status in ('new','awaiting_payment','receipt_received','under_verification','approved','rejected')),
  customer_name text not null,
  customer_phone text,
  plan_name text not null,
  amount_sar numeric(10,2) not null check (amount_sar >= 0),
  payment_reference text unique,
  rejection_reason text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscription_requests_status_created_idx on public.subscription_requests(status, created_at desc);
create index if not exists subscription_requests_user_created_idx on public.subscription_requests(user_id, created_at desc);
alter table public.subscription_requests enable row level security;
drop policy if exists subscription_requests_owner_read on public.subscription_requests;
create policy subscription_requests_owner_read on public.subscription_requests for select using (user_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='super_admin'));
drop policy if exists subscription_requests_owner_insert on public.subscription_requests;
create policy subscription_requests_owner_insert on public.subscription_requests for insert with check (
  user_id=auth.uid() and status='new' and approved_by is null and approved_at is null
  and exists(select 1 from public.plans pl where pl.id=plan_id and pl.audience='client' and pl.is_active=true)
);
drop policy if exists subscription_requests_admin_update on public.subscription_requests;
create policy subscription_requests_admin_update on public.subscription_requests for update using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='super_admin')) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='super_admin'));
grant select, insert on public.subscription_requests to authenticated;
grant update on public.subscription_requests to authenticated;

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
  if v_existing.id is null then
    insert into public.subscriptions(user_id,plan_id,status,starts_at,ends_at,renews_at)
    values(v_request.user_id,v_plan.id,'active',v_start,v_end,v_end);
  else
    update public.subscriptions set plan_id=v_plan.id,status='active',starts_at=v_start,ends_at=v_end,renews_at=v_end,updated_at=now()
    where id=v_existing.id;
  end if;
  update public.subscription_requests set status='approved',approved_by=auth.uid(),approved_at=now(),updated_at=now() where id=p_request_id;
end;
$$;
revoke all on function public.approve_subscription_request(uuid) from public, anon;
grant execute on function public.approve_subscription_request(uuid) to authenticated;