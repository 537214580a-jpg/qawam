'use server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const schema = z.object({ contact: z.string().trim().min(5).max(254), channel: z.enum(['email','sms']) });
export async function sendOtp(formData: FormData) {
  const parsed = schema.safeParse({ contact: formData.get('contact'), channel: formData.get('channel') });
  if (!parsed.success) return { error: 'تحقق من رقم الجوال أو البريد الإلكتروني.' };
  const { contact, channel } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error } = channel === 'email'
    ? await supabase.auth.signInWithOtp({ email: contact, options: { shouldCreateUser: true } })
    : await supabase.auth.signInWithOtp({ phone: contact, options: { shouldCreateUser: true } });
  return error ? { error: 'تعذر إرسال رمز التحقق. تأكد من إعداد مزود الرسائل أو البريد.' } : { success: 'أرسلنا لك رمز التحقق.' };
}

const verifySchema = z.object({ contact: z.string().min(5), token: z.string().regex(/^(?:\d{6}|\d{8})$/), channel: z.enum(['email','sms']) });
export async function verifyOtp(formData: FormData) {
  const parsed = verifySchema.safeParse({ contact: formData.get('contact'), token: formData.get('token'), channel: formData.get('channel') });
  if (!parsed.success) return { error: 'أدخل رمز التحقق المكوّن من 6 أو 8 أرقام.' };
  const { contact, token, channel } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error } = channel === 'email'
    ? await supabase.auth.verifyOtp({ email: contact, token, type: 'email' })
    : await supabase.auth.verifyOtp({ phone: contact, token, type: 'sms' });
  if(error)return { error: 'الرمز غير صحيح أو انتهت صلاحيته.' };
  const locale=cookies().get('qawam_locale')?.value;
  if(locale==='ar'||locale==='en')await supabase.rpc('set_my_locale',{p_locale:locale});
  return { success: true };
}
