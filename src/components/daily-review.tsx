'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveDailyReview } from '@/app/(client)/client/review-actions';

type Review={meals:boolean|null;weight:boolean|null;measurements:boolean|null};
export function DailyReview({initial,readOnly=false}:{initial:Review;readOnly?:boolean}){
 const [review,setReview]=useState(initial);const [weight,setWeight]=useState('');const [error,setError]=useState('');const [saved,setSaved]=useState(false);const [pending,start]=useTransition();const router=useRouter();
 function answer(key:keyof Review,value:boolean){setReview(old=>({...old,[key]:value}));setSaved(false);}
 function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();setError('');
  if(Object.values(review).some(value=>value===null)){setError('جاوب على الأسئلة الثلاثة عشان نحفظ متابعة اليوم.');return;}
  if(review.weight&&(!Number(weight)||Number(weight)<20||Number(weight)>500)){setError('أدخل وزنك بالكيلوجرام عشان نسجله.');return;}
  const form=new FormData();form.set('mealsLogged',String(review.meals));form.set('weightLogged',String(review.weight));form.set('measurementsLogged',String(review.measurements));form.set('weight',weight);
  start(async()=>{const result=await saveDailyReview(form);if('error'in result)setError(result.error||'تعذر حفظ متابعة اليوم.');else{setSaved(true);router.refresh();}});
 }
 const questions:[keyof Review,string][]=[['meals','سجلت وجبتك اليوم؟'],['weight','وزنت نفسك اليوم؟'],['measurements','حدثت قياساتك اليوم؟']];
 return <form onSubmit={submit} className="panel space-y-4">
  <div><p className="text-sm font-bold text-qawam-600">متابعة بسيطة</p><h2 className="text-lg font-extrabold">أهلًا، افحص صحتك اليوم</h2><p className="text-sm text-slate-500">جاوب بنعم أو لا، وتقدر تحدّث الإجابات خلال اليوم.</p></div>
  {questions.map(([key,label])=><div key={key} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-qawam-50 p-3"><span className="text-sm font-bold">{label}</span><div className="flex gap-2">{[true,false].map(value=><button key={String(value)} type="button" disabled={readOnly} onClick={()=>answer(key,value)} aria-pressed={review[key]===value} className={`rounded-lg px-4 py-2 text-sm font-bold ${review[key]===value?'bg-qawam-700 text-white':'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{value?'نعم':'لا'}</button>)}</div></div>)}
  {review.weight&&<div><label className="field-label">وزنك اليوم (كجم)</label><input className="field" type="number" min="20" max="500" step="0.1" value={weight} onChange={e=>setWeight(e.target.value)} required disabled={readOnly}/></div>}
  {!readOnly&&<button disabled={pending} className="primary-button w-full">{pending?'جارٍ الحفظ…':'حفظ متابعة اليوم'}</button>}
  {saved&&<p role="status" className="text-sm font-bold text-qawam-700">انحفظت متابعة اليوم.</p>}
  {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  {readOnly&&<p className="text-xs text-slate-500">انتهى الاشتراك؛ تقدر تشاهد بياناتك السابقة فقط.</p>}
 </form>;
}