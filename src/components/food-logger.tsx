'use client';
import { useMemo, useState, useTransition } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useRouter } from 'next/navigation';
import { saveFoodMeal } from '@/app/(client)/client/meal-entry-actions';

type Food={id:string;name_ar:string;name_en:string|null;calories:number;protein_g:number;carbs_g:number;fat_g:number};
type FoodLine={food:Food;grams:number};
export function FoodLogger({foods,userId,locale='ar',photoMode=false}:{foods:Food[];userId:string;locale?:'ar'|'en';photoMode?:boolean}){
 const en=locale==='en';const foodName=(food:Food)=>en?(food.name_en||food.name_ar):food.name_ar;const router=useRouter();
 const [query,setQuery]=useState('');const [selected,setSelected]=useState<Food|null>(null);const [grams,setGrams]=useState(100);
 const [items,setItems]=useState<FoodLine[]>([]);const [mealType,setMealType]=useState('وجبة رئيسية');const [photoPath,setPhotoPath]=useState('');
 const [status,setStatus]=useState('');const [pending,start]=useTransition();
 const filtered=useMemo(()=>foods.filter(food=>food.name_ar.toLowerCase().includes(query.toLowerCase())||String(food.name_en||'').toLowerCase().includes(query.toLowerCase())).slice(0,10),[foods,query]);
 const totals=items.reduce((sum,item)=>{const ratio=item.grams/100;return{calories:sum.calories+Number(item.food.calories)*ratio,protein:sum.protein+Number(item.food.protein_g)*ratio,carbs:sum.carbs+Number(item.food.carbs_g)*ratio,fat:sum.fat+Number(item.food.fat_g)*ratio};},{calories:0,protein:0,carbs:0,fat:0});
 async function upload(file?:File){
  if(!file)return;
  if(!file.type.startsWith('image/')){setStatus(en?'Choose an image file.':'اختر ملف صورة.');return;}
  const db=createSupabaseBrowserClient();const ext=file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g,'')||'jpg';
  const path=`${userId}/meals/${crypto.randomUUID()}.${ext}`;
  const {error}=await db.storage.from('qawam-private').upload(path,file,{upsert:false,contentType:file.type});
  if(error){setStatus(en?'Could not upload the photo.':'تعذر رفع الصورة.');return;}
  setPhotoPath(path);setStatus(en?'Photo attached. Choose the foods and enter each weight.':'انرفعت الصورة. اختر الأصناف وأدخل وزن كل واحد.');
 }
 function addSelected(){
  if(!selected||grams<1||grams>5000)return;
  setItems(old=>[...old,{food:selected,grams}]);setSelected(null);setQuery('');setGrams(100);setStatus('');
 }
 function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(photoMode&&!photoPath){setStatus(en?'Upload the meal photo first.':'ارفع صورة الوجبة أولًا.');return;}
  if(!items.length){setStatus(en?'Add at least one food.':'أضف صنفًا واحدًا على الأقل.');return;}
  const form=new FormData();form.set('mealType',mealType);form.set('photoPath',photoPath);
  form.set('items',JSON.stringify(items.map(item=>({foodId:item.food.id,grams:item.grams}))));
  start(async()=>{const result=await saveFoodMeal(form);if('error'in result)setStatus(result.error||'تعذر حفظ الوجبة.');else{setStatus(en?'Meal saved.':'تم اعتماد الوجبة.');setItems([]);setPhotoPath('');router.refresh();}});
 }
 return <form onSubmit={submit} className="panel space-y-4">
  <div><p className="text-sm font-bold text-qawam-500">{photoMode?(en?'Photo meal':'وجبة بالصورة'):(en?'Food database':'قاعدة الأطعمة')}</p><h2 className="mt-1 font-extrabold">{photoMode?(en?'Add foods from your photo':'ارفع صورة الوجبة وأضف أصنافها'):(en?'Build your meal':'سجّل وجبتك من قاعدة الطعام')}</h2><p className="mt-1 text-sm text-slate-500">{photoMode?(en?'A photo cannot confirm ingredients or weights. Select each food from the database and enter its amount.':'الصورة ما تحدد مكونات الوجبة أو وزنها. اختر كل صنف من قاعدة قوام وأدخل كميته.'):(en?'Search the database, set any gram amount, and add multiple foods to one meal.':'ابحث في القاعدة وأدخل أي كمية بالجرام، أقل أو أكثر من 100، وأضف عدة أصناف في وجبة واحدة.')}</p></div>
  {photoMode&&<div><label className="field-label">{en?'Meal photo':'صورة الوجبة'}</label><input type="file" accept="image/*" capture="environment" className="field" onChange={e=>upload(e.target.files?.[0])}/>{photoPath&&<p className="mt-1 text-xs font-medium text-qawam-700">{en?'Photo uploaded securely.':'تم رفع الصورة بشكل خاص وآمن.'}</p>}</div>}
  <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
   <div><label className="field-label">{en?'Search foods':'ابحث عن صنف'}</label><input className="field" value={query} onChange={e=>setQuery(e.target.value)} placeholder={en?'e.g. rice, chicken, dates':'مثل: أرز، دجاج، تمر'}/>{query&&<div className="mt-1 max-h-56 overflow-auto rounded-xl border bg-white">{filtered.map(food=><button type="button" key={food.id} onClick={()=>{setSelected(food);setQuery(foodName(food));}} className="flex w-full justify-between border-b px-4 py-3 text-right last:border-0 hover:bg-qawam-50"><span>{foodName(food)}</span><span className="text-xs text-slate-500">{Math.round(Number(food.calories))} {en?'kcal/100 g':'سعرة/100غ'}</span></button>)}{!filtered.length&&<p className="p-4 text-sm text-slate-500">{en?'No matching foods found.':'الصنف غير موجود في قاعدة الطعام.'}</p>}</div>}</div>
   <div><label className="field-label">{en?'Amount (g)':'الكمية (غرام)'}</label><input className="field" type="number" min="1" max="5000" step="1" value={grams} onChange={e=>setGrams(Number(e.target.value))}/></div>
   <button type="button" disabled={!selected} onClick={addSelected} className="secondary-button self-end">{en?'Add food':'أضف الصنف'}</button>
  </div>
  {selected&&<div className="rounded-xl bg-qawam-50 p-3 text-sm"><strong>{foodName(selected)}</strong> · {Math.round(Number(selected.calories)*grams/100)} {en?'kcal':'سعرة'} · {en?'Protein':'بروتين'} {Math.round(Number(selected.protein_g)*grams/100)}{en?'g':'غ'}</div>}
  {items.length>0&&<div className="rounded-xl border"><ul className="divide-y">{items.map((item,index)=><li key={item.food.id+'-'+index} className="flex items-center justify-between gap-3 p-3 text-sm"><span>{foodName(item.food)} · {item.grams}{en?' g':'غ'}</span><button type="button" onClick={()=>setItems(old=>old.filter((_,i)=>i!==index))} className="text-red-600">{en?'Remove':'حذف'}</button></li>)}</ul><div className="border-t bg-qawam-50 p-3 text-sm font-bold">{Math.round(totals.calories)} {en?'kcal':'سعرة'} · P {Math.round(totals.protein)}{en?'g':'غ'} · C {Math.round(totals.carbs)}{en?'g':'غ'} · F {Math.round(totals.fat)}{en?'g':'غ'}</div></div>}
  <div><label className="field-label">{en?'Meal type':'نوع الوجبة'}</label><select className="field" value={mealType} onChange={e=>setMealType(e.target.value)}><option value="إفطار">{en?'Breakfast':'إفطار'}</option><option value="غداء">{en?'Lunch':'غداء'}</option><option value="عشاء">{en?'Dinner':'عشاء'}</option><option value="وجبة خفيفة">{en?'Snack':'وجبة خفيفة'}</option><option value="وجبة رئيسية">{en?'Main meal':'وجبة رئيسية'}</option></select></div>
  <button disabled={pending||items.length===0||(photoMode&&!photoPath)} className="primary-button w-full">{pending?(en?'Saving…':'جارٍ الحفظ…'):(en?'Approve meal':'اعتماد الوجبة')}</button>
  {status&&<p role="status" className="text-sm text-qawam-700">{status}</p>}
 </form>;
}