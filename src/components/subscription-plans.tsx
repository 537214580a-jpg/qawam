'use client';
import { useState,useTransition } from 'react';
import { createSubscriptionRequest } from '@/app/(client)/client/subscription/actions';

type Plan={id:string;name:string;price_sar:number;interval:string;features:string[]};

export function SubscriptionPlans({plans,current,locale='ar'}:{plans:Plan[];current?:string;locale?:'ar'|'en'}){const en=locale==='en';
 const [message,setMessage]=useState('');
 const [pendingId,setPendingId]=useState('');
 const [pending,start]=useTransition();
 function requestPlan(planId:string){
  setPendingId(planId);
  setMessage('');
  const formData=new FormData();
  formData.set('planId',planId);
  start(async()=>{
   const result=await createSubscriptionRequest(formData);
   if('error'in result&&result.error){setMessage(result.error);setPendingId('');return;}
   if(result.waUrl){window.location.assign(result.waUrl);return;}
   setMessage(en?'Your request was saved, but the clinic WhatsApp number is not configured yet.':'تم تسجيل طلبك. رقم واتساب الإدارة غير مضاف في إعدادات المنصة، لذلك لم نتمكن من فتح المحادثة.');
   setPendingId('');
  });
 }
 return <div className="space-y-4">
  <div className="grid gap-4 md:grid-cols-2">
   {plans.map(plan=><article key={plan.id} className="panel">
    <div className="flex items-start justify-between">
     <h2 className="text-lg font-extrabold">{plan.name}</h2>
     {current===plan.id&&<span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-800">{en?'Current plan':'خطتك الحالية'}</span>}
    </div>
    <p className="mt-3 text-3xl font-extrabold">{plan.price_sar}<small className="mr-1 text-sm font-medium">SAR / {en?(plan.interval==='year'?'year':'month'):(plan.interval==='year'?'سنة':'شهر')}</small></p>
    <ul className="my-4 space-y-2 text-sm text-slate-600">{plan.features.map((feature,index)=><li key={index}>✓ {feature}</li>)}</ul>
    <button onClick={()=>requestPlan(plan.id)} disabled={pending||current===plan.id} className="primary-button w-full">
     {pendingId===plan.id?(en?'Submitting…':'جارٍ تسجيل الطلب…'):current===plan.id?(en?'Your current plan':'اشتراكك الحالي'):(en?'Request via WhatsApp':'اطلب الاشتراك عبر واتساب')}
    </button>
   </article>)}
  </div>
  <p className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">{en?'After submitting, contact the clinic on WhatsApp to complete the bank transfer. An uploaded receipt alone does not activate the plan; the clinic confirms the payment after verifying receipt of funds.':'بعد إرسال الطلب، تتواصل مع الإدارة عبر واتساب لإتمام التحويل. لا يتفعل الاشتراك بمجرد إرسال صورة الإيصال؛ تعتمد الإدارة الدفع بعد التحقق من وصول المبلغ.'}</p>
  {message&&<p role="status" className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
 </div>;
}
