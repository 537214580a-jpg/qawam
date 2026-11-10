export function ReadOnlyNotice({locale='ar'}:{locale?:'ar'|'en'}) {
  const en=locale==='en';
  return <section role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
    <strong>{en?'Read-only mode':'حسابك في وضع المشاهدة فقط'}</strong>
    <p className="mt-1">{en?'Your subscription has expired. You can still view previous records and request your complete health file. New entries and follow-up are paused.':'انتهى اشتراكك. تقدر تشوف سجلاتك السابقة وتطلب ملفك الصحي الكامل؛ التسجيل والمتابعة متوقفة مؤقتًا.'}</p>
    <a href="/client/subscription" className="mt-2 inline-flex font-bold underline">{en?'Renew through WhatsApp':'اطلب التجديد عبر واتساب'}</a>
  </section>;
}
