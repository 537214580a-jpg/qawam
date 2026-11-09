'use client';
import { useState,useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { logFreeTextMeal } from '@/app/(client)/client/actions';

export function FreeTextMeal(){
 const router=useRouter();
 const [pending,start]=useTransition();
 const [text,setText]=useState('');
 const [mealType,setMealType]=useState('وجبة رئيسية');
 const [message,setMessage]=useState('');
 function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const formData=new FormData();
  formData.set('text',text);
  formData.set('mealType',mealType);
  setMessage('');
  start(async()=>{
   const result=await logFreeTextMeal(formData);
   if('error'in result&&result.error){setMessage(result.error);return;}
   const detected=result.items.map(item=>`${item.name} ${item.grams}غ`).join('، ');
   const totals=result.totals;
   setMessage(`سجلنا: ${detected} — ${Math.round(totals.calories)} سعرة، بروتين ${Math.round(totals.protein)}غ، كارب ${Math.round(totals.carbs)}غ، دهون ${Math.round(totals.fat)}غ.`);
   setText('');
   router.refresh();
  });
 }
 return <section className="panel space-y-4">
  <div>
   <p className="text-sm font-bold text-qawam-500">تسجيل سريع</p>
   <h2 className="mt-1 text-lg font-extrabold">اكتب وجبتك بطريقتك</h2>
   <p className="mt-1 text-sm text-slate-500">اكتب كل صنف مع كميته بالجرام، وقوام يتعرف عليه ويحسبه لك.</p>
  </div>
  <form onSubmit={submit} className="space-y-3">
   <textarea className="field min-h-24 resize-y" value={text} onChange={event=>setText(event.target.value)} maxLength={1000} required placeholder="مثال: دجاج مطبوخ 150، أرز 150"/>
   <div className="flex flex-col gap-3 sm:flex-row">
    <select className="field sm:max-w-56" value={mealType} onChange={event=>setMealType(event.target.value)} aria-label="نوع الوجبة">
     <option>إفطار</option><option>غداء</option><option>عشاء</option><option>وجبة خفيفة</option><option>وجبة رئيسية</option>
    </select>
    <button disabled={pending||text.trim().length<3} className="primary-button flex-1">{pending?'جارٍ التعرف والحفظ…':'تعرّف على الوجبة وسجّلها'}</button>
   </div>
  </form>
  {message&&<p role="status" className="rounded-xl bg-qawam-50 p-3 text-sm font-medium text-qawam-800">{message}</p>}
 </section>;
}
