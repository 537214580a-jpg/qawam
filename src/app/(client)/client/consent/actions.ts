'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
export async function grantHealthConsent(formData:FormData){const p=z.literal('yes').safeParse(formData.get('consent'));if(!p.success)return {error:'وافق على معالجة البيانات الصحية للمتابعة.'};const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)return {error:'انتهت الجلسة. سجل الدخول مرة أخرى.'};const now=new Date().toISOString();const {error}=await db.from('consents').upsert({user_id:user.id,consent_type:'health_data',version:'2026-11-01',granted:true,granted_at:now,revoked_at:null},{onConflict:'user_id,consent_type,version'});if(error)return {error:'تعذر حفظ موافقتك.'};await db.from('profiles').update({consent_health_at:now}).eq('id',user.id);revalidatePath('/client');return {success:true};}
