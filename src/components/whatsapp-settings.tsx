'use client';
import { useState,useTransition } from 'react';
import { saveWhatsAppNumber } from '@/app/(admin)/admin/actions';
export function WhatsAppSettings({number}:{number:string}){
 const [message,setMessage]=useState('');
 const [pending,start]=useTransition();
 return <form action={formData=>{start(async()=>{const result=await saveWhatsAppNumber(formData);setMessage('error'in result&&result.error?result.error:'تم حفظ رقم واتساب الإدارة.');});}} className="panel space-y-3">
  <div><h2 className="font-extrabold">رقم واتساب الاشتراكات</h2><p className="mt-1 text-sm text-slate-500">يظهر هذا الرقم للعملاء لطلبات الاشتراك والتجديد. أدخله مع مفتاح الدولة، مثل 9665xxxxxxxx.</p></div>
  <div className="flex flex-col gap-2 sm:flex-row"><input name="number" className="field" dir="ltr" inputMode="tel" defaultValue={number} placeholder="9665xxxxxxxx"/><button className="secondary-button sm:min-w-36" disabled={pending}>{pending?'جارٍ الحفظ…':'حفظ الرقم'}</button></div>
  {message&&<p role="status" className="text-sm text-qawam-700">{message}</p>}
 </form>;
}
