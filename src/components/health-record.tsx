'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

const conditionSchema = z.object({
  condition_code: z.enum(['diabetes','hypertension','heart_disease','high_cholesterol','insulin_resistance','kidney_disease','food_allergy','pcos','other']),
  details: z.string().max(3000),
  diagnosed_on: z.string().max(10)
});
const labSchema = z.object({
  test_name: z.string().trim().min(1).max(160),
  result_value: z.string().trim().min(1).max(160),
  unit: z.string().max(40),
  reference_range: z.string().max(100),
  lab_name: z.string().max(160),
  tested_on: z.string().max(10),
  document_id: z.string().uuid().or(z.literal(''))
});
const readingSchema = z.object({
  reading_type: z.enum(['glucose','blood_pressure','other']),
  value_primary: z.coerce.number().min(0).max(100000),
  value_secondary: z.union([z.literal(''), z.coerce.number().min(0).max(100000)]),
  unit: z.string().trim().min(1).max(24),
  context: z.string().max(120),
  notes: z.string().max(1000)
});

type Locale = 'ar' | 'en';
type Doc = { id: string; original_filename: string; document_type: string; document_date: string | null; created_at: string; storage_path: string; signedUrl?: string };
type Condition = { id: string; condition_code: string; details: string; status: string; diagnosed_on: string | null; created_at: string };
type Lab = { id: string; test_name: string; result_value: string; unit: string; reference_range: string; lab_name: string; tested_on: string | null; document_id: string | null; created_at: string };
type Reading = { id: string; reading_type: string; value_primary: number; value_secondary: number | null; unit: string; context: string; notes: string; measured_at: string };

const conditionOptions = [
  ['diabetes','السكري','Diabetes'],
  ['hypertension','ارتفاع ضغط الدم','High blood pressure'],
  ['heart_disease','أمراض القلب','Heart disease'],
  ['high_cholesterol','ارتفاع الكوليسترول','High cholesterol'],
  ['insulin_resistance','مقاومة الإنسولين','Insulin resistance'],
  ['kidney_disease','أمراض الكلى','Kidney disease'],
  ['food_allergy','حساسية الطعام','Food allergy'],
  ['pcos','تكيس المبايض','PCOS'],
  ['other','حالة أخرى','Other condition']
] as const;

