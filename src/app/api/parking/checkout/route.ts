import { calculateParkingAmount } from '@/lib/pricing';
import { createClient } from '@/lib/supabase/server';
import { APP_TIMEZONE } from '@/lib/datetime';
import type { PricingConfig, VehicleType } from '@/types/database';
import { formatInTimeZone } from 'date-fns-tz';
import { NextResponse } from 'next/server';

interface CheckoutBody {
  entryId?: string;
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

  let body: CheckoutBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const entryId = body.entryId?.trim();
  if (!entryId) {
    return NextResponse.json({ error: 'Entrada no especificada' }, { status: 400 });
  }

  const { data: entry, error: entryError } = await supabase
    .from('parking_entries')
    .select('id, plate, vehicle_type, entry_at, status')
    .eq('id', entryId)
    .single();

  if (entryError || !entry) {
    return NextResponse.json({ error: 'Entrada no encontrada' }, { status: 404 });
  }

  if (entry.status !== 'active') {
    return NextResponse.json({ error: 'La entrada ya no está activa' }, { status: 409 });
  }

  const now = new Date();
  const today = formatInTimeZone(now, APP_TIMEZONE, 'yyyy-MM-dd');

  const { data: monthly } = await supabase
    .from('monthly_parking')
    .select('id')
    .eq('status', 'active')
    .ilike('plate', entry.plate)
    .lte('period_start', today)
    .gte('period_end', today)
    .maybeSingle();

  let amount = 0;
  if (!monthly) {
    const { data: pricing } = await supabase
      .from('pricing_config')
      .select('*');

    amount = calculateParkingAmount(
      entry.vehicle_type as VehicleType,
      new Date(entry.entry_at),
      now,
      (pricing ?? []) as PricingConfig[]
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from('parking_entries')
    .update({
      status: 'completed',
      exit_at: now.toISOString(),
      amount,
      worker_exit_id: user.id,
      payment_method: 'cash',
    })
    .eq('id', entryId)
    .eq('status', 'active')
    .select('id, amount, exit_at, status')
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: updateError?.message ?? 'No se pudo completar la salida' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    entry: updated,
    appliedMonthly: Boolean(monthly),
  });
}
