'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getClientSubscriptionAccess } from '@/lib/subscription-access';

const schema=z.object({
 mealType:z.string().trim().min(1).max(40),
 photoPath:z.string().trim().max(500).optional(),
 items:z.array(z.object({foodId:z.string().uuid(),grams:z.number().positive().max(5000)})).min(1).max(30)
});
function riyadhDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export async function saveFoodMeal(formData:FormData){
 let rawItems:unknown;
 try{rawItems=JSON.parse(String(formData.get('items')||''));}catch{return {error:'قائمة الأطعمة غير صالحة.'};}
 const parsed=schema.safeParse({mealType:formData.get('mealType'),photoPath:formData.get('photoPath')||undefined,items:rawItems});
 if(!parsed.success)return {error:'اختر صنفًا واحدًا على الأقل وأدخل كمية صحيحة بالجرام.'};
 const db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return {error:'سجل الدخول من جديد.'};
 const {data:profile}=await db.from('profiles').select('consent_health_at').eq('id',user.id).maybeSingle();
 if(!profile?.consent_health_at)return {error:'وافق على معالجة بياناتك الصحية أولًا.'};
 const {data:client,error:clientError}=await db.from('clients').select('id,clinic_id,journey_start_date').eq('user_id',user.id).maybeSingle();
 if(clientError||!client)return {error:'أكمل ملفك الشخصي أولًا.'};
 if(client.journey_start_date&&client.journey_start_date>riyadhDate())return {error:'تبدأ تسجيلاتك في تاريخ بداية الرحلة المحدد.'};
 const access=await getClientSubscriptionAccess(db,user.id);
 if(access.readOnly)return {error:'انتهى اشتراكك. تقدر تشاهد السجلات السابقة فقط.'};
 if(parsed.data.photoPath&&!parsed.data.photoPath.startsWith(`${user.id}/meals/`))return {error:'مسار الصورة غير صالح.'};
 const ids=[...new Set(parsed.data.items.map(item=>item.foodId))];
 const {data:foods,error:foodsError}=await db.from('foods').select('id,name_ar,calories,protein_g,carbs_g,fat_g').in('id',ids);
 if(foodsError)return {error:'تعذر قراءة قاعدة الطعام.'};
 const foodMap=new Map((foods||[]).map(food=>[food.id,food]));
 if(foodMap.size!==ids.length)return {error:'أحد الأصناف غير متاح في قاعدة الأطعمة.'};
 const nutritionItems=parsed.data.items.map(item=>{
  const food=foodMap.get(item.foodId)!;
  const factor=item.grams/100;
  return {food_id:food.id,name:food.name_ar,grams:item.grams,calories:Number(food.calories)*factor,protein_g:Number(food.protein_g)*factor,carbs_g:Number(food.carbs_g)*factor,fat_g:Number(food.fat_g)*factor};
 });
 const {data:log,error:logError}=await db.from('meal_logs').insert({
  client_id:client.id,meal_type:parsed.data.mealType,photo_path:parsed.data.photoPath||null,
  source:parsed.data.photoPath?'photo':'manual'
 }).select('id').single();
 if(logError||!log){console.error('QAWAM meal create failed',logError?.code,logError?.message);return {error:'تعذر حفظ الوجبة.'};}
 const {error:itemError}=await db.from('meal_items').insert(nutritionItems.map(item=>({...item,meal_log_id:log.id})));
 if(itemError){await db.from('meal_logs').delete().eq('id',log.id);console.error('QAWAM meal items save failed',itemError.code,itemError.message);return {error:'تعذر حفظ مكونات الوجبة.'};}
 revalidatePath('/client');revalidatePath('/client/food');
 return {success:true};
}