export function HealthRecord({ clientId, userId, locale, hasHealthConsent, readOnly=false }: { clientId: string; userId: string; locale: Locale; hasHealthConsent: boolean; readOnly?: boolean }) {
  const en = locale === 'en';
  const db = createSupabaseBrowserClient();
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const t = {
    title: en ? 'QAWAM CARE' : 'قوام كير',
    subtitle: en ? 'Your health record, kept private and organized.' : 'ملفك الصحي محفوظ بخصوصية ومرتب في مكان واحد.',
    consent: en ? 'Confirm health data consent before adding records.' : 'أكد موافقتك على معالجة البيانات الصحية قبل إضافة السجل.',
    consentLink: en ? 'Review consent' : 'مراجعة الموافقة',
    condition: en ? 'Health conditions' : 'الحالات الصحية',
    conditionText: en ? 'Add a condition you have shared with the clinic.' : 'أضف الحالة الصحية التي ترغب بمشاركتها مع العيادة.',
    choose: en ? 'Choose a condition' : 'اختر الحالة',
    details: en ? 'Details (optional)' : 'تفاصيل (اختياري)',
    diagnosed: en ? 'Diagnosis date (optional)' : 'تاريخ التشخيص (اختياري)',
    add: en ? 'Add condition' : 'إضافة الحالة',
    resolved: en ? 'Mark resolved' : 'تحديد كحالة منتهية',
    lab: en ? 'Lab results' : 'نتائج التحاليل',
    labHint: en ? 'Enter the result exactly as shown. It is saved as your confirmed entry.' : 'اكتب النتيجة كما هي في التقرير. تُحفظ بعد تأكيدك لها.',
    testName: en ? 'Test name' : 'اسم الفحص',
    result: en ? 'Result' : 'النتيجة',
    unit: en ? 'Unit' : 'الوحدة',
    range: en ? 'Printed reference range' : 'المجال المرجعي المطبوع',
    labName: en ? 'Laboratory' : 'المختبر',
    testedOn: en ? 'Test date' : 'تاريخ الفحص',
    doc: en ? 'Link a document (optional)' : 'اربط مستندًا (اختياري)',
    noDoc: en ? 'No document' : 'بدون مستند',
    saveLab: en ? 'Confirm and save result' : 'تأكيد وحفظ النتيجة',
    readings: en ? 'Health readings' : 'القراءات الصحية',
    readingType: en ? 'Reading type' : 'نوع القراءة',
    glucose: en ? 'Blood glucose' : 'سكر الدم',
    bp: en ? 'Blood pressure' : 'ضغط الدم',
    other: en ? 'Other reading' : 'قراءة أخرى',
    primary: en ? 'Value' : 'القيمة',
    secondary: en ? 'Second value (diastolic)' : 'القيمة الثانية (الانبساطي)',
    context: en ? 'Context (fasting, after meal…)' : 'الظرف (صائم، بعد الأكل...)',
    notes: en ? 'Notes (optional)' : 'ملاحظات (اختياري)',
    saveReading: en ? 'Save reading' : 'حفظ القراءة',
    documentsTitle: en ? 'Documents' : 'المستندات',
    documentsHint: en ? 'PDF or image, up to 10 MB. Uploaded documents stay private. No values are extracted automatically.' : 'PDF أو صورة، حتى 10 ميجابايت. المستندات خاصة ولا نستخرج منها نتائج تلقائيًا.',
    chooseFile: en ? 'Choose file' : 'اختيار ملف',
    upload: en ? 'Upload document' : 'رفع المستند',
    type: en ? 'Document type' : 'نوع المستند',
    report: en ? 'Medical report' : 'تقرير طبي',
    prescription: en ? 'Prescription' : 'وصفة طبية',
    labDocument: en ? 'Lab report' : 'تحليل مخبري',
    otherDocument: en ? 'Other' : 'أخرى',
    date: en ? 'Document date (optional)' : 'تاريخ المستند (اختياري)',
    noConditions: en ? 'No conditions added yet.' : 'ما أضفت حالات صحية حتى الآن.',
    noLabs: en ? 'No lab results added yet.' : 'ما أضفت نتائج تحاليل حتى الآن.',
    noReadings: en ? 'No health readings added yet.' : 'ما أضفت قراءات صحية حتى الآن.',
    noDocuments: en ? 'No documents uploaded yet.' : 'ما رفعت مستندات حتى الآن.',
    loading: en ? 'Loading your health record…' : 'جاري تحميل ملفك الصحي…',
    saved: en ? 'Saved.' : 'تم الحفظ.',
    uploadDone: en ? 'Document uploaded securely.' : 'تم رفع المستند بشكل خاص وآمن.',
    error: en ? 'Could not save. Check your connection and try again.' : 'ما قدرنا نحفظ البيانات. تحقق من الاتصال وحاول مرة ثانية.',
    badFile: en ? 'Choose a PDF or image no larger than 10 MB.' : 'اختر PDF أو صورة بحجم لا يتجاوز 10 ميجابايت.',
    time: en ? 'Recorded' : 'تاريخ التسجيل',
    confirmed: en ? 'Confirmed by you' : 'مؤكد من قبلك',
    source: en ? 'Self-reported' : 'مُدخل يدويًا',
    fileType: en ? 'Type' : 'النوع'
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [c, l, r, d] = await Promise.all([
      db.from('health_conditions').select('id,condition_code,details,status,diagnosed_on,created_at').eq('client_id', clientId).order('created_at', { ascending: false }),
      db.from('lab_results').select('id,test_name,result_value,unit,reference_range,lab_name,tested_on,document_id,created_at').eq('client_id', clientId).order('tested_on', { ascending: false }),
      db.from('health_readings').select('id,reading_type,value_primary,value_secondary,unit,context,notes,measured_at').eq('client_id', clientId).order('measured_at', { ascending: false }).limit(50),
      db.from('health_documents').select('id,original_filename,document_type,document_date,created_at,storage_path').eq('client_id', clientId).order('created_at', { ascending: false })
    ]);
    const firstError = c.error || l.error || r.error || d.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }
    const rows = (d.data || []) as Doc[];
    const withUrls = await Promise.all(rows.map(async (item) => {
      const { data } = await db.storage.from('qawam-private').createSignedUrl(item.storage_path, 1800);
      return { ...item, signedUrl: data?.signedUrl };
    }));
    setConditions((c.data || []) as Condition[]);
    setLabs((l.data || []) as Lab[]);
    setReadings((r.data || []) as Reading[]);
    setDocuments(withUrls);
    setLoading(false);
  }, [clientId, db]);

  useEffect(() => { void load(); }, [load]);

  async function addCondition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError(''); setNotice('');
    const data = new FormData(event.currentTarget);
    const parsed = conditionSchema.safeParse({
      condition_code: data.get('condition_code'),
      details: String(data.get('details') || '').trim(),
      diagnosed_on: String(data.get('diagnosed_on') || '')
    });
    if (!parsed.success) { setError(en ? 'Check the condition fields.' : 'راجع بيانات الحالة الصحية.'); return; }
    setSaving(true);
    const { diagnosed_on, ...fields } = parsed.data;
    const { error: insertError } = await db.from('health_conditions').insert({ ...fields, diagnosed_on: diagnosed_on || null, client_id: clientId, created_by: userId });
    setSaving(false);
    if (insertError) { setError(insertError.code === '23505' ? (en ? 'This active condition is already recorded.' : 'الحالة النشطة مسجلة مسبقًا.') : insertError.message); return; }
    form.reset(); setNotice(t.saved); await load();
  }

  async function resolveCondition(id: string) {
    setError(''); setNotice('');
    const { error: updateError } = await db.from('health_conditions').update({ status: 'resolved', updated_at: new Date().toISOString() }).eq('id', id);
    if (updateError) { setError(updateError.message); return; }
    setNotice(t.saved); await load();
  }

  async function addLab(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError(''); setNotice('');
    const data = new FormData(event.currentTarget);
    const parsed = labSchema.safeParse({
      test_name: data.get('test_name'), result_value: data.get('result_value'), unit: String(data.get('unit') || '').trim(),
      reference_range: String(data.get('reference_range') || '').trim(), lab_name: String(data.get('lab_name') || '').trim(),
      tested_on: String(data.get('tested_on') || ''), document_id: String(data.get('document_id') || '')
    });
    if (!parsed.success) { setError(en ? 'Enter the test name and confirmed result.' : 'أدخل اسم الفحص والنتيجة التي تأكدت منها.'); return; }
    setSaving(true);
    const value = parsed.data;
    const { error: insertError } = await db.from('lab_results').insert({
      client_id: clientId, test_name: value.test_name, result_value: value.result_value, unit: value.unit,
      reference_range: value.reference_range, lab_name: value.lab_name, tested_on: value.tested_on || null,
      document_id: value.document_id || null, source: value.document_id ? 'document' : 'manual', confirmed_by: userId,
      supersedes_id: null
    });
    setSaving(false);
    if (insertError) { setError(insertError.message); return; }
    form.reset(); setNotice(t.saved); await load();
  }

  async function addReading(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError(''); setNotice('');
    const data = new FormData(event.currentTarget);
    const parsed = readingSchema.safeParse({
      reading_type: data.get('reading_type'), value_primary: data.get('value_primary'),
      value_secondary: String(data.get('value_secondary') || ''), unit: data.get('unit'),
      context: String(data.get('context') || '').trim(), notes: String(data.get('notes') || '').trim()
    });
    if (!parsed.success) { setError(en ? 'Check the reading values.' : 'راجع قيم القراءة والوحدة.'); return; }
    const value = parsed.data;
    setSaving(true);
    const { error: insertError } = await db.from('health_readings').insert({
      client_id: clientId, reading_type: value.reading_type, value_primary: value.value_primary,
      value_secondary: value.value_secondary === '' ? null : value.value_secondary,
      unit: value.unit, context: value.context, notes: value.notes, created_by: userId
    });
    setSaving(false);
    if (insertError) { setError(insertError.message); return; }
    form.reset(); setNotice(t.saved); await load();
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(''); setNotice('');
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get('file');
    if (!(file instanceof File) || !['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type) || file.size < 1 || file.size > 10485760) {
      setError(t.badFile); return;
    }
    const docType = String(data.get('document_type') || '');
    if (!['lab_result','medical_report','prescription','other'].includes(docType)) { setError(t.error); return; }
    const date = String(data.get('document_date') || '');
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) { setError(t.error); return; }
    const extension = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1];
    const storagePath = userId + '/health/' + crypto.randomUUID() + '.' + extension;
    setSaving(true);
    const { error: uploadError } = await db.storage.from('qawam-private').upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) { setSaving(false); setError(uploadError.message); return; }
    const { error: insertError } = await db.from('health_documents').insert({
      client_id: clientId, uploaded_by: userId, storage_path: storagePath,
      original_filename: file.name.slice(0, 255), document_type: docType,
      content_type: file.type, byte_size: file.size, document_date: date || null
    });
    if (insertError) {
      await db.storage.from('qawam-private').remove([storagePath]);
      setSaving(false); setError(insertError.message); return;
    }
    setSaving(false); form.reset(); setNotice(t.uploadDone); await load();
  }

  const panel = 'rounded-3xl border border-slate-100 bg-white p-5 shadow-soft';
  const field = 'min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-qawam-500';
  const label = 'grid gap-1.5 text-sm font-semibold text-slate-700';
  const button = 'min-h-11 rounded-xl bg-qawam-900 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50';

  return <div dir={en ? 'ltr' : 'rtl'} className="mx-auto max-w-4xl space-y-5">
    <header><p className="text-sm font-bold text-qawam-500">QAWAM CARE</p><h1 className="mt-1 text-3xl font-extrabold">{t.title}</h1><p className="mt-2 text-sm text-slate-500">{t.subtitle}</p></header>
    {!hasHealthConsent && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{t.consent} <a href="/client/consent" className="ms-2 font-bold underline">{t.consentLink}</a></div>}
    {error && <div role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {notice && <div role="status" className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
    {loading ? <div className={panel} role="status">{t.loading}</div> : <>
      <section className={panel}>
        <div className="mb-4"><h2 className="text-xl font-extrabold">{t.condition}</h2><p className="mt-1 text-sm text-slate-500">{t.conditionText}</p></div>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={addCondition}>
          <label className={label}>{t.choose}<select className={field} name="condition_code" defaultValue="" required><option value="" disabled>{t.choose}</option>{conditionOptions.map(([code, ar, enLabel])=><option value={code} key={code}>{en ? enLabel : ar}</option>)}</select></label>
          <label className={label}>{t.diagnosed}<input className={field} type="date" name="diagnosed_on"/></label>
          <label className={label+' sm:col-span-2'}>{t.details}<textarea className={field} name="details" rows={2} maxLength={3000}/></label>
          <button className={button} disabled={saving || !hasHealthConsent || readOnly}>{saving ? (en?'Saving…':'جاري الحفظ…') : t.add}</button>
        </form>
        <div className="mt-5 divide-y divide-slate-100">{conditions.length === 0 ? <p className="py-3 text-sm text-slate-500">{t.noConditions}</p> : conditions.map(item=><article key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div><strong>{conditionOptions.find(([code])=>code===item.condition_code)?.[en?2:1] || item.condition_code}</strong>{item.details && <p className="mt-1 text-sm text-slate-500">{item.details}</p>}<p className="mt-1 text-xs text-slate-400">{item.status==='active'?(en?'Active':'نشطة'):(en?'Resolved':'منتهية')}</p></div>
          {item.status==='active' && !readOnly && <button type="button" onClick={()=>void resolveCondition(item.id)} className="text-sm font-bold text-qawam-700 underline">{t.resolved}</button>}
        </article>)}</div>
      </section>

      <section className={panel}>
        <div className="mb-4"><h2 className="text-xl font-extrabold">{t.lab}</h2><p className="mt-1 text-sm text-slate-500">{t.labHint}</p></div>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={addLab}>
          <label className={label}>{t.testName}<input className={field} name="test_name" maxLength={160} required/></label>
          <label className={label}>{t.result}<input className={field} name="result_value" maxLength={160} required/></label>
          <label className={label}>{t.unit}<input className={field} name="unit" maxLength={40}/></label>
          <label className={label}>{t.range}<input className={field} name="reference_range" maxLength={100}/></label>
          <label className={label}>{t.labName}<input className={field} name="lab_name" maxLength={160}/></label>
          <label className={label}>{t.testedOn}<input className={field} type="date" name="tested_on"/></label>
          <label className={label+' sm:col-span-2'}>{t.doc}<select className={field} name="document_id" defaultValue=""><option value="">{t.noDoc}</option>{documents.map(doc=><option key={doc.id} value={doc.id}>{doc.original_filename}</option>)}</select></label>
          <p className="sm:col-span-2 text-xs text-slate-500">{t.confirmed}</p>
          <button className={button} disabled={saving || !hasHealthConsent || readOnly}>{saving ? (en?'Saving…':'جاري الحفظ…') : t.saveLab}</button>
        </form>
        <div className="mt-5 divide-y divide-slate-100">{labs.length===0 ? <p className="py-3 text-sm text-slate-500">{t.noLabs}</p> : labs.map(item=><article key={item.id} className="py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2"><strong>{item.test_name}</strong><span className="font-bold text-qawam-700">{item.result_value} {item.unit}</span></div>
          <p className="mt-1 text-sm text-slate-500">{[item.tested_on, item.lab_name, item.reference_range && ((en?'Reference: ':'المرجع: ')+item.reference_range)].filter(Boolean).join(' · ')}</p>
          <p className="mt-1 text-xs text-slate-400">{t.confirmed} · {t.source}</p>
        </article>)}</div>
      </section>

      <section className={panel}>
        <div className="mb-4"><h2 className="text-xl font-extrabold">{t.readings}</h2></div>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={addReading}>
          <label className={label}>{t.readingType}<select className={field} name="reading_type" defaultValue="glucose"><option value="glucose">{t.glucose}</option><option value="blood_pressure">{t.bp}</option><option value="other">{t.other}</option></select></label>
          <label className={label}>{t.primary}<input className={field} type="number" name="value_primary" min="0" max="100000" step="any" required/></label>
          <label className={label}>{t.secondary}<input className={field} type="number" name="value_secondary" min="0" max="100000" step="any"/></label>
          <label className={label}>{t.unit}<input className={field} name="unit" maxLength={24} placeholder={en?'mmol/L, mg/dL, mmHg':'mmol/L أو mg/dL أو mmHg'} required/></label>
          <label className={label}>{t.context}<input className={field} name="context" maxLength={120}/></label>
          <label className={label}>{t.notes}<input className={field} name="notes" maxLength={1000}/></label>
          <button className={button} disabled={saving || !hasHealthConsent || readOnly}>{saving ? (en?'Saving…':'جاري الحفظ…') : t.saveReading}</button>
        </form>
        <div className="mt-5 divide-y divide-slate-100">{readings.length===0 ? <p className="py-3 text-sm text-slate-500">{t.noReadings}</p> : readings.map(item=><article key={item.id} className="py-3">
          <div className="flex flex-wrap justify-between gap-2"><strong>{item.reading_type==='glucose'?t.glucose:item.reading_type==='blood_pressure'?t.bp:t.other}</strong><span className="font-bold text-qawam-700">{item.value_primary}{item.value_secondary!==null?' / '+item.value_secondary:''} {item.unit}</span></div>
          <p className="mt-1 text-sm text-slate-500">{new Date(item.measured_at).toLocaleString(en?'en-US':'ar-SA')} {item.context && ' · '+item.context} {item.notes && ' · '+item.notes}</p>
        </article>)}</div>
      </section>

      <section className={panel}>
        <div className="mb-4"><h2 className="text-xl font-extrabold">{t.documentsTitle}</h2><p className="mt-1 text-sm text-slate-500">{t.documentsHint}</p></div>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={uploadDocument}>
          <label className={label}>{t.chooseFile}<input className={field} type="file" name="file" accept="application/pdf,image/jpeg,image/png,image/webp" required/></label>
          <label className={label}>{t.type}<select className={field} name="document_type" defaultValue="lab_result"><option value="lab_result">{t.labDocument}</option><option value="medical_report">{t.report}</option><option value="prescription">{t.prescription}</option><option value="other">{t.otherDocument}</option></select></label>
          <label className={label}>{t.date}<input className={field} type="date" name="document_date"/></label>
          <button className={button+' self-end'} disabled={saving || !hasHealthConsent || readOnly}>{saving ? (en?'Uploading…':'جاري الرفع…') : t.upload}</button>
        </form>
        <div className="mt-5 divide-y divide-slate-100">{documents.length===0 ? <p className="py-3 text-sm text-slate-500">{t.noDocuments}</p> : documents.map(doc=><article key={doc.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div><strong>{doc.original_filename}</strong><p className="mt-1 text-xs text-slate-500">{doc.document_date || doc.created_at.slice(0,10)} · {doc.document_type}</p></div>
          {doc.signedUrl && <a href={doc.signedUrl} target="_blank" rel="noreferrer" className="font-bold text-qawam-700 underline">{en?'Open private file':'فتح المستند الخاص'}</a>}
        </article>)}</div>
      </section>
    </>}
  </div>;
}
