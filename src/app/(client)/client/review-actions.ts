'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getClientSubscriptionAccess } from '@/lib/subscription-access';

const reviewSchema=z.object({
 mealsLogged:z.enum(['true','false']).transform(value=>value==='true'),
 weightLogged:z.enum(['true','false']).transform(value=>value==='true'),
 measurementsLogged:z.enum(['true','false']).transform(value=>value==='true'),
 weight:z.preprocess(value=>value===''||value==null?undefined:Number(value),z.number().min(20).max(500).optional())
});
function riyadhDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export async function saveDailyReview(formData:FormData){
 const parsed=reviewSchema.safeParse(Object.fromEntries(formData.entries()));
 if(!parsed.success)return {error:'تأكد من إجابتك وأدخل وزنك إذا اخترت نعم.'};
 const d=parsed.data;
 if(d.weightLogged&&!d.weight)return {error:'أدخل وزنك بالكيلوجرام عشان نسجله.'};
 const db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return {error:'سجل الدخول من جديد.'};
 const {data:profile}=await db.from('profiles').select('consent_health_at').eq('id',user.id).maybeSingle();
 if(!profile?.consent_health_at)return {error:'أكمل موافقة البيانات الصحية أولًا.'};
 const {data:client,error:clientError}=await db.from('clients').select('id,clinic_id,journey_start_date').eq('user_id',user.id).maybeSingle();
 if(clientError||!client)return {error:'ما لقينا ملف عميل مرتبط بحسابك.'};
 if(client.journey_start_date&&client.journey_start_date>riyadhDate())return {error:'متابعتك اليومية تبدأ في التاريخ المحدد بملفك.'};
 const access=await getClientSubscriptionAccess(db,user.id);
 if(access.readOnly)return {error:'انتهى اشتراكك. تقدر تشاهد سجلاتك السابقة فقط.'};
 const {error}=await db.from('daily_checkins').upsert({
  clinic_id:client.clinic_id,client_id:client.id,checkin_date:riyadhDate(),
  client_review:{meals:d.mealsLogged,weight:d.weightLogged,measurements:d.measurementsLogged}
 },{onConflict:'clinic_id,client_id,checkin_date'});
 if(error){console.error('QAWAM daily review save failed',error.code,error.message);return {error:'تعذر حفظ متابعة اليوم. حاول مرة ثانية.'};}
 if(d.weightLogged&&d.weight){
  const {error:weightError}=await db.from('weight_logs').upsert(
   {client_id:client.id,weight_kg:d.weight,logged_on:riyadhDate()},
   {onConflict:'client_id,logged_on'}
  );
  if(weightError){console.error('QAWAM daily weight save failed',weightError.code,weightError.message);return {error:'انحفظت المتابعة، لكن تعذر تسجيل الوزن. حاول مرة ثانية.'};}
 }
 revalidatePath('/client');
 revalidatePath('/client/progress');
 return {success:true};
}