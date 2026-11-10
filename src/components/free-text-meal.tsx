'use client';
import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { logFreeTextMeal } from '@/app/(client)/client/actions';

type MealPreview = {
  items: Array<{ name: string; grams: number }>;
  totals: { calories: number; protein: number; carbs: number; fat: number };
};

export function FreeTextMeal({ locale = 'ar' }: { locale?: 'ar' | 'en' }) {
  const en = locale === 'en';
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState('');
  const [mealType, setMealType] = useState('وجبة رئيسية');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<MealPreview | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setPreview(null);
    start(async () => {
      const formData = new FormData();
      formData.set('text', text);
      formData.set('mealType', mealType);
      const result = await logFreeTextMeal(formData);
      if ('preview' in result && result.preview) {
        setPreview(result.preview as MealPreview);
        return;
      }
      setMessage('error' in result && result.error
        ? result.error
        : en ? 'Could not recognize this meal. Please try again.' : 'ما تعرّفت على الوجبة. جرّب مرة ثانية.');
    });
  }

  function confirmMeal() {
    setMessage('');
    start(async () => {
      const formData = new FormData();
      formData.set('text', text);
      formData.set('mealType', mealType);
      formData.set('confirm', 'true');
      const result = await logFreeTextMeal(formData);
      if ('error' in result && result.error) {
        setMessage(result.error);
        return;
      }
      setPreview(null);
      setText('');
      setMessage(en ? 'Meal saved to your diary.' : 'تم تسجيل الوجبة.');
      router.refresh();
    });
  }

  return (
    <section className="panel space-y-4">
      <div>
        <p className="text-sm font-bold text-qawam-500">{en ? 'Quick logging' : 'تسجيل سريع'}</p>
        <h2 className="mt-1 text-lg font-extrabold">{en ? 'Describe your meal' : 'اكتب وجبتك بطريقتك'}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {en
            ? 'Enter each food and its amount in grams. QAWAM matches it with your food database, then shows the result for your review.'
            : 'اكتب الأصناف وكمياتها بالجرام. قوام يطابقها مع قاعدة الطعام ويعرض لك النتيجة قبل التسجيل.'}
        </p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <textarea
          className="field min-h-24 resize-y"
          value={text}
          onChange={event => setText(event.target.value)}
          maxLength={1000}
          required
          placeholder={en ? 'Example: cooked chicken 150 g, rice 150 g' : 'مثال: دجاج مطبوخ 150، أرز 150'}
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            className="field sm:max-w-56"
            value={mealType}
            onChange={event => setMealType(event.target.value)}
            aria-label={en ? 'Meal type' : 'نوع الوجبة'}
          >
            <option value="إفطار">{en ? 'Breakfast' : 'إفطار'}</option>
            <option value="غداء">{en ? 'Lunch' : 'غداء'}</option>
            <option value="عشاء">{en ? 'Dinner' : 'عشاء'}</option>
            <option value="وجبة خفيفة">{en ? 'Snack' : 'وجبة خفيفة'}</option>
            <option value="وجبة رئيسية">{en ? 'Main meal' : 'وجبة رئيسية'}</option>
          </select>
          <button disabled={pending || text.trim().length < 3} className="primary-button flex-1">
            {pending
              ? (en ? 'Checking the food database…' : 'جارٍ فحص قاعدة الطعام…')
              : (en ? 'Review meal' : 'راجع الوجبة')}
          </button>
        </div>
      </form>

      {preview && (
        <div className="rounded-2xl border border-qawam-200 bg-qawam-50 p-4" aria-live="polite">
          <h3 className="font-extrabold">{en ? 'Check the matched foods' : 'راجع الأصناف قبل التسجيل'}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {en
              ? 'Values are calculated from QAWAM’s food database per 100 g. Nothing has been saved yet.'
              : 'القيم محسوبة من قاعدة قوام لكل 100 غرام. ما تم حفظ الوجبة إلى الآن.'}
          </p>
          <ul className="mt-3 space-y-2">
            {preview.items.map((item, index) => (
              <li key={item.name + '-' + index} className="flex justify-between gap-3 text-sm">
                <span>{item.name}</span>
                <span className="font-bold">{item.grams} {en ? 'g' : 'غ'}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 rounded-xl bg-white p-3 text-sm font-semibold">
            {Math.round(preview.totals.calories)} {en ? 'kcal' : 'سعرة'}
            {' · '}{en ? 'Protein' : 'بروتين'} {Math.round(preview.totals.protein)}{en ? ' g' : 'غ'}
            {' · '}{en ? 'Carbs' : 'كارب'} {Math.round(preview.totals.carbs)}{en ? ' g' : 'غ'}
            {' · '}{en ? 'Fat' : 'دهون'} {Math.round(preview.totals.fat)}{en ? ' g' : 'غ'}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={confirmMeal} disabled={pending} className="primary-button flex-1">
              {pending ? (en ? 'Saving…' : 'جارٍ التسجيل…') : (en ? 'Confirm and log meal' : 'اعتماد الوجبة وتسجيلها')}
            </button>
            <button
              type="button"
              onClick={() => { setPreview(null); setMessage(''); }}
              disabled={pending}
              className="secondary-button"
            >
              {en ? 'Edit meal' : 'تعديل الوجبة'}
            </button>
          </div>
        </div>
      )}
      {message && <p role="status" className="rounded-xl bg-qawam-50 p-3 text-sm font-medium text-qawam-800">{message}</p>}
    </section>
  );
}
