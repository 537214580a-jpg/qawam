'use client';
import { useMemo, useState, useTransition } from 'react';
import { saveRecipe } from '@/app/(client)/client/actions';

type Food = { id: string; name_ar: string; name_en?: string | null; calories: number; protein_g: number; carbs_g: number; fat_g: number };

export function RecipeCalculator({ foods, locale = 'ar' }: { foods: Food[]; locale?: 'ar' | 'en' }) {
  const en = locale === 'en';
  const foodName = (food: Food) => en ? (food.name_en || food.name_ar) : food.name_ar;
  const [name, setName] = useState('');
  const [foodId, setFoodId] = useState(foods[0]?.id || '');
  const [grams, setGrams] = useState(100);
  const [items, setItems] = useState<{ foodId: string; grams: number }[]>([]);
  const [notice, setNotice] = useState('');
  const [pending, start] = useTransition();
  const chosen = foods.find(food => food.id === foodId);
  const totals = useMemo(() => items.reduce((sum, item) => {
    const food = foods.find(value => value.id === item.foodId);
    if (!food) return sum;
    const factor = item.grams / 100;
    return {
      calories: sum.calories + Number(food.calories) * factor,
      protein: sum.protein + Number(food.protein_g) * factor,
      carbs: sum.carbs + Number(food.carbs_g) * factor,
      fat: sum.fat + Number(food.fat_g) * factor,
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 }), [items, foods]);

  function add() {
    if (chosen && grams > 0) { setItems(previous => [...previous, { foodId, grams }]); setNotice(''); }
  }

  function save() {
    const formData = new FormData();
    formData.set('name', name);
    formData.set('servings', '1');
    formData.set('items', JSON.stringify(items));
    start(async () => {
      const result = await saveRecipe(formData);
      setNotice('error' in result && result.error ? result.error : (en ? 'Recipe saved to your usual meals.' : 'تم حفظ الوصفة ضمن وجباتك المعتادة.'));
      if ('success' in result) setItems([]);
    });
  }

  return <section className="panel">
    <h2 className="font-extrabold">{en ? 'Recipe calculator' : 'حاسبة الوصفات'}</h2>
    <p className="mb-4 mt-1 text-sm text-slate-500">{en ? 'Add ingredients by weight to calculate the recipe total.' : 'أضف المكونات بالغرام لحساب إجمالي الوصفة.'}</p>
    <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
      <select aria-label={en ? 'Ingredient' : 'المكوّن'} className="field" value={foodId} onChange={event => setFoodId(event.target.value)}>{foods.map(food => <option key={food.id} value={food.id}>{foodName(food)}</option>)}</select>
      <input aria-label={en ? 'Amount in grams' : 'الكمية بالغرام'} className="field" type="number" min="1" value={grams} onChange={event => setGrams(Number(event.target.value))} />
      <button type="button" onClick={add} className="secondary-button">{en ? 'Add ingredient' : 'إضافة مكوّن'}</button>
    </div>
    {items.length > 0 && <>
      <ul className="my-4 divide-y rounded-xl border">{items.map((item, index) => <li key={`${item.foodId}-${index}`} className="flex justify-between p-3 text-sm">
        <span>{foodName(foods.find(food => food.id === item.foodId) || { id: '', name_ar: en ? 'Ingredient' : 'مكوّن', name_en: null, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })} · {item.grams} {en ? 'g' : 'غ'}</span>
        <button type="button" className="text-red-600" onClick={() => setItems(items.filter((_, current) => current !== index))}>{en ? 'Remove' : 'حذف'}</button>
      </li>)}</ul>
      <div className="rounded-xl bg-qawam-50 p-4 text-sm font-bold">{en ? 'Total' : 'الإجمالي'}: {Math.round(totals.calories)} {en ? 'kcal' : 'سعرة'} · {en ? 'Protein' : 'بروتين'} {Math.round(totals.protein)}{en ? ' g' : 'غ'} · {en ? 'Carbs' : 'كارب'} {Math.round(totals.carbs)}{en ? ' g' : 'غ'} · {en ? 'Fat' : 'دهون'} {Math.round(totals.fat)}{en ? ' g' : 'غ'}</div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]"><input className="field" value={name} onChange={event => setName(event.target.value)} placeholder={en ? 'Recipe name' : 'اسم الوصفة'} /><button type="button" onClick={save} disabled={pending} className="primary-button">{pending ? (en ? 'Saving…' : 'جارٍ الحفظ…') : (en ? 'Save as usual meal' : 'احفظ كوجبة معتادة')}</button></div>
    </>}
    {notice && <p role="status" className="mt-3 text-sm text-qawam-700">{notice}</p>}
  </section>;
}
