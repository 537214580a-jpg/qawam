'use client';
import { useState,useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveFoodMeal } from '@/app/(client)/client/meal-entry-actions';
type Food={id:string;name_ar:string;name_en?:string|null;calories:number;protein_g:number;carbs_g:number;fat_g:number};
export function GuidedFoodFlow({foods,locale='ar'}:{foods:Food[];locale?:'ar'|'en'}){
 const en=locale==='en';const router=useRouter();const [open,setOpen]=useState(false);const [step,setStep]=useState(0);
 const [meal,setMeal]=useState('وجبة رئيسية');const [food,setFood]=useState<Food|null>(null);const [grams,setGrams]=useState('150');
 const [message,setMessage]=useState('');const [pending,start]=useTransition();
 const meals=[{value:'إفطار',label:en?'Breakfast':'إفطار'},{value:'غداء',label:en?'Lunch':'غداء'},{value:'عشاء',label:en?'Dinner':'عشاء'},{value:'وجبة خفيفة',label:en?'Snack':'وجبة خفيفة'}];
 const gramsValue=Number(grams);const ratio=gramsValue/100;
 function save(){
  if(!food||!Number.isFinite(gramsValue)||gramsValue<1||gramsValue>5000)return;
  const form=new FormData();form.set('mealType',meal);form.set('items',JSON.stringify([{foodId:food.id,grams:gramsValue}]));
  start(async()=>{const result=await saveFoodMeal(form);if('error'in result)setMessage(result.error||'تعذر حفظ الوجبة.');else{setMessage(en?'Meal logged from QAWAM foods.':'تم تسجيل الصنف من قاعدة قوام.');setStep(0);setFood(null);setGrams('150');router.refresh();}});
 }
 return <section className="panel"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-extrabold">{en?'Guided food choice':'ساعدني أختار من قاعدة الطعام'}</h2><p className="text-sm text-slate-500">{en?'Choose a meal, a database food, and any amount.':'اختَر نوع الوجبة والصنف والكمية اللي تناسبك.'}</p></div><button type="button" className="secondary-button" onClick={()=>{setOpen(!open);setStep(0);setMessage('');}}>{open?(en?'Close':'إغلاق'):(en?'Help me choose':'ابدأ الاختيار')}</button></div>
  {open&&<div className="mt-4 rounded-xl bg-qawam-50 p-4">
   {step===0&&<><p className="mb-3 font-bold">{en?'Which meal are you logging?':'أي وجبة تبي تسجل؟'}</p><div className="flex flex-wrap gap-2">{meals.map(item=><button type="button" key={item.value} onClick={()=>{setMeal(item.value);setStep(1);}} className="secondary-button">{item.label}</button>)}</div></>}
   {step===1&&<><p className="mb-3 font-bold">{en?'Choose from the food database':'اختر صنفًا من قاعدة قوام'}</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{foods.slice(0,36).map(item=><button type="button" key={item.id} onClick={()=>{setFood(item);setStep(2);}} className="rounded-xl bg-white px-3 py-3 text-sm shadow-sm hover:bg-qawam-100">{en?(item.name_en||item.name_ar):item.name_ar}</button>)}</div></>}
   {step===2&&food&&<><p className="mb-3 font-bold">{en?'How much '+(food.name_en||food.name_ar)+'?':'كمية '+food.name_ar}</p><div className="flex flex-wrap gap-2">{[50,100,150,200,250,300].map(amount=><button type="button" key={amount} onClick={()=>setGrams(String(amount))} className={`rounded-xl px-4 py-2 font-bold ${gramsValue===amount?'bg-qawam-950 text-white':'bg-white'}`}>{amount} {en?'g':'غ'}</button>)}</div><div className="mt-3 flex items-center gap-2"><button type="button" className="secondary-button" onClick={()=>setGrams(String(Math.max(1,gramsValue-25)))}>−25</button><input aria-label={en?'Amount in grams':'الكمية بالجرام'} className="field max-w-36" type="number" min="1" max="5000" value={grams} onChange={e=>setGrams(e.target.value)}/><button type="button" className="secondary-button" onClick={()=>setGrams(String(Math.min(5000,gramsValue+25)))}>+25</button></div><p className="mt-2 text-sm text-slate-600">{Math.round(Number(food.calories)*ratio)} {en?'kcal':'سعرة'} · P {Math.round(Number(food.protein_g)*ratio)}g · C {Math.round(Number(food.carbs_g)*ratio)}g · F {Math.round(Number(food.fat_g)*ratio)}g</p><button type="button" disabled={pending||!Number.isFinite(gramsValue)||gramsValue<1||gramsValue>5000} className="primary-button mt-4 w-full" onClick={save}>{pending?(en?'Saving…':'جارٍ الحفظ…'):(en?'Log food':'تسجيل الصنف')}</button></>}
   {message&&<p role="status" className="mt-3 text-sm text-qawam-700">{message}</p>}
  </div>}
 </section>;
}