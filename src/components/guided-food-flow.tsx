'use client';
import { useMemo,useState,useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveFoodMeal } from '@/app/(client)/client/meal-entry-actions';

type Food={id:string;name_ar:string;name_en?:string|null;calories:number;protein_g:number;carbs_g:number;fat_g:number};
export function GuidedFoodFlow({foods,locale='ar'}:{foods:Food[];locale?:'ar'|'en'}){
 const en=locale==='en';const router=useRouter();const [open,setOpen]=useState(false);const [step,setStep]=useState(0);
 const [meal,setMeal]=useState('وجبة رئيسية');const [proteinFood,setProteinFood]=useState<Food|null>(null);const [carbFood,setCarbFood]=useState<Food|null>(null);
 const [proteinGrams,setProteinGrams]=useState('150');const [carbGrams,setCarbGrams]=useState('150');const [message,setMessage]=useState('');const [pending,start]=useTransition();
 const meals=[{value:'إفطار',label:en?'Breakfast':'إفطار'},{value:'غداء',label:en?'Lunch':'غداء'},{value:'عشاء',label:en?'Dinner':'عشاء'},{value:'وجبة خفيفة',label:en?'Snack':'وجبة خفيفة'}];
 const proteins=useMemo(()=>foods.filter(food=>Number(food.protein_g)>=10&&Number(food.calories)>0&&Number(food.carbs_g)<45).slice(0,40),[foods]);
 const carbs=useMemo(()=>foods.filter(food=>Number(food.carbs_g)>=15&&Number(food.calories)>0).slice(0,40),[foods]);
 const pg=Number(proteinGrams),cg=Number(carbGrams);
 const totals=useMemo(()=>{if(!proteinFood||!carbFood)return{calories:0,protein:0,carbs:0,fat:0};const p=pg/100,c=cg/100;return{calories:Number(proteinFood.calories)*p+Number(carbFood.calories)*c,protein:Number(proteinFood.protein_g)*p+Number(carbFood.protein_g)*c,carbs:Number(proteinFood.carbs_g)*p+Number(carbFood.carbs_g)*c,fat:Number(proteinFood.fat_g)*p+Number(carbFood.fat_g)*c};},[proteinFood,carbFood,pg,cg]);
 function save(){
  if(!proteinFood||!carbFood||!Number.isFinite(pg)||!Number.isFinite(cg)||pg<1||pg>5000||cg<1||cg>5000)return;
  const form=new FormData();form.set('mealType',meal);form.set('items',JSON.stringify([{foodId:proteinFood.id,grams:pg},{foodId:carbFood.id,grams:cg}]));
  start(async()=>{const result=await saveFoodMeal(form);if('error'in result)setMessage(result.error||'تعذر حفظ الوجبة.');else{setMessage(en?'Meal saved from QAWAM food data.':'تم تسجيل الوجبة من قاعدة قوام.');setProteinFood(null);setCarbFood(null);setProteinGrams('150');setCarbGrams('150');setStep(0);router.refresh();}});
 }
 const name=(food:Food)=>en?(food.name_en||food.name_ar):food.name_ar;
 return <section className="panel">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-extrabold">{en?'Guided meal builder':'ساعدني أختار وجبة'}</h2><p className="text-sm text-slate-500">{en?'Pick a protein, a carbohydrate, and portions from the food database.':'اختر مصدر بروتين وكربوهيدرات وكمياتهم من قاعدة قوام.'}</p></div><button type="button" className="secondary-button" onClick={()=>{setOpen(!open);setStep(0);setMessage('');}}>{open?(en?'Close':'إغلاق'):(en?'Start guided choice':'ابدأ الاختيار')}</button></div>
  {open&&<div className="mt-4 rounded-xl bg-qawam-50 p-4">
   {step===0&&<><p className="mb-3 font-bold">{en?'Which meal?':'وش نوع الوجبة؟'}</p><div className="flex flex-wrap gap-2">{meals.map(item=><button type="button" key={item.value} onClick={()=>{setMeal(item.value);setStep(1);}} className="secondary-button">{item.label}</button>)}</div></>}
   {step===1&&<><p className="mb-3 font-bold">{en?'Choose a protein source':'اختر مصدر البروتين'}</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{proteins.map(food=><button type="button" key={food.id} onClick={()=>{setProteinFood(food);setStep(2);}} className="rounded-xl bg-white px-3 py-3 text-sm shadow-sm hover:bg-qawam-100">{name(food)}</button>)}</div>{!proteins.length&&<p className="text-sm text-slate-500">{en?'No protein items available.':'ما فيه أصناف مناسبة متاحة في القاعدة.'}</p>}</>}
   {step===2&&<><p className="mb-3 font-bold">{en?'Choose a carbohydrate source':'اختر مصدر الكربوهيدرات'}</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{carbs.map(food=><button type="button" key={food.id} onClick={()=>{setCarbFood(food);setStep(3);}} className="rounded-xl bg-white px-3 py-3 text-sm shadow-sm hover:bg-qawam-100">{name(food)}</button>)}</div>{!carbs.length&&<p className="text-sm text-slate-500">{en?'No carbohydrate items available.':'ما فيه أصناف مناسبة متاحة في القاعدة.'}</p>}</>}
   {step===3&&proteinFood&&carbFood&&<><p className="mb-3 font-bold">{en?'Set the amount for each food':'حدد كمية كل صنف بالجرام'}</p><div className="grid gap-3 sm:grid-cols-2">{[[proteinFood,proteinGrams,setProteinGrams],[carbFood,carbGrams,setCarbGrams]].map(([food,amount,setAmount]:any,index)=><div key={food.id} className="rounded-xl bg-white p-3"><strong>{name(food)}</strong><label className="field-label mt-2">{en?'Amount in grams':'الكمية بالجرام'}</label><input className="field" type="number" min="1" max="5000" step="1" value={amount} onChange={e=>setAmount(e.target.value)}/><div className="mt-2 flex gap-2">{[100,150,200].map(v=><button type="button" key={v} className="rounded-lg bg-qawam-50 px-3 py-1 text-xs font-bold" onClick={()=>setAmount(String(v))}>{v}غ</button>)}</div></div>)}</div><p className="mt-3 rounded-xl bg-white p-3 text-sm font-bold">{Math.round(totals.calories)} {en?'kcal':'سعرة'} · P {Math.round(totals.protein)}g · C {Math.round(totals.carbs)}g · F {Math.round(totals.fat)}g</p><button type="button" disabled={pending||!Number.isFinite(pg)||!Number.isFinite(cg)||pg<1||pg>5000||cg<1||cg>5000} className="primary-button mt-3 w-full" onClick={save}>{pending?(en?'Saving…':'جارٍ الحفظ…'):(en?'Log suggested meal':'اعتماد الوجبة وتسجيلها')}</button></>}
   {message&&<p role="status" className="mt-3 text-sm text-qawam-700">{message}</p>}
  </div>}
 </section>;
}