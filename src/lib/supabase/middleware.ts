import { getDashboardPath } from '@/lib/auth';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { assertSupabaseEnv } from './env';

function withSupabaseCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach(({ name, value, ...options }) => {
    target.cookies.set(name, value, options);
  });
  return target;
}

function redirectToLogin(
  request: NextRequest,
  supabaseResponse: NextResponse
) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = '/login';
  return withSupabaseCookies(
    supabaseResponse,
    NextResponse.redirect(redirectUrl)
  );
}

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
    error: authError,
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const hasAuthCookies = request.cookies
    .getAll()
    .some((c) => c.name.includes('auth-token'));

  if (authError || !user) {
    if (hasAuthCookies) {
      await supabase.auth.signOut();
    }

    if (path.startsWith('/login') || path.startsWith('/api')) {
      return supabaseResponse;
    }

    return redirectToLogin(request, supabaseResponse);
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
      return redirectToLogin(request, supabaseResponse);
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = dashboard;
    return withSupabaseCookies(
      supabaseResponse,
      NextResponse.redirect(redirectUrl)
    );
  }

  if (path.startsWith('/admin') && role !== 'admin') {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = role === 'worker' ? '/worker' : '/login';
    return withSupabaseCookies(
      supabaseResponse,
      NextResponse.redirect(redirectUrl)
    );
  }

  if (path.startsWith('/worker') && role !== 'worker') {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = role === 'admin' ? '/admin' : '/login';
    return withSupabaseCookies(
      supabaseResponse,
      NextResponse.redirect(redirectUrl)
    );
  }

  return supabaseResponse;
}
