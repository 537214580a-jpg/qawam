import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PlatformPlanForm } from '@/components/platform-plan-form';
import { AdminManagement } from '@/components/admin-management';
import { WhatsAppSettings } from '@/components/whatsapp-settings';
import { SubscriptionRequestQueue } from '@/components/subscription-request-queue';
export default async function AdminPage(){
 const db=await createSupabaseServerClient();
 const [{data:clinics},{data:plans},{count:clients},{data:subs},{data:requests},{data:settings}]=await Promise.all([
  db.from('clinics').select('id,name,slug,plan_id,created_at,plans(name,client_limit)'),
  db.from('plans').select('id,name,client_limit,price_sar,interval,features,audience').order('price_sar'),
  db.from('clients').select('*',{count:'exact',head:true}),
  db.from('subscriptions').select('id,status,plans(name),profiles(full_name),clinic_id,created_at').order('created_at',{ascending:false}).limit(100),
  db.from('subscription_requests').select('id,customer_name,customer_phone,plan_name,amount_sar,request_type,status,created_at,payment_reference').order('created_at',{ascending:false}).limit(100),
  db.from('platform_settings').select('whatsapp_number').eq('id',true).maybeSingle()
 ]);
 const active=(subs||[]).filter(s=>s.status==='active').length;
 return <div className="space-y-6">
  <header><p className="text-sm font-bold text-qawam-500">إدارة منصة قوام</p><h1 className="mt-1 text-3xl font-extrabold">لوحة الإدارة العليا</h1></header>
  <section className="grid gap-4 sm:grid-cols-3">{[['العيادات',clinics?.length||0],['العملاء',clients||0],['الاشتراكات النشطة',active]].map(([label,value])=><article key={label} className="panel"><p className="text-sm text-slate-500">{label}</p><strong className="mt-2 block text-3xl">{value}</strong></article>)}</section>
  <WhatsAppSettings number={settings?.whatsapp_number||''}/>
  <SubscriptionRequestQueue requests={(requests||[]) as any[]}/>
  <PlatformPlanForm/>
  <AdminManagement clinics={(clinics||[]).map((c:any)=>({id:c.id,name:c.name,plan_id:c.plan_id}))} plans={(plans||[]).map((p:any)=>({id:p.id,name:p.name,audience:p.audience}))} subscriptions={(subs||[]).map((s:any)=>({id:s.id,status:s.status,plans:s.plans,profiles:s.profiles}))}/>
  <section className="panel"><h2 className="mb-4 font-extrabold">خطط المنصة</h2><div className="grid gap-3 sm:grid-cols-3">{plans?.map((p:any)=><article key={p.id} className="rounded-xl bg-qawam-50 p-4"><strong>{p.name}</strong><span className="mr-2 rounded-full bg-white px-2 py-1 text-xs text-slate-500">{p.audience==='client'?'عميل':'عيادة'}</span><p className="mt-2">{p.price_sar} ر.س / {p.interval==='year'?'سنة':'شهر'}</p><p className="text-sm text-slate-500">{p.client_limit||'غير محدود'} عميل</p></article>)}</div></section>
 </div>;
}
