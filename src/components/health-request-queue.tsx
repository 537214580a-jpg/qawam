'use client';

import { useState } from 'react';
import { z } from 'zod';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

const reviewSchema=z.object({
  status:z.enum(['requested','identity_check','preparing','ready','delivered','rejected']),
  admin_note:z.string().max(3000),
  rejection_reason:z.string().max(1000)
}).superRefine((value,ctx)=>{
  if(value.status==='rejected'&&!value.rejection_reason.trim())ctx.addIssue({code:z.ZodIssueCode.custom,path:['rejection_reason'],message:'سبب الرفض مطلوب.'});
});
type RequestItem={
  id:string;client_id:string;user_id:string;preferred_language:'ar'|'en';include_originals:boolean;
  status:string;requested_at:string;updated_at:string;delivery_path:string|null;deliveryUrl?:string;
  clients?:{full_name:string;phone:string|null;client_number:number}|null;
  review?:{admin_note:string;rejection_reason:string;reviewed_at:string}|null;
};

const statusNames:Record<string,string>={
 requested:'طلب جديد',identity_check:'التحقق من الهوية',preparing:'تجهيز الملف',ready:'جاهز للتنزيل',delivered:'تم التسليم',rejected:'مرفوض'
};
const statusValues=['requested','identity_check','preparing','ready','delivered','rejected'];

