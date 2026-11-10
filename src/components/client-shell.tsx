'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Utensils, LineChart, MessageCircle, UserRound, HeartPulse } from 'lucide-react';
import { LocaleSwitcher } from '@/components/locale-switcher';
const items=[['/client','الرئيسية','Home',Home],['/client/food','التسجيل','Food logging',Utensils],['/client/progress','تقدمي','Progress',LineChart],['/client/chat','المحادثة','Chat',MessageCircle],['/client/settings','حسابي','Account',UserRound],['/client/health','صحتي','Health record',HeartPulse]] as const;
export function ClientShell({ children, name, brandPrimary='#0B2E1F', brandAccent='#1FA971', logoUrl, locale='ar' }: { children: React.ReactNode; name: string; brandPrimary?: string; brandAccent?: string; logoUrl?: string; locale?:'ar'|'en' }) {
 const path=usePathname();
 const english=locale==='en';
 return <div dir={english?'ltr':'rtl'} className="client-brand mx-auto min-h-screen max-w-6xl bg-qawam-50 pb-24 md:px-6" style={{'--brand-primary':brandPrimary,'--brand-accent':brandAccent} as React.CSSProperties}>
  <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur">
   <Link href="/client" className="flex items-center gap-2 font-extrabold" style={{color:brandPrimary}}>{logoUrl?<img src={logoUrl} alt={english?'Clinic logo':'شعار العيادة'} className="h-9 w-9 rounded-xl object-cover"/>:<span className="grid h-9 w-9 place-items-center rounded-xl text-xl text-white" style={{backgroundColor:brandPrimary}}>ق</span>}{brandPrimary==='#0B2E1F'?'قوام':english?'Nutrition care':'الرعاية الغذائية'}</Link>
   <div className="flex items-center gap-3"><span className="hidden text-sm text-slate-500 sm:inline">{english?'Welcome,':'أهلًا،'} {name || (english?'there':'بك')}</span><LocaleSwitcher locale={locale}/></div>
  </header>
  <main className="p-4 md:p-6">{children}</main>
  <nav aria-label={english?'Main navigation':'التنقل الرئيسي'} className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-6xl justify-around border-t border-slate-100 bg-white px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 md:rounded-t-2xl">
   {items.map(([href,labelAr,labelEn,Icon])=><Link key={href} href={href} className={`flex min-w-14 flex-col items-center gap-1 rounded-xl px-3 py-1 text-xs ${path===href?'font-bold':'text-slate-400'}`} style={path===href?{color:brandAccent}:undefined}><Icon size={20}/><span>{english?labelEn:labelAr}</span></Link>)}
  </nav>
 </div>;
}
