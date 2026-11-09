import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type Role = 'client' | 'specialist' | 'clinic_admin' | 'super_admin';
export type Profile = { id: string; full_name: string; role: Role; avatar_path: string | null };

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
  const clinicRole = membership?.clinic_roles as { role_key?: string } | null;
  const role = roleFromKey(clinicRole?.role_key);

  if (!role) {
    const { data: legacyProfile } = await supabase
      .from('profiles')
      .select('id,full_name,role,avatar_path')
      .eq('id', user.id)
      .maybeSingle();
    if (legacyProfile) return legacyProfile as Profile;
  }

  if (!role) return null;
  return { id: user.id, full_name: userProfile?.full_name || user.email || '', role, avatar_path: null } as Profile;
}

export async function requireProfile(roles?: Role[]) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const profile = await getProfile();
  if (!profile) redirect('/setup');
  if (roles && !roles.includes(profile.role)) redirect(profile.role === 'client' ? '/client' : '/setup');
  return profile;
}
