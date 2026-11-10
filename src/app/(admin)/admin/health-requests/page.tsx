import { requireProfile } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { HealthRequestQueue } from '@/components/health-request-queue';

export const dynamic='force-dynamic';

export default async function HealthRecordRequestsPage(){
  const admin=await requireProfile(['super_admin']);
  const db=await createSupabaseServerClient();
  const {data:requests,error}=await db.from('health_record_requests')
    .select('id,client_id,user_id,preferred_language,include_originals,status,requested_at,updated_at,delivery_path,clients(full_name,phone,client_number)')
    .order('requested_at',{ascending:false}).limit(100);
  if(error)return <div className="panel"><h1 className="text-xl font-extrabold">تعذر تحميل طلبات الملفات الصحية</h1><p className="mt-2 text-sm text-slate-500">{error.message}</p></div>;
  const rows=requests||[];
  const ids=rows.map(row=>row.id);
  const paths=rows.flatMap(row=>row.delivery_path?[row.delivery_path]:[]);
  const [{data:reviews},{data:signedFiles}]=await Promise.all([
    ids.length?db.from('health_record_request_reviews').select('request_id,admin_note,rejection_reason,reviewed_at').in('request_id',ids):Promise.resolve({data:[]}),
    paths.length?db.storage.from('qawam-health-exports').createSignedUrls(paths,3600):Promise.resolve({data:[]})
  ]);
  const queue=rows.map(row=>({
    ...row,
    review:(reviews||[]).find(review=>review.request_id===row.id)||null,
    deliveryUrl:signedFiles?.find(file=>file.path===row.delivery_path)?.signedUrl||undefined
  }));
  return <div className="space-y-5">
    <header><p className="text-sm font-bold text-qawam-500">إدارة المنصة</p><h1 className="mt-1 text-3xl font-extrabold">طلبات الملف الصحي الكامل</h1><p className="mt-2 max-w-3xl text-sm text-slate-500">تحقق من هوية العميل، جهز ملف PDF، وارفع النسخة النهائية الخاصة. لا يعتمد إثبات الهوية أو التحويل على رفع إيصال فقط.</p></header>
    <HealthRequestQueue initialRequests={queue as any[]} adminId={admin.id}/>
  </div>;
}
