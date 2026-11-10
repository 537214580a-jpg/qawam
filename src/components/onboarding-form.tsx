'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveOnboarding } from '@/app/(client)/client/onboarding/actions';
import { calculateTargets } from '@/lib/nutrition';

type FormState={
 age:string;sex:'female'|'male'|'other';height:string;weight:string;targetWeight:string;activity:string;
 goal:'cut'|'bulk'|'maintain';startDate:string;allergies:string;preferences:string;dislikes:string;medicalNotes:string;
};
const initialDate=()=>{
 const d=new Date();
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
};
const conditions=[
 ['diabetes','السكري'],['hypertension','ارتفاع ضغط الدم'],['heart_disease','أمراض القلب'],
 ['high_cholesterol','ارتفاع الكوليسترول'],['insulin_resistance','مقاومة الإنسولين'],
 ['kidney_disease','أمراض الكلى'],['food_allergies','حساسية الطعام'],['pcos','تكيس المبايض'],['other','حالة أخرى']
] as const;
export function OnboardingForm(){
 const [step,setStep]=useState(0);const [pending,start]=useTransition();const [error,setError]=useState('');
 const router=useRouter();
 const [values,setValues]=useState<FormState>({age:'',sex:'female',height:'',weight:'',targetWeight:'',activity:'1.2',goal:'cut',startDate:initialDate(),allergies:'',preferences:'',dislikes:'',medicalNotes:''});
 const [selected,setSelected]=useState<string[]>([]);
 function field<K extends keyof FormState>(key:K,value:FormState[K]){setValues(old=>({...old,[key]:value}));}
 function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();setError('');
  if(step<2){setStep(step+1);return;}
  const form=new FormData();
  Object.entries(values).forEach(([key,value])=>form.set(key,value));
  selected.forEach(value=>form.append('conditions',value));
  form.set('consent','yes');
  if(!(event.currentTarget.elements.namedItem('consent') as HTMLInputElement)?.checked){setError('وافق على معالجة البيانات الصحية عشان نكمل إعداد ملفك.');return;}
  start(async()=>{const result=await saveOnboarding(form);if('error'in result)setError(result.error||'تعذر الحفظ. حاول مرة ثانية.');else router.push('/client');});
 }
 const validBasics=Number(values.age)>=13&&Number(values.height)>=100&&Number(values.weight)>=30;
 const target=validBasics?calculateTargets({age:Number(values.age),sex:values.sex,heightCm:Number(values.height),weightKg:Number(values.weight),activity:Number(values.activity),goal:values.goal}):null;
 const conditionTips=selected.length>0
  ?['تظهر هذه المعلومات لأخصائيك لتخصيص المتابعة. لا يغيّر التطبيق الخطة الطبية تلقائيًا.','إذا كانت لديك حالة صحية أو أدوية، راجع توصيات الخطة مع أخصائيك المعالج.']
  :[];
 return <form onSubmit={submit} className="panel space-y-5">
  <div className="flex items-center justify-between"><div><p className="text-sm font-bold text-qawam-500">خطوتك الأولى</p><h2 className="text-xl font-extrabold">{step===0?'بياناتك الأساسية':step===1?'صحتك وتفضيلاتك':'راجع خطة البداية'}</h2></div><span className="rounded-full bg-qawam-50 px-3 py-1 text-sm font-bold text-qawam-700">{step+1} / 3</span></div>
  {step===0&&<div className="grid gap-4 sm:grid-cols-2">
   <div><label className="field-label">العمر</label><input name="age" type="number" min="13" max="100" className="field" value={values.age} onChange={e=>field('age',e.target.value)} required/></div>
   <div><label className="field-label">الجنس</label><select name="sex" className="field" value={values.sex} onChange={e=>field('sex',e.target.value as FormState['sex'])}><option value="female">أنثى</option><option value="male">ذكر</option><option value="other">أفضل عدم التحديد</option></select></div>
   <div><label className="field-label">الطول (سم)</label><input name="height" type="number" min="100" max="240" step="0.1" className="field" value={values.height} onChange={e=>field('height',e.target.value)} required/></div>
   <div><label className="field-label">الوزن الحالي (كجم)</label><input name="weight" type="number" min="30" max="350" step="0.1" className="field" value={values.weight} onChange={e=>field('weight',e.target.value)} required/></div>
   <div><label className="field-label">الوزن المستهدف (اختياري، كجم)</label><input name="targetWeight" type="number" min="20" max="500" step="0.1" className="field" value={values.targetWeight} onChange={e=>field('targetWeight',e.target.value)}/></div>
   <div><label className="field-label">النشاط اليومي</label><select name="activity" className="field" value={values.activity} onChange={e=>field('activity',e.target.value)}><option value="1.2">قليل الحركة</option><option value="1.375">نشاط خفيف (1–3 أيام)</option><option value="1.55">نشاط متوسط (3–5 أيام)</option><option value="1.725">نشاط عالٍ (6–7 أيام)</option><option value="1.9">نشاط عالٍ جدًا</option></select></div>
   <div className="sm:col-span-2"><label className="field-label">هدفك</label><select name="goal" className="field" value={values.goal} onChange={e=>field('goal',e.target.value as FormState['goal'])}><option value="cut">خفض الوزن</option><option value="maintain">المحافظة على الوزن</option><option value="bulk">زيادة الوزن</option></select></div>
  </div>}
  {step===1&&<div className="space-y-4">
   <div><p className="field-label">هل عندك حالة صحية مشخصة؟ اختر كل ما ينطبق</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{conditions.map(([value,label])=><label key={value} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm"><input type="checkbox" checked={selected.includes(value)} onChange={e=>setSelected(old=>e.target.checked?[...old,value]:old.filter(x=>x!==value))} className="accent-qawam-500"/>{label}</label>)}</div><p className="mt-2 text-xs text-slate-500">اختيار الحالة للتسجيل والمتابعة فقط، والخطة يحددها الأخصائي.</p></div>
   <div className="grid gap-4 sm:grid-cols-2"><div><label className="field-label">الحساسية الغذائية</label><textarea className="field min-h-20" value={values.allergies} onChange={e=>field('allergies',e.target.value)} placeholder="اكتب الأطعمة التي تسبب لك حساسية"/></div><div><label className="field-label">أطعمة تحبها</label><textarea className="field min-h-20" value={values.preferences} onChange={e=>field('preferences',e.target.value)} placeholder="وش الأكل اللي تفضله؟"/></div><div><label className="field-label">أطعمة ما تفضلها</label><textarea className="field min-h-20" value={values.dislikes} onChange={e=>field('dislikes',e.target.value)} placeholder="اكتب الأطعمة غير المرغوبة"/></div><div><label className="field-label">تفاصيل صحية إضافية (اختياري)</label><textarea className="field min-h-20" value={values.medicalNotes} onChange={e=>field('medicalNotes',e.target.value)} placeholder="تفاصيل تبي أخصائيك يعرفها"/></div></div>
   <div><label className="field-label">متى تبدأ رحلتك؟</label><input name="startDate" type="date" min={initialDate()} className="field" value={values.startDate} onChange={e=>field('startDate',e.target.value)} required/><p className="mt-1 text-xs text-slate-500">نبدأ المتابعة اليومية من التاريخ اللي تختاره.</p></div>
  </div>}
  {step===2&&<div className="space-y-4">
   <div className="rounded-2xl bg-qawam-50 p-4"><h3 className="font-extrabold">ملخص ملفك</h3><p className="mt-2 text-sm text-slate-600">{values.age} سنة · {values.height} سم · {values.weight} كجم · {values.goal==='cut'?'خفض الوزن':values.goal==='bulk'?'زيادة الوزن':'المحافظة'} · البداية {values.startDate}</p>{values.targetWeight&&<p className="mt-1 text-sm text-slate-600">الوزن المستهدف: {values.targetWeight} كجم</p>}
    {target?<div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{[['السعرات',target.calories+' سعرة'],['البروتين',target.protein+' غ'],['الكربوهيدرات',target.carbs+' غ'],['الدهون',target.fat+' غ']].map(([label,value])=><div key={label} className="rounded-xl bg-white p-3"><span className="block text-xs text-slate-500">{label}</span><strong>{value}</strong></div>)}</div>:<p className="mt-3 text-sm text-amber-700">ارجع للخطوة الأولى وأدخل بيانات الجسم لحساب احتياج تقريبي.</p>}
   </div>
   {conditionTips.length>0&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">{conditionTips.map(tip=><p key={tip}>{tip}</p>)}</div>}
   <label className="flex gap-3 rounded-xl bg-white p-4 text-sm leading-6 ring-1 ring-slate-200"><input type="checkbox" name="consent" value="yes" required className="mt-1 accent-qawam-500"/><span>أوافق صراحةً على معالجة بياناتي الصحية والقياسات لتقديم خدمة التغذية والمتابعة. سُجلت الموافقة ونسخة السياسة وتاريخها، ويمكنني طلب نسخة من بياناتي.</span></label>
  </div>}
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  <div className="flex gap-3">{step>0&&<button type="button" onClick={()=>{setError('');setStep(step-1);}} className="secondary-button flex-1">السابق</button>}<button disabled={pending|| (step===0&&!validBasics)} className="primary-button flex-1">{pending?'جارٍ الحفظ…':step<2?'التالي':'حفظ وبدء الرحلة'}</button></div>
 </form>;
}