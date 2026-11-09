import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const styles = StyleSheet.create({
  page: { padding: 34, fontSize: 11, fontFamily: 'Helvetica', color: '#173628' },
  title: { fontSize: 20, marginBottom: 12, color: '#0B2E1F', textAlign: 'right' },
  section: { marginTop: 12, padding: 12, backgroundColor: '#F6FAF8', borderRadius: 8 },
  label: { fontSize: 13, marginBottom: 7, color: '#0B2E1F', textAlign: 'right' },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 0.5, borderColor: '#dce8e0' },
  text: { textAlign: 'right' },
  muted: { color: '#64748B', fontSize: 9, textAlign: 'right', marginTop: 8 }
});

type ReportProps = {
  name: string;
  period: string;
  metrics: { calories: number; protein: number; adherence: number };
  meals: any[];
  weights: any[];
  checkin: any;
};

function Report({ name, period, metrics, meals, weights, checkin }: ReportProps) {
  const h = React.createElement;
  const row = (left: string, right: string, key: string) => h(View, { key, style: styles.row }, h(Text, null, left), h(Text, null, right));
  const section = (label: string, ...children: React.ReactNode[]) => h(View, { style: styles.section }, h(Text, { style: styles.label }, label), ...children);

  return h(Document, { title: `تقرير قوام - ${name}` },
    h(Page, { size: 'A4', style: styles.page },
      h(Text, { style: styles.title }, 'تقرير المتابعة الأسبوعي | قوام'),
      h(Text, { style: styles.text }, name),
      h(Text, { style: styles.muted }, period),
      section('ملخص الأسبوع',
        row(`${metrics.calories} سعرة`, 'متوسط السعرات المسجلة', 'calories'),
        row(`${metrics.protein} غ`, 'متوسط البروتين المسجل', 'protein'),
        row(`${metrics.adherence}%`, 'الالتزام حسب التقييم', 'adherence')),
      section('الوجبات المسجلة', ...(meals.length
        ? meals.map((meal: any) => row(new Date(meal.logged_at).toLocaleDateString('en-GB'), `${meal.meal_type} · ${(meal.meal_items || []).map((item: any) => item.name).join('، ')}`, meal.id))
        : [h(Text, { key: 'empty-meals', style: styles.text }, 'لا توجد وجبات مسجلة هذا الأسبوع.') ])),
      section('قياسات الوزن', ...(weights.length
        ? weights.map((weight: any) => row(`${weight.weight_kg} كجم`, weight.logged_on, weight.id))
        : [h(Text, { key: 'empty-weights', style: styles.text }, 'لا يوجد قياس هذا الأسبوع.') ])),
      section('التقييم الأسبوعي',
        h(Text, { style: styles.text }, checkin
          ? `النوم ${checkin.sleep_score}/10 · الجوع ${checkin.hunger_score}/10 · الطاقة ${checkin.energy_score}/10 · الالتزام ${checkin.adherence_pct}%`
          : 'لم يرسل العميل تقييم هذا الأسبوع.'),
        ...(checkin?.notes ? [h(Text, { key: 'notes', style: styles.muted }, `ملاحظات العميل: ${checkin.notes}`)] : [])),
      h(Text, { style: styles.muted }, 'أنشئ هذا التقرير تلقائيًا بواسطة منصة قوام. القيم الغذائية مبنية على السجلات التي أدخلها المستخدم.')));
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const db = await createSupabaseServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { data: client } = await db.from('clients').select('id,profiles(full_name)').eq('id', params.id).maybeSingle();
  if (!client) return NextResponse.json({ error: 'العميل غير موجود أو غير مصرح.' }, { status: 404 });

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const start = since.toISOString();
  const [{ data: meals }, { data: weights }, { data: checkin }] = await Promise.all([
    db.from('meal_logs').select('id,meal_type,logged_at,meal_items(name,calories,protein_g)').eq('client_id', params.id).gte('logged_at', start).order('logged_at'),
    db.from('weight_logs').select('id,logged_on,weight_kg').eq('client_id', params.id).gte('logged_on', start.slice(0, 10)).order('logged_on'),
    db.from('checkins').select('*').eq('client_id', params.id).gte('week_start', start.slice(0, 10)).order('week_start', { ascending: false }).limit(1).maybeSingle()
  ]);
  const items = (meals || []).flatMap((meal: any) => meal.meal_items || []);
  const days = Math.max(1, new Set((meals || []).map(meal => meal.logged_at.slice(0, 10))).size);
  const metrics = {
    calories: Math.round(items.reduce((sum: number, item: any) => sum + Number(item.calories || 0), 0) / days),
    protein: Math.round(items.reduce((sum: number, item: any) => sum + Number(item.protein_g || 0), 0) / days),
    adherence: checkin?.adherence_pct || 0
  };
  const buffer = await renderToBuffer(React.createElement(Report, {
    name: (client.profiles as any)?.full_name || 'عميل',
    period: `${since.toLocaleDateString('ar-SA')} — ${new Date().toLocaleDateString('ar-SA')}`,
    metrics,
    meals: meals || [],
    weights: weights || [],
    checkin
  }) as any);
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="qawam-weekly-${params.id}.pdf"`,
      'cache-control': 'private, no-store'
    }
  });
}
