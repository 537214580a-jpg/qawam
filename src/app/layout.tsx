import type { Metadata, Viewport } from 'next';
import { Tajawal } from 'next/font/google';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import './globals.css';
import { PwaRegister } from '@/components/pwa-register';
const tajawal = Tajawal({ subsets: ['arabic','latin'], weight: ['400','500','700','800'], variable: '--font-tajawal', display: 'swap' });
export const metadata: Metadata = { title: 'قوام | منصتك الغذائية', description: 'منصة التغذية والمتابعة الصحية', manifest: '/manifest.webmanifest', appleWebApp: { capable: true, statusBarStyle: 'default', title: 'قوام' } };
export const viewport: Viewport = { themeColor: '#0B2E1F', width: 'device-width', initialScale: 1 };
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
 let locale=cookies().get('qawam_locale')?.value==='en'?'en':'ar';
 const db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();
 if(user){
  const {data:profile}=await db.from('profiles').select('locale').eq('id',user.id).maybeSingle();
  if(profile?.locale==='ar'||profile?.locale==='en')locale=profile.locale;
 }
 return <html lang={locale} dir={locale==='ar'?'rtl':'ltr'} className={tajawal.variable}><body><PwaRegister/>{children}</body></html>;
}
