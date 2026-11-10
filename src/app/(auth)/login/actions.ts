'use server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
const schema=z.object({contact:z.string().trim().min(5).max(254),channel:z.enum(['email','sms']),portal:z.enum(['client']).optional().or(z.literal(''))});
function normalizeSaudiPhone(value:string){
 const compact=value.trim().replace(/[\s()-]/g,'');
 if(/^\+\d{8,15}$/.test(compact))return compact;
 if(/^00966\d{9}$/.test(compact))return '+'+compact.slice(2);
 if(/^966\d{9}$/.test(compact))return '+'+compact;
 if(/^05\d{8}$/.test(compact))return '+966'+compact.slice(1);
 if(/^5\d{8}$/.test(compact))return '+966'+compact;
 return null;
}
export async function sendOtp(formData:FormData){
 const parsed=schema.safeParse({contact:formData.get('contact'),channel:formData.get('channel'),portal:formData.get('portal')||undefined});
 if(!parsed.success)return {error:'تحقق من رقم الجوال أو البريد الإلكتروني.'};
 const {channel,portal}=parsed.data;const supabase=await createSupabaseServerClient();
 if(portal==='client')cookies().set('qawam_login_portal','client',{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:600});
 else cookies().delete('qawam_login_portal');
 if(channel==='email'){
  const email=parsed.data.contact.toLowerCase();
  const {error}=await supabase.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:'https://qawam-mu.vercel.app/auth/callback'}});
  if(error)return {error:'تعذر إرسال رابط البريد: '+error.message};
  return {success:true,delivery:'email-link' as const};
 }
 const phone=normalizeSaudiPhone(parsed.data.contact);if(!phone)return {error:'اكتب الرقم بصيغة +9665xxxxxxxx أو 05xxxxxxxx.'};
 const {error}=await supabase.auth.signInWithOtp({phone,options:{shouldCreateUser:true}});
 if(error)return {error:'تعذر إرسال رمز الجوال: '+error.message};
 return {success:true,delivery:'sms-code' as const};
}
const verifySchema=z.object({contact:z.string().trim().min(5).max(254),token:z.string().regex(/^(?:\d{6}|\d{8})$/),channel:z.enum(['email','sms'])});
export async function verifyOtp(formData:FormData){
 const parsed=verifySchema.safeParse({contact:formData.get('contact'),token:formData.get('token'),channel:formData.get('channel')});
 if(!parsed.success)return {error:'أدخل رمز التحقق المكوّن من 6 أو 8 أرقام.'};
 const supabase=await createSupabaseServerClient();let error:{message:string}|null=null;
 if(parsed.data.channel==='email'){const {error:verifyError}=await supabase.auth.verifyOtp({email:parsed.data.contact.toLowerCase(),token:parsed.data.token,type:'email'});error=verifyError;}
 else{const phone=normalizeSaudiPhone(parsed.data.contact);if(!phone)return {error:'اكتب الرقم بصيغة +9665xxxxxxxx أو 05xxxxxxxx.'};const {error:verifyError}=await supabase.auth.verifyOtp({phone,token:parsed.data.token,type:'sms'});error=verifyError;}
 if(error)return {error:'الرمز غير صحيح أو انتهت صلاحيته: '+error.message};
 const locale=cookies().get('qawam_locale')?.value;if(locale==='ar'||locale==='en')await supabase.rpc('set_my_locale',{p_locale:locale});
 return {success:true};
}