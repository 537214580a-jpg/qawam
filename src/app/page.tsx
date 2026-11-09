import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
export default async function Home() { const profile = await getProfile(); if (!profile) redirect('/login'); redirect(profile.role === 'client' ? '/client' : profile.role === 'super_admin' ? '/admin' : '/clinic'); }
