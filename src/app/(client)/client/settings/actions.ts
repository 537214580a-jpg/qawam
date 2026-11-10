'use server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
export async function revokeConsent(){const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)return {error:'سجل الدخول أولًا.'};const {data:consent}=await db.from('consents').select('id').eq('user_id',user.id).eq('consent_type','health_data').eq('granted',true).order('granted_at',{ascending:false}).limit(1).maybeSingle();if(consent)await db.from('consents').update({granted:false,revoked_at:new Date().toISOString()}).eq('id',consent.id);await db.from('profiles').update({consent_health_at:null}).eq('id',user.id);await db.from('notification_preferences').update({meal_enabled:false,water_enabled:false,weighin_enabled:false}).eq('user_id',user.id);revalidatePath('/client/settings');return {success:true};}

const localeSchema=z.enum(['ar','en']);
export async function setPreferredLocale(formData:FormData){
 const parsed=localeSchema.safeParse(formData.get('locale'));
 if(!parsed.success)return {error:'اللغة غير مدعومة.'};
 const db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return {error:'سجّل الدخول أولًا.'};
 const {error}=await db.rpc('set_my_locale',{p_locale:parsed.data});
 if(error)return {error:'تعذر حفظ اللغة لحسابك.'};
 cookies().set('qawam_locale',parsed.data,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*24*365});
 revalidatePath('/', 'layout');
 return {success:true,locale:parsed.data};
}
