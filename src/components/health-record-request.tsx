'use client';

import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

const requestSchema = z.object({
  preferred_language: z.enum(['ar','en']),
  include_originals: z.boolean()
});
type RequestRow={id:string;preferred_language:'ar'|'en';include_originals:boolean;status:string;requested_at:string;updated_at:string;delivery_path:string|null;downloadUrl?:string};

export function HealthRecordRequest({clientId,userId,clinicId,locale}:{clientId:string;userId:string;clinicId:string;locale:'ar'|'en'}) {
  const en=locale==='en';
  const db=createSupabaseBrowserClient();
  const [rows,setRows]=useState<RequestRow[]>([]);
  const [preferredLanguage,setPreferredLanguage]=useState<'ar'|'en'>(locale);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const labels={
    title:en?'Request my complete health record':'طلب ملفي الصحي الكامل',
    copy:en?'This request remains available if your subscription expires. The clinic team will verify your identity and prepare the record.':'تقدر تطلب ملفك حتى بعد انتهاء الاشتراك. الإدارة تتحقق من هويتك وتجهز الملف.',
    language:en?'Report language':'لغة الملف',
    arabic:en?'Arabic':'العربية',
    english:en?'English':'الإنجليزية',
    originals:en?'Include original uploaded documents':'أرفق المستندات الأصلية التي رفعتها',
    submit:en?'Submit request':'إرسال الطلب',
    waiting:en?'Loading requests…':'جاري تحميل الطلبات…',
    empty:en?'No health record request yet.':'ما طلبت ملفك الصحي حتى الآن.',
    requested:en?'New request':'طلب جديد',
    identity_check:en?'Identity verification':'التحقق من الهوية',
    preparing:en?'Preparing report':'تجهيز الملف',
    ready:en?'Ready for secure download':'جاهز للتنزيل الآمن',
    delivered:en?'Delivered':'تم التسليم',
    rejected:en?'Rejected':'مرفوض',
    download:en?'Download secure PDF':'تنزيل ملف PDF الخاص',
    sent:en?'Request submitted. The clinic team will follow up.':'تم إرسال الطلب للإدارة، وبيتابعون معك.',
    duplicate:en?'There is already an open request.':'لديك طلب مفتوح بالفعل.',
    failed:en?'Could not submit the request. Try again.':'تعذر إرسال الطلب. حاول مرة ثانية.',
    waitingAdmin:en?'The team will update the request here.':'تظهر لك حالة الطلب هنا بعد تحديثها من الإدارة.'
  };
  const statusLabel=(status:string)=>labels[status as keyof typeof labels]||status;
  const load=useCallback(async()=>{
    setLoading(true);setError('');
    const {data,error:queryError}=await db.from('health_record_requests').select('id,preferred_language,include_originals,status,requested_at,updated_at,delivery_path').eq('user_id',userId).order('requested_at',{ascending:false});
    if(queryError){setError(queryError.message);setLoading(false);return;}
    const withLinks=await Promise.all((data||[]).map(async(row:any)=>{
      if(row.status!=='ready'&&row.status!=='delivered')return row as RequestRow;
      if(!row.delivery_path)return row as RequestRow;
      const {data:signed}=await db.storage.from('qawam-health-exports').createSignedUrl(row.delivery_path,1800);
      return {...row,downloadUrl:signed?.signedUrl} as RequestRow;
    }));
    setRows(withLinks);setLoading(false);
  },[db,userId]);
  useEffect(()=>{void load();},[load]);
  async function submit(){
    setError('');setMessage('');
    const parsed=requestSchema.safeParse({preferred_language:preferredLanguage,include_originals:(document.getElementById('include-health-originals') as HTMLInputElement | null)?.checked||false});
    if(!parsed.success){setError(labels.failed);return;}
    setSaving(true);
    const {error:insertError}=await db.from('health_record_requests').insert({
      client_id:clientId,user_id:userId,clinic_id:clinicId,...parsed.data,status:'requested'
    });
    setSaving(false);
    if(insertError){setError(insertError.code==='23505'?labels.duplicate:labels.failed);return;}
    setMessage(labels.sent);await load();
  }
  const pending=rows.some(r=>['requested','identity_check','preparing','ready'].includes(r.status));
  const panel='rounded-3xl border border-slate-100 bg-white p-5 shadow-soft';

  return <section dir={en?'ltr':'rtl'} className={panel+' mx-auto mt-5 max-w-4xl'}>
    <div><h2 className="text-xl font-extrabold">{labels.title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{labels.copy}</p></div>
    {error&&<p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message&&<p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm font-semibold text-slate-700">{labels.language}
        <select className="min-h-11 rounded-xl border border-slate-200 bg-white px-3" value={preferredLanguage} onChange={(event)=>setPreferredLanguage(event.target.value as 'ar'|'en')}>
          <option value="ar">{labels.arabic}</option><option value="en">{labels.english}</option>
        </select>
      </label>
      <label className="flex items-center gap-3 self-end rounded-xl bg-qawam-50 p-3 text-sm">
        <input id="include-health-originals" type="checkbox" className="h-4 w-4 accent-qawam-700"/>
        {labels.originals}
      </label>
    </div>
    <button type="button" className="mt-4 min-h-11 rounded-xl bg-qawam-900 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50" onClick={()=>void submit()} disabled={saving||pending}>
      {saving?(en?'Sending…':'جاري الإرسال…'):labels.submit}
    </button>
    <div className="mt-5 border-t border-slate-100 pt-4">
      {loading?<p className="text-sm text-slate-500">{labels.waiting}</p>:rows.length===0?<p className="text-sm text-slate-500">{labels.empty}</p>:<div className="space-y-3">{rows.map(row=><article key={row.id} className="rounded-2xl bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><strong>{statusLabel(row.status)}</strong><span className="text-xs text-slate-500">{new Date(row.requested_at).toLocaleDateString(en?'en-US':'ar-SA')}</span></div>
        <p className="mt-1 text-sm text-slate-500">{row.preferred_language==='ar'?labels.arabic:labels.english} · {row.include_originals?labels.originals:(en?'Report only':'التقرير فقط')}</p>
        {row.downloadUrl?<a className="mt-3 inline-flex rounded-xl bg-qawam-900 px-4 py-2 text-sm font-bold text-white" href={row.downloadUrl}>{labels.download}</a>:<p className="mt-2 text-xs text-slate-500">{labels.waitingAdmin}</p>}
      </article>)}</div>}
    </div>
  </section>;
}
