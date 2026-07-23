import { addDays, addMonths, differenceInCalendarMonths, parseISO, subDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import type { SupabaseClient } from '@supabase/supabase-js';
import { APP_TIMEZONE } from '@/lib/datetime';
import { normalizePlate } from '@/lib/plate';

export { normalizePlate };

export function todayDateString(): string {
  return formatInTimeZone(new Date(), APP_TIMEZONE, 'yyyy-MM-dd');
}

/** Desde una fecha de inicio, N meses (vence el día anterior al mismo día del mes final). */
export function calculateSubscriptionPeriod(
  startDate: string,
  durationMonths: number
): { periodStart: string; periodEnd: string } {
  const months = Math.max(1, Math.min(24, durationMonths));
  const start = parseISO(startDate);
  const end = subDays(addMonths(start, months), 1);

  return {
    periodStart: formatInTimeZone(start, APP_TIMEZONE, 'yyyy-MM-dd'),
    periodEnd: formatInTimeZone(end, APP_TIMEZONE, 'yyyy-MM-dd'),
  };
}

export function countPeriodMonths(periodStart: string, periodEnd: string): number {
  const endExclusive = addDays(parseISO(periodEnd), 1);
  return Math.max(1, differenceInCalendarMonths(endExclusive, parseISO(periodStart)));
}

export function totalSubscriptionAmount(
  monthlyAmount: number,
  periodStart: string,
  periodEnd: string
): number {
  return monthlyAmount * countPeriodMonths(periodStart, periodEnd);
}

export function formatPeriodRange(periodStart: string, periodEnd: string): string {
  const fmt = new Intl.DateTimeFormat('es-BO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: APP_TIMEZONE,
  });
  return `${fmt.format(parseISO(periodStart))} → ${fmt.format(parseISO(periodEnd))}`;
}

export function formatDurationLabel(months: number): string {
  if (months === 1) return '1 mes';
  return `${months} meses`;
}

export function isSubscriptionCurrent(
  periodStart: string,
  periodEnd: string,
  status: string
): boolean {
  if (status !== 'active') return false;
  const today = todayDateString();
  return periodStart <= today && periodEnd >= today;
}

export async function hasActiveMonthlyPlate(
  supabase: SupabaseClient,
  plate: string
): Promise<boolean> {
  const normalized = normalizePlate(plate);
  const today = todayDateString();
  const { data } = await supabase
    .from('monthly_parking')
    .select('id')
    .eq('status', 'active')
    .ilike('plate', normalized)
    .lte('period_start', today)
    .gte('period_end', today)
    .maybeSingle();
  return Boolean(data);
}
