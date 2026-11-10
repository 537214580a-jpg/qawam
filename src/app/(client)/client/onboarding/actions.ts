'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { calculateTargets } from '@/lib/nutrition';

const conditionCodes = ['diabetes','hypertension','heart_disease','high_cholesterol','insulin_resistance','kidney_disease','food_allergies','pcos','other'] as const;
const schema=z.object({
 age:z.coerce.number().int().min(13).max(100),
 sex:z.enum(['male','female','other']),
 height:z.coerce.number().min(100).max(240),
 weight:z.coerce.number().min(30).max(350),
 targetWeight:z.preprocess(v=>v===''||v==null?undefined:Number(v),z.number().min(20).max(500).optional()),
 activity:z.coerce.number().refine(v=>[1.2,1.375,1.55,1.725,1.9].includes(v)),
 goal:z.enum(['cut','bulk','maintain']),
 startDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
 allergies:z.string().trim().max(600),
 preferences:z.string().trim().max(600),
 dislikes:z.string().trim().max(600),
 medicalNotes:z.string().trim().max(1200),
 conditions:z.array(z.enum(conditionCodes)).max(9),
 consent:z.literal('yes')
});

function riyadhDate(){
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}
const conditionNames:Record<(typeof conditionCodes)[number],string>={
 diabetes:'diabetes',hypertension:'hypertension',heart_disease:'heart_disease',high_cholesterol:'high_cholesterol',
 insulin_resistance:'insulin_resistance',kidney_disease:'kidney_disease',food_allergies:'food_allergies',pcos:'pcos',other:'other'
};

export async function saveOnboarding(formData:FormData){
 const raw:Record<string,unknown>=Object.fromEntries(formData.entries());
 raw.conditions=formData.getAll('conditions');
 const parsed=schema.safeParse(raw);
 if(!parsed.success)return {error:'راجع البيانات المطلوبة، وحدد تاريخ البداية ووافق على معالجة بياناتك الصحية.'};

 const d=parsed.data;
 if(d.startDate<riyadhDate())return {error:'اختر تاريخ اليوم أو تاريخًا قادمًا لبداية رحلتك.'};
 const supabase=await createSupabaseServerClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return {error:'انتهت الجلسة. سجل الدخول مرة أخرى.'};

 const {data:existing,error:lookupError}=await supabase.from('clients').select('id,clinic_id').eq('user_id',user.id).maybeSingle();
 if(lookupError){console.error('QAWAM onboarding lookup failed',lookupError.code,lookupError.message);return {error:'تعذر فتح ملفك. حدّث الصفحة وحاول مرة أخرى.'};}
 if(!existing)return {error:'حسابك غير مربوط بملف عميل. تواصل مع عيادة قوام لربطه.'};

 const targets=calculateTargets({age:d.age,sex:d.sex,heightCm:d.height,weightKg:d.weight,activity:d.activity,goal:d.goal});
 const birthDate=new Date();
 birthDate.setUTCFullYear(birthDate.getUTCFullYear()-d.age);
 const {data:updated,error:updateError}=await supabase.from('clients').update({
  birth_date:birthDate.toISOString().slice(0,10),sex:d.sex==='other'?'unspecified':d.sex,height_cm:d.height,
  starting_weight_kg:d.weight,activity_level:d.activity,goal:d.goal,bmr:targets.bmr,tdee:targets.tdee,
  target_calories:targets.calories,target_protein:targets.protein,target_carbs:targets.carbs,target_fat:targets.fat,
  journey_start_date:d.startDate
 }).eq('user_id',user.id).select('id,clinic_id').maybeSingle();
 if(updateError){console.error('QAWAM onboarding update failed',updateError.code,updateError.message);return {error:'تعذر حفظ بياناتك. تأكد من القيم وحاول مرة ثانية.'};}
 if(!updated)return {error:'ما لقينا ملفك في العيادة. تواصل مع عيادة قوام لربطه.'};

 const {error:profileError}=await supabase.from('nutrition_profiles').upsert({
  clinic_id:updated.clinic_id,client_id:updated.id,height_cm:d.height,current_weight_kg:d.weight,
  target_weight_kg:d.targetWeight??null,activity_level:String(d.activity),nutrition_goal:d.goal,
  allergies:d.allergies||null,medical_notes:d.medicalNotes||null,dietary_preferences:d.preferences||null,disliked_foods:d.dislikes||null
 },{onConflict:'clinic_id,client_id'});
 if(profileError){console.error('QAWAM nutrition profile save failed',profileError.code,profileError.message);return {error:'حُفظت أهدافك، لكن تعذر حفظ تفضيلاتك الصحية. حاول مرة ثانية.'};}

 const {error:consentError}=await supabase.from('consents').upsert(
  {user_id:user.id,consent_type:'health_data',version:'2026-11-01',granted:true},
  {onConflict:'user_id,consent_type,version'}
 );
 if(consentError){console.error('QAWAM consent save failed',consentError.code,consentError.message);return {error:'تم حفظ بياناتك، لكن تعذر تسجيل الموافقة. حاول مرة ثانية.'};}
 const {error:profileConsentError}=await supabase.from('profiles').update({consent_health_at:new Date().toISOString()}).eq('id',user.id);
 if(profileConsentError){console.error('QAWAM consent profile update failed',profileConsentError.code,profileConsentError.message);return {error:'تم حفظ البيانات، لكن تعذر تحديث الموافقة. حاول مرة ثانية.'};}

 const {error:weightError}=await supabase.from('weight_logs').upsert(
  {client_id:updated.id,weight_kg:d.weight,logged_on:riyadhDate()},
  {onConflict:'client_id,logged_on'}
 );
 if(weightError){console.error('QAWAM initial weight save failed',weightError.code,weightError.message);return {error:'حفظنا بياناتك، لكن تعذر تسجيل الوزن الأولي. حاول مرة ثانية.'};}

 const {data:oldConditions,error:conditionReadError}=await supabase.from('health_conditions').select('id,condition_code').eq('client_id',updated.id);
 if(conditionReadError){console.error('QAWAM condition read failed',conditionReadError.code,conditionReadError.message);return {error:'تعذر حفظ الحالات الصحية. حاول مرة ثانية.'};}
 const selected=new Set(d.conditions);
 const existingCodes=new Set((oldConditions||[]).map((row:any)=>row.condition_code));
 for(const row of oldConditions||[]){
  const desired=selected.has(row.condition_code);
  const {error}=await supabase.from('health_conditions').update({status:desired?'active':'inactive'}).eq('id',row.id);
  if(error){console.error('QAWAM condition update failed',error.code,error.message);return {error:'تعذر تحديث الحالات الصحية. حاول مرة ثانية.'};}
 }
 const missing=d.conditions.filter(code=>!existingCodes.has(code));
 if(missing.length){
  const {error}=await supabase.from('health_conditions').insert(missing.map(condition_code=>({
   client_id:updated.id,condition_code:conditionNames[condition_code],details:d.medicalNotes||'',status:'active',created_by:user.id
  })));
  if(error){console.error('QAWAM condition insert failed',error.code,error.message);return {error:'حُفظ الملف، لكن تعذر إضافة الحالات الصحية. حاول مرة ثانية.'};}
 }
 revalidatePath('/client');
 revalidatePath('/client/onboarding');
 return {success:true};
}