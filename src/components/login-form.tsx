'use client';
import { useState, useTransition } from 'react';
import { sendOtp, verifyOtp } from '@/app/(auth)/login/actions';
import { useRouter } from 'next/navigation';
export function LoginForm() {
  const [channel, setChannel] = useState<'sms'|'email'>('sms');
  const [contact, setContact] = useState('');
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState<string | undefined>('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = sent ? await verifyOtp(data) : await sendOtp(data);
      setMessage('error' in result ? result.error : sent ? 'تم تسجيل الدخول.' : String(result.success));
      if (sent && 'success' in result) router.push('/');
      if (!sent && 'success' in result) setSent(true);
    });
  }
  return <form onSubmit={submit} className="rounded-3xl bg-white p-6 shadow-soft sm:p-8">
    <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1"><button type="button" onClick={()=>setChannel('sms')} className={`rounded-lg p-2 text-sm ${channel==='sms'?'bg-white shadow':''}`}>رقم الجوال</button><button type="button" onClick={()=>setChannel('email')} className={`rounded-lg p-2 text-sm ${channel==='email'?'bg-white shadow':''}`}>البريد الإلكتروني</button></div>
    <label className="field-label">{channel==='sms'?'رقم الجوال مع مفتاح الدولة':'البريد الإلكتروني'}</label>
    <input className="field" dir="ltr" type={channel==='sms'?'tel':'email'} value={contact} onChange={e=>setContact(e.target.value)} required placeholder={channel==='sms'?'+9665xxxxxxxx':'name@example.com'} />
    {sent && <><label className="field-label mt-4">رمز التحقق</label><input name="token" className="field text-center tracking-[.4em]" inputMode="numeric" pattern="([0-9]{6}|[0-9]{8})" minLength={6} maxLength={8} required placeholder="••••••••" /></>}
    <input type="hidden" name="contact" value={contact}/><input type="hidden" name="channel" value={channel}/>
    <button className="primary-button mt-5 w-full" disabled={pending}>{pending?'جارٍ الإرسال…':sent?'تأكيد الرمز':'إرسال رمز الدخول'}</button>
    {message && <p role="status" className="mt-4 text-center text-sm text-qawam-700">{message}</p>}
    <p className="mt-5 text-center text-xs leading-5 text-slate-500">بالمتابعة، توافق على شروط الاستخدام وإشعار الخصوصية.</p>
  </form>;
}
