import { cookies } from 'next/headers';
import Link from 'next/link';
import { LoginForm } from '@/components/login-form';
import { LocaleSwitcher } from '@/components/locale-switcher';
type LoginPageProps={searchParams:{channel?:string;auth?:string;portal?:string}};
export default function LoginPage({searchParams}:LoginPageProps){
 const locale=cookies().get('qawam_locale')?.value==='en'?'en':'ar';const english=locale==='en';
 const initialChannel=searchParams.channel==='sms'?'sms':'email';const portal=searchParams.portal==='client'?'client':undefined;
 return <main dir={english?'ltr':'rtl'} className="grid min-h-screen place-items-center bg-qawam-50 px-4 py-8"><section className="w-full max-w-md">
  <div className="mb-7 flex justify-end"><LocaleSwitcher locale={locale}/></div>
  <div className="mb-7 text-center"><div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-qawam-950 text-3xl font-black text-white">ق</div><h1 className="text-3xl font-bold">{english?'QAWAM':'قوام'}</h1><p className="mt-2 text-slate-500">{portal?(english?'Client portal sign-in':'دخول العميل'):english?'Your nutrition care starts here':'رعايتك الغذائية تبدأ بخطوة'}</p></div>
  <LoginForm locale={locale} initialChannel={initialChannel} authError={searchParams.auth==='expired'} portal={portal}/>
  {!portal&&<Link href="/login?portal=client" className="mt-4 block rounded-xl border border-qawam-200 bg-white p-4 text-center text-sm font-bold text-qawam-800">{english?'Sign in to the client portal':'الدخول كعميل ومشاهدة الخدمات'}</Link>}
 </section></main>;
}