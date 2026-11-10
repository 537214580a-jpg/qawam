'use client';
import { useMemo, useState, useTransition } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useRouter } from 'next/navigation';
import { addMeal } from '@/app/(client)/client/actions';

type Food = { id: string; name_ar: string; name_en: string | null; calories: number; protein_g: number; carbs_g: number; fat_g: number };

export function FoodLogger({ foods, userId, locale = 'ar' }: { foods: Food[]; userId: string; locale?: 'ar' | 'en' }) {
  const en = locale === 'en';
  const foodName = (food: Food) => en ? (food.name_en || food.name_ar) : food.name_ar;
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState(100);
  const [mealType, setMealType] = useState('وجبة رئيسية');
  const [photoPath, setPhotoPath] = useState('');
  const [status, setStatus] = useState('');
  const [pending, start] = useTransition();
  const filtered = useMemo(() => foods.filter(food =>
    food.name_ar.toLowerCase().includes(query.toLowerCase()) ||
    String(food.name_en || '').toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8), [foods, query]);

  async function upload(file?: File) {
    if (!file) return;
    const db = createSupabaseBrowserClient();
    const ext = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
    const path = `${userId}/meals/${crypto.randomUUID()}.${ext}`;
    const { error } = await db.storage.from('qawam-private').upload(path, file, { upsert: false, contentType: file.type });
    if (error) { setStatus(en ? 'Could not upload the photo.' : 'تعذر رفع الصورة.'); return; }
    setPhotoPath(path);
    setStatus(en ? 'Meal photo attached. Enter amounts manually.' : 'تم إرفاق صورة الوجبة. أدخل الكميات يدويًا.');
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) { setStatus(en ? 'Choose a food from the search results.' : 'اختر طعامًا من نتائج البحث.'); return; }
    const formData = new FormData();
    const factor = grams / 100;
    formData.set('name', selected.name_ar);
    formData.set('grams', String(grams));
    formData.set('calories', String(Number(selected.calories) * factor));
    formData.set('protein', String(Number(selected.protein_g) * factor));
    formData.set('carbs', String(Number(selected.carbs_g) * factor));
    formData.set('fat', String(Number(selected.fat_g) * factor));
    formData.set('mealType', mealType);
    formData.set('foodId', selected.id);
    formData.set('photoPath', photoPath);
    start(async () => {
      const result = await addMeal(formData);
      if ('error' in result) setStatus(result.error);
      else { setStatus(en ? 'Meal logged.' : 'تم تسجيل الوجبة.'); setSelected(null); setGrams(100); setPhotoPath(''); router.refresh(); }
    });
  }

  return (
    <form onSubmit={submit} className="panel space-y-4">
      <h2 className="font-extrabold">{en ? 'Log food' : 'تسجيل طعام'}</h2>
      <div>
        <label className="field-label">{en ? 'Search foods' : 'ابحث عن الطعام'}</label>
        <input className="field" value={query} onChange={event => setQuery(event.target.value)} placeholder={en ? 'e.g. rice, chicken, dates' : 'مثل: أرز، دجاج، تمر'} />
        {query && <div className="mt-2 max-h-56 overflow-auto rounded-xl border bg-white">
          {filtered.map(food => <button type="button" key={food.id} onClick={() => { setSelected(food); setQuery(foodName(food)); }} className="flex w-full justify-between border-b px-4 py-3 text-right last:border-0 hover:bg-qawam-50">
            <span>{foodName(food)}</span><span className="text-xs text-slate-500">{Math.round(Number(food.calories))} {en ? 'kcal/100 g' : 'سعرة/100غ'}</span>
          </button>)}
          {!filtered.length && <p className="p-4 text-sm text-slate-500">{en ? 'No matching foods found.' : 'لا توجد نتائج مطابقة.'}</p>}
        </div>}
      </div>
      {selected && <div className="rounded-xl bg-qawam-50 p-4">
        <div className="flex items-center justify-between"><strong>{foodName(selected)}</strong><button type="button" onClick={() => { setSelected(null); setQuery(''); }} className="text-sm text-red-600">{en ? 'Remove' : 'إزالة'}</button></div>
        <label className="field-label mt-3">{en ? 'Amount (grams)' : 'الكمية بالغرام'}</label>
        <input className="field" type="number" min="1" max="5000" value={grams} onChange={event => setGrams(Number(event.target.value))} />
        <p className="mt-2 text-xs text-slate-600">{Math.round(Number(selected.calories) * grams / 100)} {en ? 'kcal · Protein' : 'سعرة · بروتين'} {Math.round(Number(selected.protein_g) * grams / 100)}{en ? ' g · Carbs ' : 'غ · كارب '}{Math.round(Number(selected.carbs_g) * grams / 100)}{en ? ' g · Fat ' : 'غ · دهون '}{Math.round(Number(selected.fat_g) * grams / 100)}{en ? ' g' : 'غ'}</p>
      </div>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="field-label">{en ? 'Meal type' : 'نوع الوجبة'}</label><select className="field" value={mealType} onChange={event => setMealType(event.target.value)}>
          <option value="إفطار">{en ? 'Breakfast' : 'إفطار'}</option><option value="غداء">{en ? 'Lunch' : 'غداء'}</option><option value="عشاء">{en ? 'Dinner' : 'عشاء'}</option><option value="وجبة خفيفة">{en ? 'Snack' : 'وجبة خفيفة'}</option><option value="وجبة رئيسية">{en ? 'Main meal' : 'وجبة رئيسية'}</option>
        </select></div>
        <div><label className="field-label">{en ? 'Meal photo (optional)' : 'صورة الوجبة (اختياري)'}</label><input type="file" accept="image/*" capture="environment" className="field" onChange={event => upload(event.target.files?.[0])} /></div>
      </div>
      <button disabled={pending || !selected} className="primary-button w-full">{pending ? (en ? 'Saving…' : 'جارٍ الحفظ…') : (en ? 'Log meal' : 'تسجيل الوجبة')}</button>
      {status && <p role="status" className="text-sm text-qawam-700">{status}</p>}
    </form>
  );
}
