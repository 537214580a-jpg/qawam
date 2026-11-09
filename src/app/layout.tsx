import type { Metadata, Viewport } from 'next';
import { Tajawal } from 'next/font/google';
import './globals.css';
import { PwaRegister } from '@/components/pwa-register';
const tajawal = Tajawal({ subsets: ['arabic','latin'], weight: ['400','500','700','800'], variable: '--font-tajawal', display: 'swap' });
export const metadata: Metadata = { title: 'قوام | منصتك الغذائية', description: 'منصة التغذية والمتابعة الصحية العربية', manifest: '/manifest.webmanifest', appleWebApp: { capable: true, statusBarStyle: 'default', title: 'قوام' } };
export const viewport: Viewport = { themeColor: '#0B2E1F', width: 'device-width', initialScale: 1 };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ar" dir="rtl" className={tajawal.variable}><body><PwaRegister/>{children}</body></html>; }
