'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { calculateTargets } from '@/lib/nutrition';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
const schema=z.object({age:z.coerce.number().int().min(13).max(100),sex:z.enum(['male','female','other']),height:z.coerce.number().min(100).max(240),weight:z.coerce.number().min(30).max(350),activity:z.coerce.number().refine(v=>[1.2,1.375,1.55,1.725,1.9].includes(v)),goal:z.enum(['cut','bulk','maintain']),clinicSlug:z.string().trim().max(60).optional(),consent:z.literal('yes')});
export async function saveOnboarding(formData:FormData){
 const parsed=schema.safeParse(Object.fromEntries(formData));
 if(!parsed.success)return {error:'تأكد من صحة البيانات ووافق على معالجة البيانات الصحية للمتابعة.'};
 const d=parsed.data; const supabase=await createSupabaseServerClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return {error:'انتهت الجلسة. سجل الدخول مرة أخرى.'};
 const targets=calculateTargets({age:d.age,sex:d.sex,heightCm:d.height,weightKg:d.weight,activity:d.activity,goal:d.goal});
 const birthDate=new Date(); birthDate.setFullYear(birthDate.getFullYear()-d.age);
 const admin=createSupabaseAdminClient();const {data:existing}=await admin.from('clients').select('id,clinic_id').eq('user_id',user.id).maybeSingle();let clinicId=existing?.clinic_id||null;if(!existing&&d.clinicSlug){const {data:clinic}=await admin.from('clinics').select('id').eq('slug',d.clinicSlug).maybeSingle();if(!clinic)return {error:'رمز العيادة غير موجود. اترك الحقل فارغًا أو تحقق من الرمز.'};clinicId=clinic.id;}
 const {error}=await admin.from('clients').upsert({user_id:user.id,clinic_id:clinicId,birth_date:birthDate.toISOString().slice(0,10),sex:d.sex,height_cm:d.height,starting_weight_kg:d.weight,activity_level:d.activity,goal:d.goal,bmr:targets.bmr,tdee:targets.tdee,target_calories:targets.calories,target_protein:targets.protein,target_carbs:targets.carbs,target_fat:targets.fat},{onConflict:'user_id'});
 if(error)return {error:'تعذر حفظ ملفك. حاول مرة أخرى.'};
 await supabase.from('consents').upsert({user_id:user.id,consent_type:'health_data',version:'2026-11-01',granted:true},{onConflict:'user_id,consent_type,version'});
 await supabase.from('profiles').update({consent_health_at:new Date().toISOString()}).eq('id',user.id);
 await supabase.from('weight_logs').upsert({client_id:(await supabase.from('clients').select('id').eq('user_id',user.id).single()).data?.id,weight_kg:d.weight,logged_on:new Date().toISOString().slice(0,10)},{onConflict:'client_id,logged_on'});
 revalidatePath('/client'); return {success:true};
}
