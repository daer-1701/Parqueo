import {
  calculateWorkerWeekCollections,
  formatWeekLabel,
  getBoliviaWeekRange,
  getWorkerDepositForWeek,
} from '@/lib/worker-deposits';
import { createAdminClient, verifyAdminSession } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

const RECENT_HISTORY_LIMIT = 10;

function mapDepositRow(
  d: {
    id: string;
    worker_id: string;
    week_start: string;
    week_end: string;
    expected_amount: number;
    deposited_amount: number;
    hourly_count: number;
    monthly_count: number;
    notes: string | null;
    confirmed_at: string;
  },
  profileMap: Map<string, string>
) {
  return {
    ...d,
    worker_name: profileMap.get(d.worker_id) ?? 'Operador',
    week_label: formatWeekLabel(d.week_start, d.week_end),
    difference:
      Math.round((Number(d.deposited_amount) - Number(d.expected_amount)) * 100) / 100,
  };
}

export async function GET(request: Request) {
  const auth = await verifyAdminSession();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const weekOffset = Number.parseInt(searchParams.get('weekOffset') ?? '0', 10) || 0;

  try {
    const admin = createAdminClient();
    const week = getBoliviaWeekRange(weekOffset);

    const [{ data: weekDepositRows }, { data: recentRows }, { data: profiles }] =
      await Promise.all([
        admin
          .from('worker_deposits')
          .select('*')
          .eq('week_start', week.weekStart)
          .order('confirmed_at', { ascending: false }),
        admin
          .from('worker_deposits')
          .select('*')
          .order('confirmed_at', { ascending: false })
          .limit(RECENT_HISTORY_LIMIT),
        admin.from('profiles').select('id, full_name, role').eq('role', 'worker'),
      ]);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p.full_name])
    );

    const weekDeposits = (weekDepositRows ?? []).map((d) =>
      mapDepositRow(d, profileMap)
    );
    const recentHistory = (recentRows ?? []).map((d) =>
      mapDepositRow(d, profileMap)
    );

    const workers = (profiles ?? []).map((p) => p.id);
    const pending: Array<{
      worker_id: string;
      worker_name: string;
      week_start: string;
      week_end: string;
      week_label: string;
      expected_amount: number;
      hourly_count: number;
      monthly_count: number;
    }> = [];

    let totalExpected = 0;

    for (const workerId of workers) {
      const existing = await getWorkerDepositForWeek(admin, workerId, week.weekStart);
      if (existing) {
        totalExpected += Number(existing.expected_amount);
        continue;
      }

      const collections = await calculateWorkerWeekCollections(admin, workerId, weekOffset);
      totalExpected += collections.expectedAmount;

      if (collections.expectedAmount > 0 || weekOffset < 0) {
        pending.push({
          worker_id: workerId,
          worker_name: profileMap.get(workerId) ?? 'Operador',
          week_start: collections.weekStart,
          week_end: collections.weekEnd,
          week_label: collections.label,
          expected_amount: collections.expectedAmount,
          hourly_count: collections.hourlyCount,
          monthly_count: collections.monthlyCount,
        });
      }
    }

    const weekSummary = {
      week_start: week.weekStart,
      week_end: week.weekEnd,
      week_label: week.label,
      total_expected: Math.round(totalExpected * 100) / 100,
      total_deposited: weekDeposits.reduce(
        (s, d) => s + Number(d.deposited_amount),
        0
      ),
      confirmed_count: weekDeposits.length,
      pending_count: pending.filter((p) => p.expected_amount > 0).length,
    };

    return NextResponse.json({
      weekDeposits,
      recentHistory,
      pending,
      weekSummary,
      workers_count: workers.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
