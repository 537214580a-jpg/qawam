import { redirect } from 'next/navigation';
import { requireProfile } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { HealthRecord } from '@/components/health-record';
import { HealthRecordRequest } from '@/components/health-record-request';
import { getClientSubscriptionAccess } from '@/lib/subscription-access';
import { ReadOnlyNotice } from '@/components/read-only-notice';

export default async function HealthPage() {
  const profile = await requireProfile(['client']);
  const db = await createSupabaseServerClient();
  const { data: client } = await db.from('clients').select('id,clinic_id').eq('user_id', profile.id).maybeSingle();
  if (!client) redirect('/client/onboarding');
  const { data: consent } = await db.from('profiles').select('consent_health_at').eq('id', profile.id).maybeSingle();
  const access = await getClientSubscriptionAccess(db, profile.id);

  return <>{access.readOnly && <ReadOnlyNotice locale={profile.locale} />}<HealthRecord clientId={client.id} userId={profile.id} locale={profile.locale} hasHealthConsent={Boolean(consent?.consent_health_at)} readOnly={access.readOnly} /><HealthRecordRequest clientId={client.id} userId={profile.id} clinicId={client.clinic_id} locale={profile.locale} /></>;
}
