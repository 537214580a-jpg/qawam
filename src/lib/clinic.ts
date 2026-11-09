import { createSupabaseServerClient } from '@/lib/supabase/server';

type Branding = { primary?: string; accent?: string };
type ClinicSettings = { logo_path?: string | null; [key: string]: unknown };

export async function getClinicContext() {
  const db = await createSupabaseServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error('سجل الدخول أولًا.');

  const { data: membership } = await db
    .from('clinic_memberships')
    .select('clinic_id, clinics(id,name,slug,status)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  const linkedClinic = membership?.clinics;
  const clinicRow = (Array.isArray(linkedClinic) ? linkedClinic[0] : linkedClinic) as {
    id: string;
    name: string;
    slug: string;
    status: string;
  } | null;
  if (!clinicRow) return { db, user, clinic: null };

  const { data: settingsRow } = await db
    .from('clinic_settings')
    .select('brand,settings')
    .eq('clinic_id', clinicRow.id)
    .maybeSingle();
  const brand = (settingsRow?.brand as Branding | null) || {};
  const settings = (settingsRow?.settings as ClinicSettings | null) || {};

  return {
    db,
    user,
    clinic: {
      ...clinicRow,
      logo_path: typeof settings.logo_path === 'string' ? settings.logo_path : null,
      brand_primary: brand.primary || '#176B5B',
      brand_accent: brand.accent || '#D2A45D',
      plan_id: null,
      settings,
    },
  };
}
