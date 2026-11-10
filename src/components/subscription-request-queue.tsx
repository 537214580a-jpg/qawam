'use client';
import { useState,useTransition } from 'react';
import { updateSubscriptionRequest } from '@/app/(admin)/admin/actions';
type Request={id:string;customer_name:string;customer_phone:string|null;plan_name:string;amount_sar:number;request_type:string;status:string;created_at:string;payment_reference:string|null};
const labels:Record<string,string>={new:'طلب جديد',awaiting_payment:'بانتظار التحويل',receipt_received:'تم استلام الإيصال',under_verification:'قيد التحقق',approved:'تم الاعتماد',rejected:'مرفوض'};
export function SubscriptionRequestQueue({requests}:{requests:Request[]}){
 const [notice,setNotice]=useState('');
 const [pending,start]=useTransition();
 function update(formData:FormData){start(async()=>{const result=await updateSubscriptionRequest(formData);setNotice('error'in result&&result.error?result.error:'تم تحديث طلب الاشتراك.');});}
 return <section className="panel space-y-4">
  <div><h2 className="text-lg font-extrabold">طلبات الاشتراك عبر واتساب</h2><p className="mt-1 text-sm text-slate-500">لا تعتمد الطلب إلا بعد التحقق من وصول المبلغ في الحساب.</p></div>
  {!requests.length?<p className="text-sm text-slate-500">ما فيه طلبات اشتراك حاليًا.</p>:<div className="space-y-3">{requests.map(request=><form action={update} key={request.id} className="rounded-2xl border border-slate-100 p-4">
   <input type="hidden" name="requestId" value={request.id}/>
   <div className="flex flex-wrap items-start justify-between gap-3">
    <div><strong>{request.customer_name}</strong><p className="text-sm text-slate-500" dir="ltr">{request.customer_phone||'بدون رقم مسجل'}</p><p className="mt-1 text-sm">{request.plan_name} · {request.amount_sar} ر.س · {request.request_type==='renewal'?'تجديد':'جديد'}</p><p className="text-xs text-slate-400">{new Date(request.created_at).toLocaleString('ar-SA')}</p></div>
    <span className="rounded-full bg-qawam-50 px-3 py-1 text-xs font-bold">{labels[request.status]||request.status}</span>
   </div>
   {request.status!=='approved'&&request.status!=='rejected'&&<div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
    <select name="status" className="field" defaultValue={request.status==='new'?'awaiting_payment':request.status}>
     <option value="awaiting_payment">بانتظار التحويل</option><option value="receipt_received">استلمنا الإيصال</option><option value="under_verification">قيد التحقق</option><option value="approved">اعتماد وتفعيل الاشتراك</option><option value="rejected">رفض الطلب</option>
    </select>
    <input name="rejectionReason" className="field" placeholder="سبب الرفض عند الحاجة"/>
    <button className="secondary-button" disabled={pending}>{pending?'جارٍ الحفظ…':'تحديث الطلب'}</button>
   </div>}
  </form>)}</div>}
  {notice&&<p role="status" className="text-sm text-qawam-700">{notice}</p>}
 </section>;
}
