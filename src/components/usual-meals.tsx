'use client';
import { useState, useTransition } from 'react';
import { addMeal } from '@/app/(client)/client/actions';

type Recipe = { id: string; name: string; recipe_items: { grams: number; foods: { name_ar: string; name_en?: string | null; calories: number; protein_g: number; carbs_g: number; fat_g: number } | null }[] };

export function UsualMeals({ recipes, locale = 'ar' }: { recipes: Recipe[]; locale?: 'ar' | 'en' }) {
  const en = locale === 'en';
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();

  function log(recipe: Recipe) {
    const totals = recipe.recipe_items.reduce((sum, item) => {
      if (!item.foods) return sum;
      const food = item.foods;
      const factor = Number(item.grams) / 100;
      return {
        calories: sum.calories + Number(food.calories) * factor,
        protein: sum.protein + Number(food.protein_g) * factor,
        carbs: sum.carbs + Number(food.carbs_g) * factor,
        fat: sum.fat + Number(food.fat_g) * factor,
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    const formData = new FormData();
    formData.set('name', recipe.name);
    formData.set('grams', '100');
    formData.set('calories', String(totals.calories));
    formData.set('protein', String(totals.protein));
    formData.set('carbs', String(totals.carbs));
    formData.set('fat', String(totals.fat));
    formData.set('mealType', 'وجبة معتادة');
    start(async () => {
      const result = await addMeal(formData);
      setMessage('error' in result && result.error ? result.error : (en ? `Logged ${recipe.name}.` : `تم تسجيل ${recipe.name}.`));
    });
  }

  return <section>
    <h2 className="mb-3 text-lg font-extrabold">{en ? 'My usual meals' : 'وجباتي المعتادة'}</h2>
    {!recipes.length ? <div className="panel text-sm text-slate-500">{en ? 'Save a recipe to see it here for quick logging.' : 'احفظ وصفة من الحاسبة لتظهر هنا كوجبة معتادة.'}</div> :
      <div className="grid gap-3 sm:grid-cols-2">{recipes.map(recipe => <article key={recipe.id} className="panel">
        <h3 className="font-bold">{recipe.name}</h3>
        <p className="mt-1 text-sm text-slate-500">{recipe.recipe_items.map(item => `${item.foods?(en?(item.foods.name_en||item.foods.name_ar):item.foods.name_ar):(en?'Ingredient':'مكوّن')} ${item.grams}${en?' g':'غ'}`).join(' · ')}</p>
        <button onClick={() => log(recipe)} disabled={pending} className="secondary-button mt-3">{pending ? (en ? 'Saving…' : 'جارٍ التسجيل…') : (en ? 'Log this meal' : 'تسجيل هذه الوجبة')}</button>
      </article>)}</div>}
    {message && <p role="status" className="mt-2 text-sm text-qawam-700">{message}</p>}
  </section>;
}
