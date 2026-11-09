import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type Role = 'client' | 'specialist' | 'clinic_admin' | 'super_admin';
export type Profile = { id: string; full_name: string; role: Role; avatar_path: string | null };

export async function getProfile() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('id,full_name,role,avatar_path').eq('id', user.id).maybeSingle();
  return data as Profile | null;
}

export async function requireProfile(roles?: Role[]) {
  const profile = await getProfile();
  if (!profile) redirect('/login');
  if (roles && !roles.includes(profile.role)) redirect(profile.role === 'client' ? '/client' : '/clinic');
  return profile;
}
