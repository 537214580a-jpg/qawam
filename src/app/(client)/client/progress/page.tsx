import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WeightChart } from '@/components/weight-chart';
import { ProgressForm } from '@/components/progress-form';
import { ProgressPhotoUpload } from '@/components/progress-photo-upload';
import { EmptyState } from '@/components/page-state';

export default async function ProgressPage() {
  const db = await createSupabaseServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: client } = await db.from('clients').select('id,starting_weight_kg').eq('user_id', user.id).maybeSingle();
  if (!client) redirect('/client/onboarding');
  const [{ data: weights }, { data: checks }, { data: measurements }] = await Promise.all([
    db.from('weight_logs').select('logged_on,weight_kg').eq('client_id', client.id).order('logged_on').limit(90),
    db.from('checkins').select('week_start,adherence_pct').eq('client_id', client.id).order('week_start', { ascending: false }).limit(8),
    db.from('measurements').select('measured_on,photo_paths').eq('client_id', client.id).order('measured_on', { ascending: false }).limit(12)
  ]);
  const series = (weights || []).map(w => ({ date: new Date(`${w.logged_on}T12:00:00`).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' }), weight: Number(w.weight_kg) }));
  const avg = checks?.length ? Math.round(checks.reduce((n, c) => n + (c.adherence_pct || 0), 0) / checks.length) : 0;
  const paths = (measurements || []).flatMap(m => m.photo_paths || []);
  const { data: signedPhotos } = paths.length ? await db.storage.from('qawam-private').createSignedUrls(paths, 3600) : { data: [] };
  return <div className="space-y-5"><header><p className="text-sm font-bold text-qawam-500">متابعة التقدم</p><h1 className="mt-1 text-3xl font-extrabold">قياساتك وإنجازك</h1></header>
    <div className="grid gap-4 md:grid-cols-[2fr_1fr]"><section className="panel"><div className="mb-3 flex justify-between"><h2 className="font-extrabold">تغير الوزن</h2><span className="text-sm text-slate-500">متوسط الالتزام {avg}%</span></div>{series.length < 2 ? <EmptyState title="أضف قياساتك" body="سجّل وزنك أسبوعيًا لعرض مخطط التقدم."/> : <WeightChart data={series}/>}</section><section className="panel"><h2 className="font-extrabold">الملخص</h2><p className="mt-4 text-sm text-slate-500">وزن البداية</p><strong className="text-2xl">{client.starting_weight_kg || '—'} كجم</strong><p className="mt-4 text-sm text-slate-500">أحدث وزن</p><strong className="text-2xl">{weights?.at(-1)?.weight_kg || client.starting_weight_kg || '—'} كجم</strong></section></div>
    <ProgressForm/><ProgressPhotoUpload userId={user.id}/>
    <section><h2 className="mb-3 text-lg font-extrabold">صور التقدم</h2>{!signedPhotos?.length ? <EmptyState title="صور التقدم تظهر هنا" body="أضف صورًا أسبوعية من النموذج أعلاه. الصور خاصة بك."/> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{signedPhotos.map((photo:any) => <figure key={photo.path} className="overflow-hidden rounded-2xl bg-white shadow-soft"><img src={photo.signedUrl} alt="صورة تقدم خاصة" className="aspect-square w-full object-cover"/><figcaption className="p-2 text-xs text-slate-500">{photo.path.split('/').at(-1)?.slice(0,10)}</figcaption></figure>)}</div>}</section>
  </div>;
}
