import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
export async function POST(request:Request){const body=await request.json().catch(()=>null);const parsed=z.object({confirmation:z.literal('احذف حسابي')}).safeParse(body);if(!parsed.success)return NextResponse.json({error:'أدخل عبارة التأكيد المطلوبة.'},{status:400});const auth=await createSupabaseServerClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:'غير مصرح'},{status:401});await auth.auth.signOut();const admin=createSupabaseAdminClient();const {error}=await admin.auth.admin.deleteUser(user.id);if(error)return NextResponse.json({error:'تعذر حذف الحساب.'},{status:500});return NextResponse.json({success:true});}
