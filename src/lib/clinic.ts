import { createSupabaseServerClient } from '@/lib/supabase/server';

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

  const clinic = (membership?.clinics as {
    id: string;
    name: string;
    slug: string;
    status: string;
  } | null) || null;

  return { db, user, clinic };
}
