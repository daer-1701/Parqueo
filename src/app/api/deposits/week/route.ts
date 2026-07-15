import {
  calculateWorkerWeekCollections,
  getBoliviaWeekRange,
  getWorkerDepositForWeek,
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
  const weekOffset = Number.parseInt(searchParams.get('weekOffset') ?? '0', 10) || 0;

  try {
    const collections = await calculateWorkerWeekCollections(supabase, user.id, weekOffset);
    const deposit = await getWorkerDepositForWeek(supabase, user.id, collections.weekStart);

    const { data: history } = await supabase
      .from('worker_deposits')
      .select('*')
      .eq('worker_id', user.id)
      .order('week_start', { ascending: false })
      .limit(10);

    const currentWeek = getBoliviaWeekRange(0);

    return NextResponse.json({
      collections,
      deposit,
      history: history ?? [],
      isCurrentWeek: collections.weekStart === currentWeek.weekStart,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
