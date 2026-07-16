import { formatWeekLabel } from '@/lib/worker-deposits';
import { createAdminClient, verifyAdminSession } from '@/lib/supabase/admin';
import {
  APP_TIMEZONE,
  getBoliviaCustomRange,
  getBoliviaPeriodRange,
  type ReportPeriod,
} from '@/lib/datetime';
import { formatInTimeZone } from 'date-fns-tz';
import { NextResponse } from 'next/server';

function parsePeriod(value: string | null): ReportPeriod | 'custom' {
  if (value === 'day' || value === 'week' || value === 'month' || value === 'custom') {
    return value;
  }
  return 'month';
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

  try {
    let range;
    if (period === 'custom') {
      if (!startDate || !endDate || startDate > endDate) {
        return NextResponse.json(
          { error: 'Rango de fechas inválido' },
          { status: 400 }
        );
      }
      range = getBoliviaCustomRange(startDate, endDate);
    } else {
      range = getBoliviaPeriodRange(period);
    }

    const rangeStartDate = formatInTimeZone(range.start, APP_TIMEZONE, 'yyyy-MM-dd');
    const rangeEndDate = formatInTimeZone(range.end, APP_TIMEZONE, 'yyyy-MM-dd');

    const admin = createAdminClient();

    const [{ data: depositRows }, { data: profiles }] = await Promise.all([
      admin
        .from('worker_deposits')
        .select('*')
        .gte('confirmed_at', range.start.toISOString())
        .lte('confirmed_at', range.end.toISOString())
        .order('confirmed_at', { ascending: false }),
      admin.from('profiles').select('id, full_name, role').eq('role', 'worker'),
    ]);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

    const deposits = (depositRows ?? []).map((d) => {
      const expected = Number(d.expected_amount);
      const deposited = Number(d.deposited_amount);
      return {
        id: d.id,
        worker_id: d.worker_id,
        worker_name: profileMap.get(d.worker_id) ?? 'Operador',
        week_start: d.week_start,
        week_end: d.week_end,
        week_label: formatWeekLabel(d.week_start, d.week_end),
        expected_amount: expected,
        deposited_amount: deposited,
        difference: Math.round((deposited - expected) * 100) / 100,
        hourly_total: Number(d.hourly_total),
        monthly_total: Number(d.monthly_total),
        hourly_count: d.hourly_count,
        monthly_count: d.monthly_count,
        notes: d.notes,
        confirmed_at: d.confirmed_at,
      };
    });

    const totalExpected = deposits.reduce((s, d) => s + d.expected_amount, 0);
    const totalDeposited = deposits.reduce((s, d) => s + d.deposited_amount, 0);

    const byWorkerMap = new Map<
      string,
      {
        worker_id: string;
        worker_name: string;
        deposits_count: number;
        expected_amount: number;
        deposited_amount: number;
        difference: number;
      }
    >();

    for (const d of deposits) {
      const current = byWorkerMap.get(d.worker_id) ?? {
        worker_id: d.worker_id,
        worker_name: d.worker_name,
        deposits_count: 0,
        expected_amount: 0,
        deposited_amount: 0,
        difference: 0,
      };
      current.deposits_count += 1;
      current.expected_amount += d.expected_amount;
      current.deposited_amount += d.deposited_amount;
      current.difference = Math.round(
        (current.deposited_amount - current.expected_amount) * 100
      ) / 100;
      byWorkerMap.set(d.worker_id, current);
    }

    const byWorker = [...byWorkerMap.values()].sort(
      (a, b) => b.deposited_amount - a.deposited_amount
    );

    const byWeekMap = new Map<
      string,
      { period: string; week_start: string; deposited: number; expected: number; count: number }
    >();

    for (const d of deposits) {
      const current = byWeekMap.get(d.week_start) ?? {
        period: d.week_label,
        week_start: d.week_start,
        deposited: 0,
        expected: 0,
        count: 0,
      };
      current.deposited += d.deposited_amount;
      current.expected += d.expected_amount;
      current.count += 1;
      byWeekMap.set(d.week_start, current);
    }

    const chartData = [...byWeekMap.values()]
      .sort((a, b) => a.week_start.localeCompare(b.week_start))
      .map((w) => ({
        period: w.period,
        revenue: Math.round(w.deposited * 100) / 100,
        entries: w.count,
        expected: Math.round(w.expected * 100) / 100,
      }));

    return NextResponse.json({
      summary: {
        total_expected: Math.round(totalExpected * 100) / 100,
        total_deposited: Math.round(totalDeposited * 100) / 100,
        difference: Math.round((totalDeposited - totalExpected) * 100) / 100,
        deposits_count: deposits.length,
        workers_count: byWorker.length,
        range_start: rangeStartDate,
        range_end: rangeEndDate,
      },
      chartData,
      byWorker,
      deposits,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
