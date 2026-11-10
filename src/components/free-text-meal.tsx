'use client';
import { useState,useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { logFreeTextMeal } from '@/app/(client)/client/actions';

export function FreeTextMeal({locale='ar'}:{locale?:'ar'|'en'}){const en=locale==='en';
 const router=useRouter();
 const [pending,start]=useTransition();
 const [text,setText]=useState('');
 const [mealType,setMealType]=useState(en?'Main meal':'وجبة رئيسية');
 const [message,setMessage]=useState('');
 function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const formData=new FormData();
  formData.set('text',text);
  formData.set('mealType',mealType);
  setMessage('');
  start(async()=>{
   const result=await logFreeTextMeal(formData);
   if(!result.items||!result.totals){setMessage('error'in result&&result.error?result.error:en?'Could not log the meal. Please try again.':'تعذر تسجيل الوجبة. حاول مرة ثانية.');return;}
   const detected=result.items.map(item=>`${item.name} ${item.grams}${en?' g':'غ'}`).join('، ');
   const totals=result.totals;
   setMessage(`سجلنا: ${detected} — ${Math.round(totals.calories)} ${en?'kcal, protein':'سعرة، بروتين'} ${Math.round(totals.protein)}${en?' g, carbs ':'غ، كارب '}${Math.round(totals.carbs)}${en?' g, fat ':'غ، دهون '}${Math.round(totals.fat)}${en?' g':'غ'}.`);
   setText('');
   router.refresh();
  });
 }
 return <section className="panel space-y-4">
  <div>
   <p className="text-sm font-bold text-qawam-500">{en?'Quick logging':'تسجيل سريع'}</p>
   <h2 className="mt-1 text-lg font-extrabold">{en?'Describe your meal':'اكتب وجبتك بطريقتك'}</h2>
   <p className="mt-1 text-sm text-slate-500">{en?'Enter each food with its amount in grams. QAWAM matches it to foods in your database and calculates the nutrition.':'اكتب كل صنف مع كميته بالجرام، وقوام يتعرف عليه ويحسبه لك.'}</p>
  </div>
  <form onSubmit={submit} className="space-y-3">
   <textarea className="field min-h-24 resize-y" value={text} onChange={event=>setText(event.target.value)} maxLength={1000} required placeholder={en?"Example: cooked chicken 150 g, rice 150 g":"مثال: دجاج مطبوخ 150، أرز 150"}/>
   <div className="flex flex-col gap-3 sm:flex-row">
    <select className="field sm:max-w-56" value={mealType} onChange={event=>setMealType(event.target.value)} aria-label={en?"Meal type":"نوع الوجبة"}>
     <option>{en?'Breakfast':'إفطار'}</option><option>{en?'Lunch':'غداء'}</option><option>{en?'Dinner':'عشاء'}</option><option>{en?'Snack':'وجبة خفيفة'}</option><option>{en?'Main meal':'وجبة رئيسية'}</option>
    </select>
    <button disabled={pending||text.trim().length<3} className="primary-button flex-1">{pending?(en?'Matching and saving…':'جارٍ التعرف والحفظ…'):(en?'Match and log meal':'تعرّف على الوجبة وسجّلها')}</button>
   </div>
  </form>
  {message&&<p role="status" className="rounded-xl bg-qawam-50 p-3 text-sm font-medium text-qawam-800">{message}</p>}
 </section>;
}
