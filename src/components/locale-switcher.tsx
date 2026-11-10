'use client';
import { useState,useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setPreferredLocale } from '@/app/(client)/client/settings/actions';

export function LocaleSwitcher({locale}:{locale:'ar'|'en'}){
 const router=useRouter();
 const [pending,start]=useTransition();
 const [error,setError]=useState('');
 function switchLocale(){
  const formData=new FormData();
  formData.set('locale',locale==='ar'?'en':'ar');
  setError('');
  start(async()=>{
   const result=await setPreferredLocale(formData);
   if('error'in result&&result.error){setError(result.error);return;}
   router.refresh();
  });
 }
 return <div className="flex flex-col items-end">
  <button type="button" onClick={switchLocale} disabled={pending} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-qawam-800 hover:bg-slate-50" aria-label={locale==='ar'?'Switch language to English':'تغيير اللغة إلى العربية'}>
   {pending?(locale==='ar'?'جارٍ التغيير…':'Changing…'):locale==='ar'?'English':'العربية'}
  </button>
  {error&&<span role="status" className="mt-1 text-[10px] text-red-700">{error}</span>}
 </div>;
}
