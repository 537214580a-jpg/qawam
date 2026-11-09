'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { calculateTargets } from '@/lib/nutrition';

const schema=z.object({
 age:z.coerce.number().int().min(13).max(100),
 sex:z.enum(['male','female','other']),
 height:z.coerce.number().min(100).max(240),
 weight:z.coerce.number().min(30).max(350),
 activity:z.coerce.number().refine(v=>[1.2,1.375,1.55,1.725,1.9].includes(v)),
 goal:z.enum(['cut','bulk','maintain']),
 clinicSlug:z.string().trim().max(60).optional(),
 consent:z.literal('yes')
});

export async function saveOnboarding(formData:FormData){
 const parsed=schema.safeParse(Object.fromEntries(formData));
 if(!parsed.success)return {error:'تأكد من العمر والطول والوزن، ووافق على معالجة البيانات الصحية.'};

 const d=parsed.data;
 const supabase=await createSupabaseServerClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return {error:'انتهت الجلسة. سجل الدخول مرة أخرى.'};

 const {data:existing,error:lookupError}=await supabase
  .from('clients')
  .select('id,clinic_id')
  .eq('user_id',user.id)
  .maybeSingle();
 if(lookupError){console.error('QAWAM onboarding lookup failed',lookupError.code,lookupError.message);return {error:'تعذر فتح ملفك. حدّث الصفحة وحاول مرة أخرى.'};}
 if(!existing)return {error:'حسابك غير مربوط بملف عميل. تواصل مع عيادة قوام لربطه.'};

 const targets=calculateTargets({age:d.age,sex:d.sex,heightCm:d.height,weightKg:d.weight,activity:d.activity,goal:d.goal});
 const birthDate=new Date();
 birthDate.setFullYear(birthDate.getFullYear()-d.age);
 const databaseSex=d.sex==='other'?'unspecified':d.sex;

 const {data:updated,error:updateError}=await supabase
  .from('clients')
  .update({
   birth_date:birthDate.toISOString().slice(0,10),
   sex:databaseSex,
   height_cm:d.height,
   starting_weight_kg:d.weight,
   activity_level:d.activity,
   goal:d.goal,
   bmr:targets.bmr,
   tdee:targets.tdee,
   target_calories:targets.calories,
   target_protein:targets.protein,
   target_carbs:targets.carbs,
   target_fat:targets.fat
  })
  .eq('user_id',user.id)
  .select('id')
  .maybeSingle();
 if(updateError){console.error('QAWAM onboarding update failed',updateError.code,updateError.message);return {error:'تعذر حفظ بياناتك. تأكد من القيم وحاول مرة ثانية.'};}
 if(!updated)return {error:'ما لقينا ملفك في العيادة. تواصل مع عيادة قوام لربطه.'};

 const {error:consentError}=await supabase
  .from('consents')
  .upsert({user_id:user.id,consent_type:'health_data',version:'2026-11-01',granted:true},{onConflict:'user_id,consent_type,version'});
 if(consentError){console.error('QAWAM consent save failed',consentError.code,consentError.message);return {error:'تم حفظ بياناتك، لكن تعذر تسجيل الموافقة. حاول مرة ثانية.'};}

 const {error:profileError}=await supabase
  .from('profiles')
  .update({consent_health_at:new Date().toISOString()})
  .eq('id',user.id);
 if(profileError){console.error('QAWAM consent profile update failed',profileError.code,profileError.message);return {error:'تم حفظ البيانات، لكن تعذر تحديث الموافقة. حاول مرة ثانية.'};}

 const {error:weightError}=await supabase
  .from('weight_logs')
  .upsert({client_id:updated.id,weight_kg:d.weight,logged_on:new Date().toISOString().slice(0,10)},{onConflict:'client_id,logged_on'});
 if(weightError){console.error('QAWAM initial weight save failed',weightError.code,weightError.message);return {error:'حفظنا بياناتك، لكن تعذر تسجيل الوزن الأولي. حاول مرة ثانية.'};}

 revalidatePath('/client');
 revalidatePath('/client/onboarding');
 return {success:true};
}
