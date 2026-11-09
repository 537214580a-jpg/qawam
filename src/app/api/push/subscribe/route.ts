import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
const schema=z.object({endpoint:z.string().url(),keys:z.object({p256dh:z.string().min(10),auth:z.string().min(5)})});
export async function POST(request:Request){const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'بيانات الاشتراك غير صالحة.'},{status:400});const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:'غير مصرح'},{status:401});const {endpoint,keys}=parsed.data;const {error}=await db.from('push_subscriptions').upsert({user_id:user.id,endpoint,p256dh:keys.p256dh,auth:keys.auth},{onConflict:'endpoint'});if(error)return NextResponse.json({error:'تعذر حفظ الاشتراك.'},{status:500});return NextResponse.json({success:true});}
