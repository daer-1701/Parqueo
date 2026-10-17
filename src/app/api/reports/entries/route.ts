import { verifyAdminSession } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  getBoliviaCustomRange,
  getBoliviaPeriodRange,
  type ReportPeriod,
} from '@/lib/datetime';
import type { ParkingEntry } from '@/types/database';
import { NextResponse } from 'next/server';

const PAGE_SIZE = 1000;
const MAX_ROWS = 20000;

const ENTRY_COLUMNS =
  'id, plate, vehicle_type, entry_at, exit_at, amount, status, payment_method, notes, worker_entry_id, worker_exit_id, created_at';

function parsePeriod(value: string | null): ReportPeriod | 'custom' {
  if (value === 'day' || value === 'week' || value === 'month' || value === 'custom') {
    return value;
  }
  return 'day';
}

export async function GET(request: Request) {
  const auth = await verifyAdminSession();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const period = parsePeriod(searchParams.get('period'));
  const startDate = searchParams.get('start')?.trim() ?? '';
  const endDate = searchParams.get('end')?.trim() ?? '';

  let range;
  if (period === 'custom') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return NextResponse.json({ error: 'Rango de fechas inválido' }, { status: 400 });
    }
    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'La fecha de inicio no puede ser posterior a la fecha de fin' },
        { status: 400 }
      );
    }
    range = getBoliviaCustomRange(startDate, endDate);
  } else {
    range = getBoliviaPeriodRange(period);
  }

  try {
    const supabase = await createClient();
    const entries: ParkingEntry[] = [];
    let from = 0;
    let truncated = false;

    while (entries.length < MAX_ROWS) {
      const { data, error } = await supabase
        .from('parking_entries')
        .select(ENTRY_COLUMNS)
        .eq('status', 'completed')
        .gte('exit_at', range.start.toISOString())
        .lte('exit_at', range.end.toISOString())
        .order('exit_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const page = data ?? [];
      entries.push(...page);

      if (page.length < PAGE_SIZE) break;

      from += PAGE_SIZE;
      if (entries.length >= MAX_ROWS) {
        truncated = true;
        break;
      }
    }

    return NextResponse.json({
      entries: entries.slice(0, MAX_ROWS),
      truncated,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
