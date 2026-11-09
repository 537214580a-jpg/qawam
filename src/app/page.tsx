import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const profile = await getProfile();
  if (!profile) redirect('/setup');
  redirect(profile.role === 'client' ? '/client' : profile.role === 'super_admin' ? '/admin' : '/clinic');
}
