'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
const schema=z.object({clientId:z.string().uuid(),body:z.string().trim().min(1).max(5000)});
export async function sendChatMessage(formData:FormData){const p=schema.safeParse({clientId:formData.get('clientId'),body:formData.get('body')});if(!p.success)return {error:'اكتب رسالة قصيرة.'};const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)return {error:'سجل الدخول أولًا.'};const {error}=await db.from('messages').insert({client_id:p.data.clientId,sender_id:user.id,body:p.data.body});if(error)return {error:'تعذر إرسال الرسالة.'};revalidatePath('/client/chat');revalidatePath(`/clinic/clients/${p.data.clientId}`);return {success:true};}
