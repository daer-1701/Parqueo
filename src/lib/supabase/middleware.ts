import { getDashboardPath } from '@/lib/auth';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { assertSupabaseEnv } from './env';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { url, key } = assertSupabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user) {
    if (path.startsWith('/login') || path.startsWith('/api')) {
      return supabaseResponse;
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role;
  const dashboard = getDashboardPath(role);

  if (path === '/' || path === '/login') {
    if (dashboard === '/login') {
      await supabase.auth.signOut();
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      return NextResponse.redirect(redirectUrl);
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = dashboard;
    return NextResponse.redirect(redirectUrl);
  }

  if (path.startsWith('/admin') && role !== 'admin') {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = role === 'worker' ? '/worker' : '/login';
    return NextResponse.redirect(redirectUrl);
  }

  if (path.startsWith('/worker') && role !== 'worker') {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = role === 'admin' ? '/admin' : '/login';
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
