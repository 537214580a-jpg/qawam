import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

type AppRole='client'|'specialist'|'clinic_admin'|'super_admin';
function roleFromKey(value:unknown):AppRole|null{
 if(value==='client'||value==='specialist'||value==='clinic_admin'||value==='super_admin')return value;
 if(value==='owner'||value==='clinic_owner'||value==='admin')return 'clinic_admin';
 return null;
}
export async function middleware(request:NextRequest){
 let response=NextResponse.next({request});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)return response;
 const supabase=createServerClient(url,key,{cookies:{
  getAll:()=>request.cookies.getAll(),
  setAll(cookiesToSet){cookiesToSet.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});cookiesToSet.forEach(({name,value,options})=>response.cookies.set(name,value,options));}
 }});
 const {data:{user}}=await supabase.auth.getUser();const pathname=request.nextUrl.pathname;
 const protectedPath=['/client','/clinic','/admin'].some(path=>pathname.startsWith(path));
 if(!user&&protectedPath)return NextResponse.redirect(new URL('/login',request.url));
 if(user&&pathname.startsWith('/client')&&!['/client/consent','/client/settings','/client/subscription'].some(allowed=>pathname.startsWith(allowed))){
  const {data:legacyProfile}=await supabase.from('profiles').select('role,consent_health_at').eq('id',user.id).maybeSingle();
  if(legacyProfile?.role==='client'&&!legacyProfile.consent_health_at)return NextResponse.redirect(new URL('/client/consent',request.url));
 }
 if(user&&(pathname==='/login'||pathname==='/')){
  if(request.nextUrl.searchParams.get('portal')==='client'){
   const {data:client}=await supabase.from('clients').select('id').eq('user_id',user.id).maybeSingle();
   if(client)return NextResponse.redirect(new URL('/client',request.url));
  }
  let role:AppRole|null=null;
  const {data:membership}=await supabase.from('clinic_memberships').select('clinic_roles(role_key)').eq('user_id',user.id).eq('status','active').limit(1).maybeSingle();
  const linkedRole=membership?.clinic_roles;const clinicRole=(Array.isArray(linkedRole)?linkedRole[0]:linkedRole) as {role_key?:string}|null;
  role=roleFromKey(clinicRole?.role_key);
  if(!role){const {data:legacyProfile}=await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle();role=roleFromKey(legacyProfile?.role);}
  const destination=role==='super_admin'?'/admin':role==='client'?'/client':role?'/clinic':'/setup';
  return NextResponse.redirect(new URL(destination,request.url));
 }
 return response;
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/).*)']};