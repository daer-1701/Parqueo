import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env';
import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('Configuración del servidor incompleta', { status: 503 });
    }
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: ['/', '/login', '/admin/:path*', '/worker/:path*', '/api/users/:path*'],
};
