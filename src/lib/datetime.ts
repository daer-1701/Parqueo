import {
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  getHours,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

/** Zona horaria de Bolivia (UTC-4, sin horario de verano) */
export const APP_TIMEZONE = 'America/La_Paz';
export const APP_LOCALE = 'es-BO';

export function nowInBolivia(): Date {
  return toZonedTime(new Date(), APP_TIMEZONE);
}

export function toBoliviaTime(date: Date | string): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return toZonedTime(d, APP_TIMEZONE);
}

export function formatBoliviaDateTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? iso : iso.toISOString();
  return formatInTimeZone(d, APP_TIMEZONE, 'dd/MM/yyyy HH:mm', { locale: es });
}

export function formatBoliviaTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? iso : iso.toISOString();
  return formatInTimeZone(d, APP_TIMEZONE, 'HH:mm', { locale: es });
}

export function formatBoliviaDateShort(iso: string | Date): string {
  const d = typeof iso === 'string' ? iso : iso.toISOString();
  return formatInTimeZone(d, APP_TIMEZONE, 'dd/MM HH:mm', { locale: es });
}

export function formatBoliviaDayLabel(date: Date, weekDay = false): string {
  const pattern = weekDay ? 'EEE' : 'd MMM';
  return formatInTimeZone(date, APP_TIMEZONE, pattern, { locale: es });
}

function boliviaStartOfDay(date: Date): Date {
  const zoned = toZonedTime(date, APP_TIMEZONE);
  return fromZonedTime(startOfDay(zoned), APP_TIMEZONE);
}

function boliviaEndOfDay(date: Date): Date {
  const zoned = toZonedTime(date, APP_TIMEZONE);
  return fromZonedTime(endOfDay(zoned), APP_TIMEZONE);
}

export type ReportPeriod = 'day' | 'week' | 'month';
export type ReportFilter = ReportPeriod | 'custom';

export interface BoliviaDateRange {
  start: Date;
  end: Date;
  days: number;
}

export function todayInBolivia(): string {
  return formatInTimeZone(new Date(), APP_TIMEZONE, 'yyyy-MM-dd');
}

export function formatBoliviaDateInput(iso: string | Date): string {
  const d = typeof iso === 'string' ? iso : iso.toISOString();
  return formatInTimeZone(d, APP_TIMEZONE, 'dd/MM/yyyy', { locale: es });
}

export function getBoliviaCustomRange(startDate: string, endDate: string): BoliviaDateRange {
  const start = fromZonedTime(new Date(`${startDate}T00:00:00`), APP_TIMEZONE);
  const end = fromZonedTime(new Date(`${endDate}T23:59:59.999`), APP_TIMEZONE);
  const days = differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1;

  return { start, end, days };
}

export function getBoliviaPeriodRange(period: ReportPeriod): BoliviaDateRange {
  const now = new Date();

  switch (period) {
    case 'day':
      return {
        start: boliviaStartOfDay(now),
        end: boliviaEndOfDay(now),
        days: 1,
      };
    case 'week': {
      const zoned = toZonedTime(now, APP_TIMEZONE);
      const weekStart = fromZonedTime(
        startOfWeek(zoned, { weekStartsOn: 1 }),
        APP_TIMEZONE
      );
      const weekEnd = fromZonedTime(
        endOfWeek(zoned, { weekStartsOn: 1 }),
        APP_TIMEZONE
      );
      return { start: weekStart, end: weekEnd, days: 7 };
    }
    case 'month': {
      const zoned = toZonedTime(now, APP_TIMEZONE);
      const monthStart = fromZonedTime(startOfMonth(zoned), APP_TIMEZONE);
      const monthEnd = fromZonedTime(endOfMonth(zoned), APP_TIMEZONE);
      return { start: monthStart, end: monthEnd, days: 30 };
    }
  }
}

export function isInBoliviaPeriod(iso: string, start: Date, end: Date): boolean {
  const date = parseISO(iso);
  return date >= start && date <= end;
}

export function getBoliviaHour(iso: string): number {
  return getHours(toBoliviaTime(iso));
}

export function formatBoliviaNow(): string {
  return formatInTimeZone(new Date(), APP_TIMEZONE, "EEEE d 'de' MMMM, HH:mm", {
    locale: es,
  });
}
