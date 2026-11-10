'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
const planSchema=z.object({name:z.string().min(2).max(80),limit:z.coerce.number().int().min(0).max(100000),price:z.coerce.number().min(0).max(100000)});
export async function savePlatformPlan(formData:FormData){const p=planSchema.safeParse({name:formData.get('name'),limit:formData.get('limit'),price:formData.get('price')});if(!p.success)return {error:'تحقق من تفاصيل الخطة.'};const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)return {error:'غير مصرح.'};const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).single();if(profile?.role!=='super_admin')return {error:'غير مصرح.'};const {error}=await db.from('plans').upsert({name:p.data.name,client_limit:p.data.limit||null,price_sar:p.data.price,interval:'month',is_active:true},{onConflict:'name'});if(error)return {error:'تعذر حفظ الخطة.'};revalidatePath('/admin');return {success:true};}
const clinicPlanSchema=z.object({clinicId:z.string().uuid(),planId:z.string().uuid()});
export async function assignClinicPlan(formData:FormData){const p=clinicPlanSchema.safeParse({clinicId:formData.get('clinicId'),planId:formData.get('planId')});if(!p.success)return {error:'اختر العيادة والخطة.'};const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)return {error:'غير مصرح.'};const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).single();if(profile?.role!=='super_admin')return {error:'غير مصرح.'};const {data:plan}=await db.from('plans').select('id').eq('id',p.data.planId).eq('audience','clinic').single();if(!plan)return {error:'الخطة غير متاحة.'};const {error}=await db.from('clinics').update({plan_id:plan.id}).eq('id',p.data.clinicId);if(error)return {error:'تعذر تحديث خطة العيادة.'};revalidatePath('/admin');return {success:true};}
const statusSchema=z.object({subscriptionId:z.string().uuid(),status:z.enum(['active','past_due','cancelled','expired'])});
export async function updateSubscriptionStatus(formData:FormData){const p=statusSchema.safeParse({subscriptionId:formData.get('subscriptionId'),status:formData.get('status')});if(!p.success)return {error:'حالة الاشتراك غير صالحة.'};const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)return {error:'غير مصرح.'};const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).single();if(profile?.role!=='super_admin')return {error:'غير مصرح.'};const {error}=await db.from('subscriptions').update({status:p.data.status}).eq('id',p.data.subscriptionId);if(error)return {error:'تعذر تحديث الاشتراك.'};revalidatePath('/admin');return {success:true};}
const clinicSchema=z.object({name:z.string().min(2).max(100),slug:z.string().regex(/^[a-z0-9-]{3,50}$/),email:z.string().email().max(254)});
export async function createClinicAndInviteOwner(formData:FormData){const p=clinicSchema.safeParse({name:formData.get('name'),slug:formData.get('slug'),email:formData.get('email')});if(!p.success)return {error:'تحقق من اسم العيادة والرابط والبريد.'};const auth=await createSupabaseServerClient();const {data:{user}}=await auth.auth.getUser();if(!user)return {error:'غير مصرح.'};const {data:profile}=await auth.from('profiles').select('role').eq('id',user.id).single();if(profile?.role!=='super_admin')return {error:'غير مصرح.'};const admin=createSupabaseAdminClient();const {data:existing}=await admin.from('clinics').select('id').eq('slug',p.data.slug).maybeSingle();if(existing)return {error:'هذا الرابط مستخدم. اختر رابطًا آخر.'};const {data,error}=await admin.auth.admin.inviteUserByEmail(p.data.email,{data:{full_name:p.data.name}});if(error||!data.user)return {error:'تعذر دعوة مالك العيادة. تحقق من البريد أو أرسل دعوة جديدة.'};await admin.from('profiles').update({full_name:p.data.name,role:'clinic_admin'}).eq('id',data.user.id);const {error:clinicError}=await admin.from('clinics').insert({name:p.data.name,slug:p.data.slug,owner_id:data.user.id});if(clinicError){await admin.auth.admin.deleteUser(data.user.id);return {error:'تعذر إنشاء العيادة بعد التحقق من الرابط.'};}revalidatePath('/admin');return {success:true};}

const whatsappSchema=z.object({number:z.string().trim().regex(/^(?:\\+?[0-9 ()-]{8,20})?$/)});
async function requireSuperAdmin(){
 const db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return null;
 const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).single();
 return profile?.role==='super_admin'?{db,user}:null;
}
export async function saveWhatsAppNumber(formData:FormData){
 const parsed=whatsappSchema.safeParse({number:formData.get('number')});
 if(!parsed.success)return {error:'أدخل رقم واتساب دوليًا أو اتركه فارغًا.'};
 const access=await requireSuperAdmin();
 if(!access)return {error:'غير مصرح.'};
 const number=parsed.data.number.replace(/\\D/g,'');
 if(number&& (number.length<8||number.length>15))return {error:'رقم واتساب يجب أن يحتوي من 8 إلى 15 رقمًا مع مفتاح الدولة.'};
 const {error}=await access.db.from('platform_settings').upsert({id:true,whatsapp_number:number||null,updated_by:access.user.id,updated_at:new Date().toISOString()},{onConflict:'id'});
 if(error)return {error:'تعذر حفظ رقم واتساب.'};
 revalidatePath('/admin');revalidatePath('/client/subscription');
 return {success:true};
}
const requestStatusSchema=z.object({
 requestId:z.string().uuid(),
 status:z.enum(['awaiting_payment','receipt_received','under_verification','approved','rejected']),
 rejectionReason:z.string().trim().max(1000).optional()
});
export async function updateSubscriptionRequest(formData:FormData){
 const parsed=requestStatusSchema.safeParse({requestId:formData.get('requestId'),status:formData.get('status'),rejectionReason:formData.get('rejectionReason')});
 if(!parsed.success)return {error:'تحقق من حالة الطلب.'};
 const access=await requireSuperAdmin();
 if(!access)return {error:'غير مصرح.'};
 if(parsed.data.status==='approved'){
  const {error}=await access.db.rpc('approve_subscription_request',{p_request_id:parsed.data.requestId});
  if(error)return {error:'تعذر اعتماد الطلب. تأكد أن حالة الطلب بانتظار التحقق.'};
 }else{
  const {error}=await access.db.from('subscription_requests').update({
   status:parsed.data.status,
   rejection_reason:parsed.data.status==='rejected'?parsed.data.rejectionReason||'':null,
   updated_at:new Date().toISOString()
  }).eq('id',parsed.data.requestId).in('status',['new','awaiting_payment','receipt_received','under_verification']);
  if(error)return {error:'تعذر تحديث الطلب.'};
 }
 revalidatePath('/admin');revalidatePath('/client/subscription');
 return {success:true};
}
