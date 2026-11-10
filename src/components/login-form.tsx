'use client';
import { useState,useTransition,type FormEvent } from 'react';
import { sendOtp,verifyOtp } from '@/app/(auth)/login/actions';
import { useRouter } from 'next/navigation';
export function LoginForm({locale='ar'}:{locale?:'ar'|'en'}){
 const english=locale==='en';
 const [channel,setChannel]=useState<'sms'|'email'>('sms');
 const [contact,setContact]=useState('');
 const [sent,setSent]=useState(false);
 const [message,setMessage]=useState('');
 const [pending,startTransition]=useTransition();
 const router=useRouter();
 function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const data=new FormData(event.currentTarget);
  startTransition(async()=>{
   const result=sent?await verifyOtp(data):await sendOtp(data);
   if('error'in result&&result.error){setMessage(result.error);return;}
   if(sent){setMessage(english?'Signed in.':'تم تسجيل الدخول.');router.push('/');return;}
   setMessage(english?'We sent you a verification code.':'أرسلنا لك رمز التحقق.');
   setSent(true);
  });
 }
 return <form onSubmit={submit} className="rounded-3xl bg-white p-6 shadow-soft sm:p-8">
  <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
   <button type="button" onClick={()=>setChannel('sms')} className={`rounded-lg p-2 text-sm ${channel==='sms'?'bg-white shadow':''}`}>{english?'Phone':'رقم الجوال'}</button>
   <button type="button" onClick={()=>setChannel('email')} className={`rounded-lg p-2 text-sm ${channel==='email'?'bg-white shadow':''}`}>{english?'Email':'البريد الإلكتروني'}</button>
  </div>
  <label className="field-label">{channel==='sms'?(english?'Phone number with country code':'رقم الجوال مع مفتاح الدولة'):(english?'Email address':'البريد الإلكتروني')}</label>
  <input className="field" dir="ltr" type={channel==='sms'?'tel':'email'} value={contact} onChange={event=>setContact(event.target.value)} required placeholder={channel==='sms'?'+9665xxxxxxxx':'name@example.com'}/>
  {sent&&<><label className="field-label mt-4">{english?'Verification code':'رمز التحقق'}</label><input name="token" className="field text-center tracking-[.4em]" inputMode="numeric" pattern="([0-9]{6}|[0-9]{8})" minLength={6} maxLength={8} required placeholder="••••••••"/></>}
  <input type="hidden" name="contact" value={contact}/><input type="hidden" name="channel" value={channel}/>
  <button className="primary-button mt-5 w-full" disabled={pending}>{pending?(english?'Sending…':'جارٍ الإرسال…'):sent?(english?'Verify code':'تأكيد الرمز'):(english?'Send sign-in code':'إرسال رمز الدخول')}</button>
  {message&&<p role="status" className="mt-4 text-center text-sm text-qawam-700">{message}</p>}
  <p className="mt-5 text-center text-xs leading-5 text-slate-500">{english?'By continuing, you agree to the Terms of Use and Privacy Notice.':'بالمتابعة، توافق على شروط الاستخدام وإشعار الخصوصية.'}</p>
 </form>;
}
