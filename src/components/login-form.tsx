'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { sendOtp, verifyOtp } from '@/app/(auth)/login/actions';
import { useRouter } from 'next/navigation';

type Channel = 'sms' | 'email';

export function LoginForm({
  locale = 'ar',
  initialChannel = 'email',
  authError = false
}: {
  locale?: 'ar' | 'en';
  initialChannel?: Channel;
  authError?: boolean;
}) {
  const english = locale === 'en';
  const [channel, setChannel] = useState<Channel>(initialChannel);
  const [contact, setContact] = useState('');
  const [sent, setSent] = useState(false);
  const [emailLinkSent, setEmailLinkSent] = useState(false);
  const [message, setMessage] = useState(authError
    ? (english ? 'This sign-in link expired. Request a new one.' : 'انتهت صلاحية الرابط. اطلب رابطًا جديدًا.')
    : '');
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function chooseChannel(next: Channel) {
    setChannel(next);
    setSent(false);
    setEmailLinkSent(false);
    setMessage('');
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      if (channel === 'sms' && sent) {
        const result = await verifyOtp(data);
        if ('error' in result && result.error) {
          setMessage(result.error);
          return;
        }
        router.push('/');
        return;
      }

      const result = await sendOtp(data);
      if ('error' in result && result.error) {
        setMessage(result.error);
        return;
      }

      if (channel === 'email') {
        setEmailLinkSent(true);
        setMessage(english
          ? 'We sent a sign-in link. Open it on this device to finish creating your client account.'
          : 'أرسلنا رابط الدخول إلى بريدك. افتحه من هذا الجهاز لإكمال إنشاء حساب العميل.');
      } else {
        setSent(true);
        setMessage(english ? 'We sent you a verification code.' : 'أرسلنا لك رمز التحقق.');
      }
    });
  }

  return (
    <form onSubmit={submit} className="rounded-3xl bg-white p-6 shadow-soft sm:p-8">
      <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => chooseChannel('sms')}
          className={`rounded-lg p-2 text-sm ${channel === 'sms' ? 'bg-white shadow' : ''}`}
        >
          {english ? 'Phone' : 'رقم الجوال'}
        </button>
        <button
          type="button"
          onClick={() => chooseChannel('email')}
          className={`rounded-lg p-2 text-sm ${channel === 'email' ? 'bg-white shadow' : ''}`}
        >
          {english ? 'Email' : 'البريد الإلكتروني'}
        </button>
      </div>

      <label className="field-label">
        {channel === 'sms'
          ? (english ? 'Phone number' : 'رقم الجوال')
          : (english ? 'Email address' : 'البريد الإلكتروني')}
      </label>
      <input
        className="field"
        dir="ltr"
        type={channel === 'sms' ? 'tel' : 'email'}
        value={contact}
        onChange={event => setContact(event.target.value)}
        required
        placeholder={channel === 'sms' ? '+9665xxxxxxxx or 05xxxxxxxx' : 'name@example.com'}
        disabled={pending}
      />

      {sent && channel === 'sms' && (
        <>
          <label className="field-label mt-4">{english ? 'Verification code' : 'رمز التحقق'}</label>
          <input
            name="token"
            className="field text-center tracking-[.4em]"
            inputMode="numeric"
            pattern="([0-9]{6}|[0-9]{8})"
            minLength={6}
            maxLength={8}
            required
            placeholder="••••••••"
          />
        </>
      )}

      <input type="hidden" name="contact" value={contact} />
      <input type="hidden" name="channel" value={channel} />

      {emailLinkSent && channel === 'email' && (
        <p className="mt-4 rounded-xl bg-qawam-50 p-3 text-sm leading-6 text-qawam-800">
          {english
            ? 'Check your inbox and spam folder. The link is single-use and opens QAWAM on this device.'
            : 'تحقق من الوارد والرسائل غير المرغوبة. الرابط يُستخدم مرة واحدة ويفتح قوام على هذا الجهاز.'}
        </p>
      )}

      <button className="primary-button mt-5 w-full" disabled={pending || sent}>
        {pending
          ? (english ? 'Sending…' : 'جارٍ الإرسال…')
          : sent
            ? (english ? 'Verify code' : 'تأكيد الرمز')
            : emailLinkSent
              ? (english ? 'Send link again' : 'إعادة إرسال الرابط')
              : channel === 'email'
                ? (english ? 'Send sign-in link' : 'إرسال رابط الدخول')
                : (english ? 'Send code' : 'إرسال رمز الدخول')}
      </button>

      {message && <p role="status" className="mt-4 text-center text-sm text-qawam-700">{message}</p>}
      <p className="mt-5 text-center text-xs leading-5 text-slate-500">
        {english
          ? 'By continuing, you agree to the Terms of Use and Privacy Notice.'
          : 'بالمتابعة، توافق على شروط الاستخدام وإشعار الخصوصية.'}
      </p>
    </form>
  );
}
