'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const requestSchema=z.object({planId:z.string().uuid()});

export async function createSubscriptionRequest(formData:FormData){
 const parsed=requestSchema.safeParse({planId:formData.get('planId')});
 if(!parsed.success)return {error:'اختر باقة صالحة.'};
 const db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return {error:'سجّل الدخول أولًا.'};
 const [{data:profile},{data:plan},{data:activeSubscription}]=await Promise.all([
  db.from('profiles').select('full_name,phone').eq('id',user.id).single(),
  db.from('plans').select('id,name,price_sar,audience,is_active').eq('id',parsed.data.planId).eq('audience','client').eq('is_active',true).single(),
  db.from('subscriptions').select('id,status,ends_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(1).maybeSingle()
 ]);
 if(!plan)return {error:'هذه الباقة غير متاحة حاليًا.'};
 if(!profile)return {error:'تعذر قراءة ملف العميل.'};
 const {error}=await db.from('subscription_requests').insert({
  user_id:user.id,
  plan_id:plan.id,
  request_type:activeSubscription?'renewal':'new',
  customer_name:profile.full_name||user.email||'عميل قوام',
  customer_phone:profile.phone,
  plan_name:plan.name,
  amount_sar:plan.price_sar
 });
 if(error)return {error:'تعذر إنشاء طلب الاشتراك. حاول مرة أخرى.'};
 const {data:settings}=await db.from('platform_settings').select('whatsapp_number').eq('id',true).maybeSingle();
 const digits=String(settings?.whatsapp_number||'').replace(/\\D/g,'');
 const message=[
  activeSubscription?'طلب تجديد اشتراك قوام':'طلب اشتراك جديد في قوام',
  `الاسم: ${profile.full_name||'غير مسجل'}`,
  `الجوال المسجل: ${profile.phone||'غير مسجل'}`,
  `معرف الحساب: ${user.id}`,
  `الباقة: ${plan.name}`,
  `السعر: ${plan.price_sar} ريال`
 ].join('\\n');
 revalidatePath('/client/subscription');
 revalidatePath('/admin');
 return {success:true,waUrl:digits?`https://wa.me/${digits}?text=${encodeURIComponent(message)}`:null};
}
