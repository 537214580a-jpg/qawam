import { redirect } from 'next/navigation';
import { CheckinForm } from '@/components/checkin-form';
import { ReadOnlyNotice } from '@/components/read-only-notice';
import { getClientSubscriptionAccess } from '@/lib/subscription-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function CheckinPage(){
  const db=await createSupabaseServerClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user)redirect('/login');
  const {data:profile}=await db.from('profiles').select('locale').eq('id',user.id).maybeSingle();
  const en=profile?.locale==='en';
  const access=await getClientSubscriptionAccess(db,user.id);
  const {data:client}=await db.from('clients').select('id').eq('user_id',user.id).maybeSingle();
  if(!client)redirect('/client/onboarding');
  const {data:history}=await db.from('checkins').select('id,week_start,sleep_score,hunger_score,energy_score,adherence_pct,notes').eq('client_id',client.id).order('week_start',{ascending:false}).limit(12);
  return <div className="mx-auto max-w-2xl space-y-5">
    <header><p className="text-sm font-bold text-qawam-500">{en?'Weekly follow-up':'كل أسبوع'}</p><h1 className="mt-1 text-3xl font-extrabold">{en?'Weekly check-in':'تقييمك الأسبوعي'}</h1><p className="mt-2 text-slate-500">{en?'Share how your week went with your specialist.':'ساعد أخصائيك على تعديل خطتك بما يناسب أسبوعك.'}</p></header>
    {access.readOnly?<ReadOnlyNotice locale={en?'en':'ar'}/>:<CheckinForm/>}
    <section className="panel"><h2 className="font-extrabold">{en?'Previous check-ins':'التقييمات السابقة'}</h2>{!history?.length?<p className="mt-3 text-sm text-slate-500">{en?'No check-ins yet.':'ما فيه تقييمات سابقة.'}</p>:<div className="mt-3 divide-y">{history.map(row=><article key={row.id} className="py-3 text-sm"><strong>{new Date(row.week_start+'T12:00:00').toLocaleDateString(en?'en-US':'ar-SA',{day:'numeric',month:'long',year:'numeric'})}</strong><p className="mt-1 text-slate-600">{en?'Sleep':'النوم'} {row.sleep_score}/10 · {en?'Hunger':'الجوع'} {row.hunger_score}/10 · {en?'Energy':'الطاقة'} {row.energy_score}/10 · {en?'Adherence':'الالتزام'} {row.adherence_pct}%</p>{row.notes&&<p className="mt-1 text-slate-500">{row.notes}</p>}</article>)}</div>}</section>
  </div>;
}
