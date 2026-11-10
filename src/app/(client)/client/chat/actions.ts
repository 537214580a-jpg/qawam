'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getClientSubscriptionAccess } from '@/lib/subscription-access';
const schema=z.object({clientId:z.string().uuid(),body:z.string().trim().min(1).max(5000)});
export async function sendChatMessage(formData:FormData){const p=schema.safeParse({clientId:formData.get('clientId'),body:formData.get('body')});if(!p.success)return {error:'اكتب رسالة قصيرة.'};const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)return {error:'سجل الدخول أولًا.'};const {data:client}=await db.from('clients').select('user_id').eq('id',p.data.clientId).maybeSingle();if(client?.user_id===user.id){const {data:profile}=await db.from('profiles').select('locale').eq('id',user.id).maybeSingle();const access=await getClientSubscriptionAccess(db,user.id);if(access.readOnly)return {error:profile?.locale==='en'?'Your subscription has expired. Renew to send new messages.':'انتهى اشتراكك. جدّد الاشتراك لإرسال رسائل جديدة.'};}const {error}=await db.from('messages').insert({client_id:p.data.clientId,sender_id:user.id,body:p.data.body});if(error)return {error:'تعذر إرسال الرسالة.'};revalidatePath('/client/chat');revalidatePath(`/clinic/clients/${p.data.clientId}`);return {success:true};}
