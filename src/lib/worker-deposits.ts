import { addWeeks, endOfWeek, parseISO, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import type { SupabaseClient } from '@supabase/supabase-js';
import { APP_TIMEZONE } from '@/lib/datetime';
import { totalSubscriptionAmount } from '@/lib/monthly-parking';
import type { MonthlyParking, WorkerDeposit } from '@/types/database';

export interface WeekDateRange {
  weekStart: string;
  weekEnd: string;
  start: Date;
  end: Date;
  label: string;
}

export interface WorkerWeekCollections {
  weekStart: string;
  weekEnd: string;
  label: string;
  expectedAmount: number;
  hourlyTotal: number;
  monthlyTotal: number;
  hourlyCount: number;
  monthlyCount: number;
}

export interface WorkerDepositWithProfile extends WorkerDeposit {
  worker_name: string;
}

export function getBoliviaWeekRange(weekOffset = 0): WeekDateRange {
  const now = addWeeks(new Date(), weekOffset);
  const zoned = toZonedTime(now, APP_TIMEZONE);
  const weekStartLocal = startOfWeek(zoned, { weekStartsOn: 1 });
  const weekEndLocal = endOfWeek(zoned, { weekStartsOn: 1 });

  const start = fromZonedTime(weekStartLocal, APP_TIMEZONE);
  const end = fromZonedTime(weekEndLocal, APP_TIMEZONE);

  const weekStart = formatInTimeZone(start, APP_TIMEZONE, 'yyyy-MM-dd');
  const weekEnd = formatInTimeZone(end, APP_TIMEZONE, 'yyyy-MM-dd');

  const label = `${formatInTimeZone(start, APP_TIMEZONE, 'd MMM', { locale: es })} – ${formatInTimeZone(end, APP_TIMEZONE, 'd MMM yyyy', { locale: es })}`;

  return { weekStart, weekEnd, start, end, label };
}

export async function findWeekCollections(
  supabase: SupabaseClient,
  workerId: string,
  weekStart: string
): Promise<WorkerWeekCollections | null> {
  for (let offset = 0; offset >= -8; offset--) {
    const collections = await calculateWorkerWeekCollections(supabase, workerId, offset);
    if (collections.weekStart === weekStart) return collections;
  }
  return null;
}

export async function calculateWorkerWeekCollections(
  supabase: SupabaseClient,
  workerId: string,
  weekOffset = 0
): Promise<WorkerWeekCollections> {
  const { weekStart, weekEnd, start, end, label } = getBoliviaWeekRange(weekOffset);

  const [{ data: hourlyRows }, { data: monthlyRows }] = await Promise.all([
    supabase
      .from('parking_entries')
      .select('amount')
      .eq('status', 'completed')
      .eq('worker_exit_id', workerId)
      .gt('amount', 0)
      .gte('exit_at', start.toISOString())
      .lte('exit_at', end.toISOString()),
    supabase
      .from('monthly_parking')
      .select('monthly_amount, period_start, period_end, paid_at')
      .eq('worker_id', workerId)
      .not('paid_at', 'is', null)
      .gte('paid_at', start.toISOString())
      .lte('paid_at', end.toISOString()),
  ]);

  const hourlyTotal = (hourlyRows ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const hourlyCount = hourlyRows?.length ?? 0;

  let monthlyTotal = 0;
  let monthlyCount = 0;
  for (const row of (monthlyRows ?? []) as Pick<
    MonthlyParking,
    'monthly_amount' | 'period_start' | 'period_end'
  >[]) {
    monthlyTotal += totalSubscriptionAmount(
      Number(row.monthly_amount),
      row.period_start,
      row.period_end
    );
    monthlyCount += 1;
  }

  return {
    weekStart,
    weekEnd,
    label,
    expectedAmount: Math.round((hourlyTotal + monthlyTotal) * 100) / 100,
    hourlyTotal: Math.round(hourlyTotal * 100) / 100,
    monthlyTotal: Math.round(monthlyTotal * 100) / 100,
    hourlyCount,
    monthlyCount,
  };
}

export async function getWorkerDepositForWeek(
  supabase: SupabaseClient,
  workerId: string,
  weekStart: string
): Promise<WorkerDeposit | null> {
  const { data } = await supabase
    .from('worker_deposits')
    .select('*')
    .eq('worker_id', workerId)
    .eq('week_start', weekStart)
    .maybeSingle();

  return data;
}

export interface PendingDepositWeek extends WorkerWeekCollections {
  isCurrentWeek: boolean;
}

export interface WorkerPendingDepositStatus {
  hasPending: boolean;
  pendingWeeks: PendingDepositWeek[];
  totalPendingAmount: number;
  currentWeekPending: PendingDepositWeek | null;
  pastWeeksCount: number;
}

export async function getWorkerPendingDepositStatus(
  supabase: SupabaseClient,
  workerId: string,
  lookbackWeeks = 4
): Promise<WorkerPendingDepositStatus> {
  const currentWeek = getBoliviaWeekRange(0);
  const pendingWeeks: PendingDepositWeek[] = [];

  for (let offset = 0; offset >= -(lookbackWeeks - 1); offset--) {
    const collections = await calculateWorkerWeekCollections(supabase, workerId, offset);
    const deposit = await getWorkerDepositForWeek(supabase, workerId, collections.weekStart);

    if (!deposit && collections.expectedAmount > 0) {
      pendingWeeks.push({
        ...collections,
        isCurrentWeek: collections.weekStart === currentWeek.weekStart,
      });
    }
  }

  const totalPendingAmount = pendingWeeks.reduce((sum, w) => sum + w.expectedAmount, 0);
  const currentWeekPending = pendingWeeks.find((w) => w.isCurrentWeek) ?? null;

  return {
    hasPending: pendingWeeks.length > 0,
    pendingWeeks,
    totalPendingAmount: Math.round(totalPendingAmount * 100) / 100,
    currentWeekPending,
    pastWeeksCount: pendingWeeks.filter((w) => !w.isCurrentWeek).length,
  };
}

export function formatWeekLabel(weekStart: string, weekEnd: string): string {
  const start = parseISO(weekStart);
  const end = parseISO(weekEnd);
  const fmt = new Intl.DateTimeFormat('es-BO', {
    day: 'numeric',
    month: 'short',
    timeZone: APP_TIMEZONE,
  });
  const yearFmt = new Intl.DateTimeFormat('es-BO', {
    year: 'numeric',
    timeZone: APP_TIMEZONE,
  });
  return `${fmt.format(start)} – ${fmt.format(end)} ${yearFmt.format(end)}`;
}
