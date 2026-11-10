'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, LayoutDashboard, ClipboardList, Utensils, BarChart3, Settings, Shield, Palette } from 'lucide-react';
import { LocaleSwitcher } from '@/components/locale-switcher';
const nav=[['/clinic','نظرة عامة','Overview',LayoutDashboard],['/clinic/clients','العملاء','Clients',Users],['/clinic/plans','الخطط الغذائية','Nutrition plans',ClipboardList],['/clinic/foods','مكتبة الأطعمة','Food library',Utensils],['/clinic/analytics','التحليلات','Analytics',BarChart3],['/clinic/team','الفريق','Team',Settings],['/clinic/settings','الهوية البصرية','Branding',Palette]] as const;
export function ClinicShell({ children, name, admin=false, locale='ar' }: { children: React.ReactNode; name: string; admin?: boolean; locale?:'ar'|'en' }) {
 const path=usePathname();const english=locale==='en';
 const links=admin?[['/admin','إدارة المنصة','Platform admin',Shield] as const,['/admin/health-requests','طلبات الملف الصحي','Health record requests',ClipboardList] as const,...nav]:nav;
 return <div dir={english?'ltr':'rtl'} className="min-h-screen bg-qawam-50 md:flex">
  <aside className="hidden w-64 shrink-0 flex-col bg-qawam-950 p-5 text-white md:flex">
   <Link href={admin?'/admin':'/clinic'} className="mb-8 flex items-center gap-3 text-xl font-extrabold"><span className="grid h-11 w-11 place-items-center rounded-xl bg-qawam-500 text-2xl">ق</span>قوام</Link>
   <p className="mb-3 text-xs text-white/50">{english?'Workspace':'مساحة العمل'}</p>
   <nav className="space-y-1">{links.map(([href,labelAr,labelEn,Icon])=><Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${path===href?'bg-white/15 text-white':'text-white/70 hover:bg-white/10'}`}><Icon size={18}/>{english?labelEn:labelAr}</Link>)}</nav>
   <div className="mt-auto rounded-xl bg-white/10 p-3 text-sm"><div className="font-bold">{name || (english?'Clinic account':'حساب العيادة')}</div><div className="mt-1 text-xs text-white/60">{english?'QAWAM clinic portal':'بوابة قوام للعيادات'}</div></div>
  </aside>
  <div className="min-w-0 flex-1">
   <header className="flex items-center justify-between gap-3 bg-white px-4 py-3 shadow-sm md:px-8">
    <div className="font-bold text-qawam-950 md:hidden">{english?'QAWAM Clinics':'قوام للعيادات'}</div>
    <div className="hidden text-sm text-slate-500 md:block">{english?'Nutrition and client management':'إدارة التغذية والمتابعة'}</div>
    <div className="flex items-center gap-3"><span className="text-sm font-bold">{name || (english?'Welcome':'مرحبًا')}</span><LocaleSwitcher locale={locale}/></div>
   </header>
   <main className="mx-auto max-w-7xl p-4 pb-24 md:p-8">{children}</main>
   <nav aria-label={english?'Main navigation':'التنقل الرئيسي'} className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t bg-white p-2 md:hidden">{(admin?links.slice(0,5):nav.slice(0,5)).map(([href,labelAr,labelEn,Icon])=><Link key={href} href={href} className={`flex flex-col items-center gap-1 p-1 text-[10px] ${path===href?'text-qawam-700':'text-slate-400'}`}><Icon size={19}/>{english?labelEn:labelAr}</Link>)}</nav>
  </div>
 </div>;
}
