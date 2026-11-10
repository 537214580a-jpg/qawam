import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { FoodMethodPicker } from '@/components/food-method-picker';
import { getClientSubscriptionAccess } from '@/lib/subscription-access';
import { ReadOnlyNotice } from '@/components/read-only-notice';
export default async function FoodPage(){
 const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');
 const {data:profile}=await db.from('profiles').select('locale').eq('id',user.id).maybeSingle();const en=profile?.locale==='en';
 const {data:client}=await db.from('clients').select('id,clinic_id').eq('user_id',user.id).maybeSingle();if(!client)redirect('/client/onboarding');
 const access=await getClientSubscriptionAccess(db,user.id);
 if(access.readOnly){
  const {data:history}=await db.from('meal_logs').select('id,meal_type,logged_at,meal_items(name,grams,calories,protein_g,carbs_g,fat_g)').eq('client_id',client.id).order('logged_at',{ascending:false}).limit(100);
  return <div className="space-y-5"><header><p className="text-sm font-bold text-qawam-500">{en?'Food history':'سجل الطعام'}</p><h1 className="mt-1 text-3xl font-extrabold">{en?'Previous meals':'وجباتك السابقة'}</h1></header><ReadOnlyNotice locale={en?'en':'ar'}/>{!history?.length?<section className="panel text-sm text-slate-500">{en?'No meals have been logged yet.':'لا توجد وجبات مسجلة.'}</section>:<div className="space-y-3">{history.map((log:any)=><article key={log.id} className="panel"><div className="flex justify-between gap-3"><strong>{log.meal_type}</strong><time className="text-xs text-slate-500">{new Date(log.logged_at).toLocaleString(en?'en-US':'ar-SA')}</time></div><div className="mt-2 space-y-1">{(log.meal_items||[]).map((item:any)=><p key={item.name+item.grams} className="text-sm text-slate-600">{item.name} · {item.grams}{en?' g':'غ'} · {Math.round(item.calories)} {en?'kcal':'سعرة'}</p>)}</div></article>)}</div>}</div>;
 }
 const [{data:publicFoods},{data:recipes}]=await Promise.all([
  db.from('foods').select('id,name_ar,name_en,calories,protein_g,carbs_g,fat_g').eq('is_public',true).is('clinic_id',null).order('name_ar'),
  db.from('recipes').select('id,name,servings,recipe_items(grams,foods(name_ar,name_en,calories,protein_g,carbs_g,fat_g))').eq('user_id',user.id).eq('is_usual',true).order('created_at',{ascending:false})
 ]);
 const clinicFoods=client.clinic_id?(await db.from('foods').select('id,name_ar,name_en,calories,protein_g,carbs_g,fat_g').eq('clinic_id',client.clinic_id).order('name_ar')).data||[]:[];
 const foods=[...(publicFoods||[]),...clinicFoods];
 return <div className="space-y-5"><header><p className="text-sm font-bold text-qawam-500">{en?'Food logging':'التسجيل الغذائي'}</p><h1 className="mt-1 text-3xl font-extrabold">{en?'Add your meal':'أضف وجبتك'}</h1><p className="mt-2 text-slate-500">{en?'Choose a method. Nutrition is calculated from foods in the database.':'اختر طريقة التسجيل. القيم تُحسب من الأطعمة الموجودة في قاعدة قوام.'}</p></header><FoodMethodPicker foods={foods as any[]} userId={user.id} recipes={(recipes||[]) as any[]} locale={en?'en':'ar'}/></div>;
}