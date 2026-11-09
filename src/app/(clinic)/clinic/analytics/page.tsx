import { getClinicContext } from '@/lib/clinic';
import { EmptyState } from '@/components/page-state';
export default async function ClinicAnalytics(){
  const {db,clinic}=await getClinicContext();
  if(!clinic)return <EmptyState title="لا توجد عيادة" body="اربط حسابك بعيادة لعرض التحليلات."/>;
  const {data:clients}=await db.from('clients').select('id,starting_weight_kg,last_activity_at').eq('clinic_id',clinic.id);
  const ids=(clients||[]).map(c=>c.id);const since=new Date();since.setDate(since.getDate()-60);
  const [{data:checks},{data:weights},{data:meals}]=ids.length?await Promise.all([
    db.from('checkins').select('adherence_pct').in('client_id',ids).order('week_start',{ascending:false}).limit(500),
    db.from('weight_logs').select('client_id,weight_kg,logged_on').in('client_id',ids).order('logged_on'),
    db.from('meal_logs').select('client_id,logged_at').in('client_id',ids).gte('logged_at',since.toISOString())
  ]):[{data:[]},{data:[]},{data:[]}];
  const adherence=checks?.length?Math.round(checks.reduce((s,c)=>s+(c.adherence_pct||0),0)/checks.length):0;
  const monthAgo=new Date();monthAgo.setDate(monthAgo.getDate()-30);const currentActive=new Set((meals||[]).filter(m=>new Date(m.logged_at)>=monthAgo).map(m=>m.client_id));const previousActive=new Set((meals||[]).filter(m=>new Date(m.logged_at)<monthAgo).map(m=>m.client_id));const retained=[...previousActive].filter(id=>currentActive.has(id)).length;const retention=previousActive.size?Math.round(retained/previousActive.size*100):0;
  const first=new Map<string,number>();const latest=new Map<string,number>();for(const w of weights||[]){if(!first.has(w.client_id))first.set(w.client_id,Number(w.weight_kg));latest.set(w.client_id,Number(w.weight_kg));}const changes=[...latest].map(([id,v])=>v-(first.get(id)||v));const avgChange=changes.length?(changes.reduce((a,b)=>a+b,0)/changes.length).toFixed(1):'0.0';
  return <div className="space-y-5"><header><p className="text-sm font-bold text-qawam-500">أداء العيادة</p><h1 className="mt-1 text-3xl font-extrabold">التحليلات</h1></header><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['عملاء نشطون آخر 30 يومًا',currentActive.size],['الاحتفاظ من الشهر السابق',`${retention}%`],['متوسط الالتزام',`${adherence}%`],['متوسط تغير الوزن',`${avgChange} كجم`]].map(([label,value])=><article key={label} className="panel"><p className="text-sm text-slate-500">{label}</p><strong className="mt-2 block text-3xl">{value}</strong></article>)}</section><p className="text-xs text-slate-500">الاحتفاظ هو نسبة العملاء الذين سجلوا وجبة في آخر 30 يومًا بعد تسجيلهم في الثلاثين يومًا السابقة. تغير الوزن يقارن أول وآخر قياس متاح.</p></div>
}
