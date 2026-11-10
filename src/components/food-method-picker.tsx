'use client';
import { useState } from 'react';
import { FoodLogger } from '@/components/food-logger';
import { FreeTextMeal } from '@/components/free-text-meal';
import { GuidedFoodFlow } from '@/components/guided-food-flow';
import { RecipeCalculator } from '@/components/recipe-calculator';
import { UsualMeals } from '@/components/usual-meals';

type Food={id:string;name_ar:string;name_en:string|null;calories:number;protein_g:number;carbs_g:number;fat_g:number};
type Method='text'|'database'|'guided'|'photo'|'recipe'|'usual';
export function FoodMethodPicker({foods,userId,recipes,locale='ar'}:{foods:Food[];userId:string;recipes:any[];locale?:'ar'|'en'}){
 const [method,setMethod]=useState<Method|null>(null);const en=locale==='en';
 const options:[Method,string,string][]=[
  ['text',en?'Write your meal':'اكتب وجبتك','اكتب الوجبة بالكلمات والكميات'],
  ['database',en?'Choose from foods':'اختر من قاعدة الطعام','ابحث وحدد الوزن بالجرام'],
  ['guided',en?'Help me choose':'ساعدني أختار','أسئلة قصيرة لاختيار صنف'],
  ['photo',en?'Upload a photo':'ارفع صورة','أضف المكونات والكميات بعد الصورة']
 ];
 const title:Record<Method,string>={text:en?'Write a meal':'اكتب وجبتك',database:en?'Food database':'اختيار من قاعدة الطعام',guided:en?'Guided food choice':'الاختيار الموجه',photo:en?'Photo meal':'رفع صورة الوجبة',recipe:en?'Recipe calculator':'حاسبة الوصفات',usual:en?'Usual meals':'وجباتي المعتادة'};
 return <div className="space-y-4">
  <section className="panel"><h2 className="font-extrabold">{en?'Choose how to log your meal':'كيف تبي تسجل وجبتك؟'}</h2><p className="mt-1 text-sm text-slate-500">{en?'Meal suggestions appear only after you request guided help.':'ما يفتح أي اختيار موجه إلا إذا ضغطت عليه.'}</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{options.map(([value,label,sub])=><button key={value} type="button" aria-pressed={method===value} onClick={()=>setMethod(value)} className={`rounded-xl border p-4 text-right transition ${method===value?'border-qawam-600 bg-qawam-50 ring-1 ring-qawam-600':'border-slate-200 bg-white hover:bg-slate-50'}`}><strong className="block">{label}</strong><span className="mt-1 block text-xs text-slate-500">{sub}</span></button>)}</div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={()=>setMethod('usual')} className="secondary-button">{en?'My usual meals':'وجباتي المعتادة'}</button><button type="button" onClick={()=>setMethod('recipe')} className="secondary-button">{en?'Recipe calculator':'حاسبة الوصفات'}</button></div></section>
  {method&&<section aria-live="polite"><div className="mb-2 flex items-center justify-between"><h2 className="font-extrabold">{title[method]}</h2><button type="button" className="text-sm text-slate-500" onClick={()=>setMethod(null)}>{en?'Change method':'تغيير الطريقة'}</button></div>
   {method==='text'&&<FreeTextMeal locale={locale}/>}
   {method==='database'&&<FoodLogger foods={foods} userId={userId} locale={locale}/>}
   {method==='guided'&&<GuidedFoodFlow foods={foods} locale={locale}/>}
   {method==='photo'&&<FoodLogger foods={foods} userId={userId} locale={locale} photoMode/>}
   {method==='recipe'&&<RecipeCalculator foods={foods} locale={locale}/>}
   {method==='usual'&&<UsualMeals recipes={recipes} locale={locale}/>}
  </section>}
 </div>;
}