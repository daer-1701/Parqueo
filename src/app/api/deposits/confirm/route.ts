import {
  calculateWorkerWeekCollections,
  findWeekCollections,
  getWorkerDepositForWeek,
} from '@/lib/worker-deposits';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface ConfirmBody {
  weekStart?: string;
  depositedAmount?: number;
  notes?: string;
}

export async function POST(request: Request) {
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

  let body: ConfirmBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const weekStart = body.weekStart?.trim();
  if (!weekStart) {
    return NextResponse.json({ error: 'Semana no especificada' }, { status: 400 });
  }

  const existing = await getWorkerDepositForWeek(supabase, user.id, weekStart);
  if (existing) {
    return NextResponse.json(
      { error: 'Esta semana ya fue confirmada' },
      { status: 409 }
    );
  }

  const collections = await findWeekCollections(supabase, user.id, weekStart);
  if (!collections) {
    return NextResponse.json({ error: 'Semana no válida' }, { status: 400 });
  }

  const depositedAmount =
    body.depositedAmount !== undefined
      ? Math.round(Number(body.depositedAmount) * 100) / 100
      : collections.expectedAmount;

  if (!Number.isFinite(depositedAmount) || depositedAmount < 0) {
    return NextResponse.json({ error: 'Monto depositado inválido' }, { status: 400 });
  }

  const notes = body.notes?.trim() || null;

  const { data, error } = await supabase
    .from('worker_deposits')
    .insert({
      worker_id: user.id,
      week_start: collections.weekStart,
      week_end: collections.weekEnd,
      expected_amount: collections.expectedAmount,
      deposited_amount: depositedAmount,
      hourly_total: collections.hourlyTotal,
      monthly_total: collections.monthlyTotal,
      hourly_count: collections.hourlyCount,
      monthly_count: collections.monthlyCount,
      notes,
      confirmed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, deposit: data });
}
