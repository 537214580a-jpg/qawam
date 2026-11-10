'use client';
import { useState, useTransition } from 'react';
import { addMeal } from '@/app/(client)/client/actions';

type Food = { id: string; name_ar: string; name_en?: string | null; calories: number; protein_g: number; carbs_g: number; fat_g: number };

export function GuidedFoodFlow({ foods, locale = 'ar' }: { foods: Food[]; locale?: 'ar' | 'en' }) {
  const en = locale === 'en';
  const foodName = (food: Food) => en ? (food.name_en || food.name_ar) : food.name_ar;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [meal, setMeal] = useState('وجبة رئيسية');
  const [food, setFood] = useState<Food | null>(null);
  const [grams, setGrams] = useState(150);
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  const meals = [{ value: 'إفطار', label: en ? 'Breakfast' : 'إفطار' }, { value: 'غداء', label: en ? 'Lunch' : 'غداء' }, { value: 'عشاء', label: en ? 'Dinner' : 'عشاء' }, { value: 'وجبة خفيفة', label: en ? 'Snack' : 'وجبة خفيفة' }];

  function save() {
    if (!food) return;
    const factor = grams / 100;
    const formData = new FormData();
    formData.set('name', food.name_ar);
    formData.set('grams', String(grams));
    formData.set('calories', String(Number(food.calories) * factor));
    formData.set('protein', String(Number(food.protein_g) * factor));
    formData.set('carbs', String(Number(food.carbs_g) * factor));
    formData.set('fat', String(Number(food.fat_g) * factor));
    formData.set('mealType', meal);
    formData.set('foodId', food.id);
    start(async () => {
      const result = await addMeal(formData);
      if ('error' in result) setMessage(result.error || (en ? 'Could not save the meal.' : 'تعذر حفظ الوجبة.'));
      else { setMessage(en ? `Logged ${foodName(food)} at ${grams} g.` : `تم تسجيل ${foodName(food)} بكمية ${grams} غرام.`); setStep(0); setFood(null); }
    });
  }

  return <section className="panel">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-extrabold">{en ? 'Guided logging' : 'مساعد التسجيل السريع'}</h2><p className="text-sm text-slate-500">{en ? 'Log a meal with a few taps.' : 'سجّل وجبتك بالضغط على اختيارات جاهزة.'}</p></div>
      <button className="secondary-button" onClick={() => { setOpen(!open); setStep(0); setMessage(''); }}>{open ? (en ? 'Close' : 'إغلاق') : (en ? 'Start' : 'ابدأ الاختيار')}</button>
    </div>
    {open && <div className="mt-4 rounded-xl bg-qawam-50 p-4">
      {step === 0 && <><p className="mb-3 font-bold">{en ? 'Which meal are you logging?' : 'ماذا تريد أن تسجل؟'}</p><div className="flex flex-wrap gap-2">{meals.map(item => <button key={item.value} onClick={() => { setMeal(item.value); setStep(1); }} className="secondary-button">{item.label}</button>)}</div></>}
      {step === 1 && <><p className="mb-3 font-bold">{en ? `Choose a food for ${meals.find(item => item.value === meal)?.label}` : `اختر طعامًا لـ ${meals.find(item => item.value === meal)?.label}`}</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{foods.slice(0, 32).map(item => <button key={item.id} onClick={() => { setFood(item); setStep(2); }} className="rounded-xl bg-white px-3 py-3 text-sm shadow-sm hover:bg-qawam-100">{foodName(item)}</button>)}</div></>}
      {step === 2 && food && <><p className="mb-3 font-bold">{en ? `How much ${foodName(food)}?` : `ما كمية ${foodName(food)}؟`}</p><div className="flex flex-wrap gap-2">{[100, 150, 200, 250, 300].map(amount => <button key={amount} onClick={() => setGrams(amount)} className={`rounded-xl px-4 py-3 font-bold ${grams === amount ? 'bg-qawam-950 text-white' : 'bg-white'}`}>{amount} {en ? 'g' : 'غ'}</button>)}</div><button disabled={pending} className="primary-button mt-4 w-full" onClick={save}>{pending ? (en ? 'Saving…' : 'جارٍ الحفظ…') : (en ? 'Log meal' : 'تسجيل الوجبة')}</button></>}
      {message && <p role="status" className="mt-3 text-sm text-qawam-700">{message}</p>}
    </div>}
  </section>;
}
