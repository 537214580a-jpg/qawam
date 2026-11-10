import { PrivacyControls } from '@/components/privacy-controls';
import { requireProfile } from '@/lib/auth';

export default async function SettingsPage() {
  const profile = await requireProfile(['client']);
  const en = profile.locale === 'en';
  return (
    <div dir={en ? 'ltr' : 'rtl'} className="mx-auto max-w-2xl space-y-5">
      <header>
        <p className="text-sm font-bold text-qawam-500">{en ? 'Account and data' : 'حسابك وبياناتك'}</p>
        <h1 className="mt-1 text-3xl font-extrabold">{en ? 'Privacy and settings' : 'الخصوصية والإعدادات'}</h1>
      </header>
      <PrivacyControls locale={en ? 'en' : 'ar'} />
    </div>
  );
}
