import {
  calculateWorkerDayCollections,
  getBoliviaDayRange,
} from '@/lib/worker-deposits';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'worker') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const dayOffset = Number.parseInt(searchParams.get('dayOffset') ?? '0', 10) || 0;

  try {
    const collections = await calculateWorkerDayCollections(supabase, user.id, dayOffset);
    const today = getBoliviaDayRange(0);

    return NextResponse.json({
      collections,
      isToday: collections.day === today.day,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
