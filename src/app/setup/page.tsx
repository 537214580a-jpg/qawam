import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function signOut() {
  'use server';
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export default async function SetupStatusPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <main dir="rtl" className="grid min-h-screen place-items-center bg-qawam-50 px-4 py-10">
      <section className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-soft">
        <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-2xl">ق</div>
        <p className="text-sm font-bold text-qawam-600">قوام للتغذية</p>
        <h1 className="mt-2 text-2xl font-extrabold">تم تسجيل دخولك بنجاح</h1>
        <p className="mt-4 leading-7 text-slate-600">
          الحساب <span dir="ltr" className="font-semibold">{user.email || user.phone}</span> غير مرتبط حاليًا بعضوية عيادة، لذلك لا يمكن فتح لوحة العيادة بعد.
        </p>
        <p className="mt-3 leading-7 text-slate-600">
          أرسل هذه الحالة لمسؤول النظام لربط الحساب بعيادة ومنحك صلاحية مسؤول العيادة. بعد الربط، سجّل الدخول مجددًا.
        </p>
        <form action={signOut} className="mt-7">
          <button className="primary-button">تسجيل الخروج</button>
        </form>
      </section>
    </main>
  );
}
