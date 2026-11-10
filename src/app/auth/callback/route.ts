import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const requestUrl=new URL(request.url);const code=requestUrl.searchParams.get('code');
 if(!code)return NextResponse.redirect(new URL('/login?auth=expired',requestUrl.origin));
 const supabase=await createSupabaseServerClient();const {error}=await supabase.auth.exchangeCodeForSession(code);
 if(error)return NextResponse.redirect(new URL('/login?auth=expired',requestUrl.origin));
 const cookieStore=cookies();const portal=cookieStore.get('qawam_login_portal')?.value;cookieStore.delete('qawam_login_portal');
 if(portal==='client'){
  const {data:{user}}=await supabase.auth.getUser();
  if(user){
   const {data:client}=await supabase.from('clients').select('id').eq('user_id',user.id).maybeSingle();
   if(client)return NextResponse.redirect(new URL('/client',requestUrl.origin));
  }
 }
 return NextResponse.redirect(new URL('/',requestUrl.origin));
}