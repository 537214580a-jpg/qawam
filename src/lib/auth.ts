import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type Role = 'client' | 'specialist' | 'clinic_admin' | 'super_admin';
export type Profile = { id: string; full_name: string; role: Role; avatar_path: string | null; locale: 'ar'|'en' };

function roleFromKey(value: unknown): Role | null {
  if (value === 'client' || value === 'specialist' || value === 'clinic_admin' || value === 'super_admin') return value;
  if (value === 'owner' || value === 'clinic_owner' || value === 'admin') return 'clinic_admin';
  return null;
}

export async function getProfile() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: membership } = await supabase
    .from('clinic_memberships')
    .select('clinic_roles(role_key)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  const { data: localeProfile } = await supabase.from('profiles').select('locale').eq('id', user.id).maybeSingle();
  const locale: 'ar'|'en' = localeProfile?.locale === 'en' ? 'en' : 'ar';
  const linkedRole = membership?.clinic_roles;
  const clinicRole = (Array.isArray(linkedRole) ? linkedRole[0] : linkedRole) as { role_key?: string } | null;
  const role = roleFromKey(clinicRole?.role_key);

  if (!role) {
    const { data: legacyProfile } = await supabase
      .from('profiles')
      .select('id,full_name,role,avatar_path,locale')
      .eq('id', user.id)
      .maybeSingle();
    if (legacyProfile) return { ...legacyProfile, locale: legacyProfile.locale === 'en' ? 'en' : 'ar' } as Profile;
  }

  if (!role) return null;
  return { id: user.id, full_name: userProfile?.full_name || user.email || '', role, avatar_path: null, locale } as Profile;
}

export async function requireProfile(roles?: Role[]) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  let profile = await getProfile();
  if (!profile) redirect('/setup');

  // A clinic administrator can also use the client portal when the same account is linked to a client record.
  if (roles?.includes('client') && !roles.includes(profile.role)) {
    const { data: clientLink } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (clientLink) profile = { ...profile, role: 'client' };
  }

  if (roles && !roles.includes(profile.role)) redirect(profile.role === 'client' ? '/client' : '/setup');
  return profile;
}
