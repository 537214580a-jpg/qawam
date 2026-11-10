'use client';

import { useState, useTransition } from 'react';
import { revokeConsent } from '@/app/(client)/client/settings/actions';

export function PrivacyControls({ locale = 'ar' }: { locale?: 'ar' | 'en' }) {
  const en = locale === 'en';
  const [notice, setNotice] = useState('');
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);

  async function remove() {
    const phrase = window.prompt(en
      ? 'To confirm, type exactly: احذف حسابي'
      : 'للتأكيد، اكتب: احذف حسابي');
    if (phrase !== 'احذف حسابي') return;
    const response = await fetch('/api/privacy/delete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ confirmation: phrase })
    });
    if (response.ok) {
      window.location.assign('/login');
      return;
    }
    setNotice(en ? 'Could not delete the account. Please try again.' : 'تعذر حذف الحساب. حاول مرة أخرى.');
  }

  return (
    <div dir={en ? 'ltr' : 'rtl'} className="space-y-4">
      <section className="panel">
        <h2 className="font-extrabold">{en ? 'Health data consent' : 'موافقة البيانات الصحية'}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {en
            ? 'QAWAM uses your health data to personalize nutrition targets and keep your follow-up record. You may withdraw consent at any time.'
            : 'تستخدم قوام بياناتك الصحية لتخصيص الأهداف الغذائية وحفظ سجل المتابعة. تقدر تسحب موافقتك في أي وقت.'}
        </p>
        <button
          className="secondary-button mt-4"
          disabled={pending}
          onClick={() => start(async () => {
            const result = await revokeConsent();
            if ('error' in result) setNotice(en ? 'Could not update consent. Please try again.' : result.error || 'تعذر تحديث الموافقة.');
            else window.location.assign('/client/consent');
          })}
        >
          {pending ? (en ? 'Updating…' : 'جارٍ التحديث…') : (en ? 'Withdraw consent' : 'سحب الموافقة')}
        </button>
      </section>

      <section className="panel">
        <h2 className="font-extrabold">{en ? 'A copy of your data' : 'نسخة من بياناتك'}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {en
            ? 'Download a JSON file with your profile, nutrition history, health records, plans, subscriptions, and messages.'
            : 'نزّل ملف JSON يحتوي بيانات حسابك وسجل الطعام والملف الصحي والخطط والاشتراكات والمحادثات.'}
        </p>
        <a className="secondary-button mt-4" href="/api/privacy/export">
          {en ? 'Download my data' : 'تنزيل بياناتي'}
        </a>
      </section>

      <section className="panel border-red-100">
        <h2 className="font-extrabold text-red-800">{en ? 'Delete account' : 'حذف الحساب'}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {en
            ? 'This permanently deletes your account and its linked records.'
            : 'سيؤدي ذلك إلى حذف حسابك والسجلات المرتبطة به بشكل نهائي.'}
        </p>
        <button
          className="mt-4 rounded-xl bg-red-700 px-4 py-2.5 font-bold text-white"
          onClick={() => setConfirm(true)}
        >
          {en ? 'Request account deletion' : 'طلب حذف الحساب'}
        </button>
        {confirm && (
          <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">
            <span>{en ? 'A confirmation phrase is required before deletion.' : 'سيظهر طلب تأكيد قبل تنفيذ الحذف.'}</span>
            <button onClick={remove} className="ms-3 font-bold underline">
              {en ? 'Continue' : 'متابعة الحذف'}
            </button>
            <button onClick={() => setConfirm(false)} className="ms-3 font-bold underline">
              {en ? 'Cancel' : 'إلغاء'}
            </button>
          </div>
        )}
      </section>

      {notice && <p role="status" className="text-sm text-qawam-700">{notice}</p>}
    </div>
  );
}
