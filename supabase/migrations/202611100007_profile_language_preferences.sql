alter table public.profiles add column if not exists locale text not null default 'ar';
alter table public.profiles drop constraint if exists profiles_locale_supported;
alter table public.profiles add constraint profiles_locale_supported check (locale in ('ar','en'));
create or replace function public.set_my_locale(p_locale text)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
 if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
 if p_locale not in ('ar','en') then raise exception 'لغة غير مدعومة'; end if;
 update public.profiles set locale=p_locale,updated_at=now() where id=auth.uid();
 if not found then raise exception 'ملف المستخدم غير موجود'; end if;
end;
$$;
revoke all on function public.set_my_locale(text) from public,anon;
grant execute on function public.set_my_locale(text) to authenticated;