export function HealthRequestQueue({initialRequests,adminId}:{initialRequests:RequestItem[];adminId:string}) {
  const db=createSupabaseBrowserClient();
  const [requests,setRequests]=useState(initialRequests);
  const [savingId,setSavingId]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [files,setFiles]=useState<Record<string,File|undefined>>({});
  const [edits,setEdits]=useState<Record<string,{status:string;admin_note:string;rejection_reason:string}>>(
    Object.fromEntries(initialRequests.map(row=>[row.id,{status:row.status,admin_note:row.review?.admin_note||'',rejection_reason:row.review?.rejection_reason||''}]))
  );

  const update=(id:string,key:'status'|'admin_note'|'rejection_reason',value:string)=>{
    setEdits(current=>({...current,[id]:{...current[id], [key]:value}}));
  };

  async function save(row:RequestItem){
    const edit=edits[row.id];
    const parsed=reviewSchema.safeParse(edit);
    if(!parsed.success){setError(parsed.error.issues[0]?.message||'راجع بيانات المراجعة.');return;}
    if(['ready','delivered'].includes(parsed.data.status)&&!row.delivery_path){setError('ارفع ملف PDF أولًا قبل تحديد الحالة جاهز أو تم التسليم.');return;}
    setSavingId(row.id);setError('');setNotice('');
    const now=new Date().toISOString();
    const {error:updateError}=await db.from('health_record_requests').update({status:parsed.data.status,updated_at:now}).eq('id',row.id);
    if(updateError){setSavingId('');setError(updateError.message);return;}
    const {error:reviewError}=await db.from('health_record_request_reviews').upsert({
      request_id:row.id,admin_id:adminId,admin_note:parsed.data.admin_note.trim(),rejection_reason:parsed.data.rejection_reason.trim(),reviewed_at:now
    },{onConflict:'request_id'});
    if(reviewError){setSavingId('');setError(reviewError.message);return;}
    setRequests(current=>current.map(item=>item.id===row.id?{...item,status:parsed.data.status,updated_at:now,review:{admin_note:parsed.data.admin_note,rejection_reason:parsed.data.rejection_reason,reviewed_at:now}}:item));
    setSavingId('');setNotice('تم تحديث الطلب.');
  }

  async function uploadPdf(row:RequestItem){
    const file=files[row.id];
    if(!file||file.type!=='application/pdf'||file.size<1||file.size>52428800){setError('اختر ملف PDF بحجم لا يتجاوز 50 ميجابايت.');return;}
    setSavingId(row.id);setError('');setNotice('');
    const path=row.user_id+'/'+row.id+'.pdf';
    const {error:uploadError}=await db.storage.from('qawam-health-exports').upload(path,file,{contentType:'application/pdf',upsert:true});
    if(uploadError){setSavingId('');setError(uploadError.message);return;}
    const now=new Date().toISOString();
    const {error:updateError}=await db.from('health_record_requests').update({delivery_path:path,status:'ready',updated_at:now}).eq('id',row.id);
    if(updateError){setSavingId('');setError(updateError.message);return;}
    const {data:signed}=await db.storage.from('qawam-health-exports').createSignedUrl(path,3600);
    setRequests(current=>current.map(item=>item.id===row.id?{...item,delivery_path:path,status:'ready',updated_at:now,deliveryUrl:signed?.signedUrl}:item));
    setEdits(current=>({...current,[row.id]:{...current[row.id],status:'ready'}}));
    setFiles(current=>({...current,[row.id]:undefined}));
    setSavingId('');setNotice('تم رفع الملف وتفعيل التنزيل الخاص للعميل.');
  }

  const panel='rounded-3xl border border-slate-100 bg-white p-5 shadow-soft';
  const input='min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm';
  return <div className="space-y-4">
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {requests.length===0?<section className={panel}><h2 className="font-extrabold">لا توجد طلبات ملف صحي.</h2></section>:requests.map(row=>{
      const edit=edits[row.id]||{status:row.status,admin_note:'',rejection_reason:''};
      return <article key={row.id} className={panel+' space-y-4'}>
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-lg font-extrabold">{row.clients?.full_name||'عميل'} <span className="text-sm font-medium text-slate-500">#{row.clients?.client_number||'—'}</span></h2>
            <p className="mt-1 text-sm text-slate-500">{row.clients?.phone||'بدون رقم جوال'} · {row.preferred_language==='ar'?'العربية':'English'} · {row.include_originals?'مع المستندات الأصلية':'التقرير فقط'}</p>
            <p className="mt-1 text-xs text-slate-400">رقم الطلب {row.id} · {new Date(row.requested_at).toLocaleString('ar-SA')}</p></div>
          <span className="rounded-full bg-qawam-50 px-3 py-1 text-sm font-bold text-qawam-800">{statusNames[row.status]||row.status}</span>
        </header>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold">حالة الطلب
            <select className={input} value={edit.status} onChange={event=>update(row.id,'status',event.target.value)}>{statusValues.map(status=><option value={status} key={status}>{statusNames[status]}</option>)}</select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">ملاحظة إدارية داخلية
            <textarea className={input} rows={2} maxLength={3000} value={edit.admin_note} onChange={event=>update(row.id,'admin_note',event.target.value)}/>
          </label>
          {edit.status==='rejected'&&<label className="grid gap-1 text-sm font-semibold md:col-span-2">سبب الرفض
            <textarea className={input} rows={2} maxLength={1000} value={edit.rejection_reason} onChange={event=>update(row.id,'rejection_reason',event.target.value)}/>
          </label>}
        </div>
        <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-slate-50 p-3">
          <label className="grid flex-1 gap-1 text-sm font-semibold">ملف التقرير النهائي PDF
            <input className={input} type="file" accept="application/pdf" onChange={event=>setFiles(current=>({...current,[row.id]:event.target.files?.[0]}))}/>
          </label>
          <button className="min-h-11 rounded-xl border border-qawam-700 px-4 py-2 text-sm font-bold text-qawam-800 disabled:opacity-50" disabled={savingId===row.id} onClick={()=>void uploadPdf(row)}>{savingId===row.id?'جاري الرفع…':'رفع PDF وتسليمه للتنزيل'}</button>
          {row.deliveryUrl&&<a className="min-h-11 rounded-xl bg-white px-4 py-3 text-sm font-bold text-qawam-800 underline" href={row.deliveryUrl} target="_blank" rel="noreferrer">معاينة الملف</a>}
        </div>
        <button className="min-h-11 rounded-xl bg-qawam-900 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50" disabled={savingId===row.id} onClick={()=>void save(row)}>{savingId===row.id?'جاري الحفظ…':'حفظ حالة الطلب'}</button>
      </article>;
    })}
  </div>;
}
