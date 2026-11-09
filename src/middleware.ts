import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });
  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const protectedPath = ['/client', '/clinic', '/admin'].some((path) => pathname.startsWith(path));
  if (!user && protectedPath) return NextResponse.redirect(new URL('/login', request.url));
  if (user && pathname.startsWith('/client') && !['/client/consent','/client/settings','/client/subscription'].some(allowed => pathname.startsWith(allowed))) {
    const { data: profile } = await supabase.from('profiles').select('role,consent_health_at').eq('id', user.id).maybeSingle();
    if (profile?.role === 'client' && !profile.consent_health_at) return NextResponse.redirect(new URL('/client/consent', request.url));
  }
  if (user && (pathname === '/login' || pathname === '/')) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    const destination = profile?.role === 'super_admin' ? '/admin' : profile?.role === 'client' ? '/client' : '/clinic';
    return NextResponse.redirect(new URL(destination, request.url));
  }
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/).*)'] };
