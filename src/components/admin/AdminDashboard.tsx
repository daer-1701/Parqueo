'use client';

import {
  formatBoliviaDateInput,
  formatBoliviaDateShort,
  formatBoliviaDayLabel,
  getBoliviaCustomRange,
  getBoliviaHour,
  getBoliviaPeriodRange,
  isInBoliviaPeriod,
  APP_TIMEZONE,
  todayInBolivia,
  type BoliviaDateRange,
  type ReportFilter,
  type ReportPeriod,
} from '@/lib/datetime';
import { formatCurrency } from '@/lib/pricing';
import type { ParkingEntry, ReportPeriodData, ReportSummary } from '@/types/database';
import { PAYMENT_LABELS, VEHICLE_LABELS } from '@/types/database';
import { addDays, endOfDay, parseISO, startOfDay } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { CalendarRange } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useMemo, useState } from 'react';

interface AdminDashboardProps {
  entries: ParkingEntry[];
}

function filterByRange(entries: ParkingEntry[], range: BoliviaDateRange) {
  return entries.filter(
    (e) => e.exit_at && isInBoliviaPeriod(e.exit_at, range.start, range.end)
  );
}

function buildChartData(entries: ParkingEntry[], range: BoliviaDateRange): ReportPeriodData[] {
  const isSingleDay = range.days === 1;

  if (isSingleDay) {
    return Array.from({ length: 24 }, (_, hour) => {
      const hourEntries = entries.filter(
        (e) => e.exit_at && getBoliviaHour(e.exit_at) === hour
      );
      return {
        period: `${hour.toString().padStart(2, '0')}:00`,
        entries: hourEntries.length,
        revenue: hourEntries.reduce((sum, e) => sum + (e.amount ?? 0), 0),
      };
    });
  }

  const chartDays: { start: Date; end: Date; labelDate: Date }[] = [];
  let cursor = range.start;
  while (cursor <= range.end) {
    const zoned = toZonedTime(cursor, APP_TIMEZONE);
    chartDays.push({
      start: fromZonedTime(startOfDay(zoned), APP_TIMEZONE),
      end: fromZonedTime(endOfDay(zoned), APP_TIMEZONE),
      labelDate: zoned,
    });
    cursor = addDays(cursor, 1);
  }

  const useWeekdayLabels = range.days <= 7;

  return chartDays.map(({ start: dayStart, end: dayEnd, labelDate }) => {
    const dayEntries = entries.filter((e) => {
      if (!e.exit_at) return false;
      const exitDate = parseISO(e.exit_at);
      return exitDate >= dayStart && exitDate <= dayEnd;
    });

    return {
      period: formatBoliviaDayLabel(labelDate, useWeekdayLabels),
      entries: dayEntries.length,
      revenue: dayEntries.reduce((sum, e) => sum + (e.amount ?? 0), 0),
    };
  });
}

function computeSummary(entries: ParkingEntry[]): ReportSummary {
  const totalRevenue = entries.reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const totalHours = entries.reduce((sum, e) => {
    if (!e.exit_at) return sum;
    const hours =
      (parseISO(e.exit_at).getTime() - parseISO(e.entry_at).getTime()) / (1000 * 60 * 60);
    return sum + hours;
  }, 0);

  return {
    total_entries: entries.length,
    total_revenue: totalRevenue,
    avg_amount: entries.length > 0 ? totalRevenue / entries.length : 0,
    avg_hours: entries.length > 0 ? totalHours / entries.length : 0,
  };
}

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  day: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes',
};

function getRangeLabel(
  filter: ReportFilter,
  customStart: string,
  customEnd: string
): string {
  if (filter === 'custom' && customStart && customEnd) {
    if (customStart === customEnd) {
      return formatBoliviaDateInput(`${customStart}T12:00:00`);
    }
    return `${formatBoliviaDateInput(`${customStart}T12:00:00`)} — ${formatBoliviaDateInput(`${customEnd}T12:00:00`)}`;
  }
  return PERIOD_LABELS[filter as ReportPeriod];
}

export function AdminDashboard({ entries }: AdminDashboardProps) {
  const today = todayInBolivia();
  const [filter, setFilter] = useState<ReportFilter>('day');
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);

  const rangeInvalid =
    filter === 'custom' && Boolean(customStart && customEnd && customStart > customEnd);

  const activeRange = useMemo((): BoliviaDateRange => {
    if (filter === 'custom' && customStart && customEnd && !rangeInvalid) {
      return getBoliviaCustomRange(customStart, customEnd);
    }
    if (filter === 'custom') {
      return getBoliviaPeriodRange('day');
    }
    return getBoliviaPeriodRange(filter);
  }, [filter, customStart, customEnd, rangeInvalid]);

  const rangeLabel = getRangeLabel(filter, customStart, customEnd);

  const filtered = useMemo(
    () => (filter === 'custom' && rangeInvalid ? [] : filterByRange(entries, activeRange)),
    [entries, activeRange, filter, rangeInvalid]
  );
  const summary = useMemo(() => computeSummary(filtered), [filtered]);
  const chartData = useMemo(
    () => (filter === 'custom' && rangeInvalid ? [] : buildChartData(filtered, activeRange)),
    [filtered, activeRange, filter, rangeInvalid]
  );

  const paymentBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    filtered.forEach((e) => {
      if (e.payment_method) {
        breakdown[e.payment_method] =
          (breakdown[e.payment_method] ?? 0) + (e.amount ?? 0);
      }
    });
    return breakdown;
  }, [filtered]);

  const vehicleBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    filtered.forEach((e) => {
      breakdown[e.vehicle_type] = (breakdown[e.vehicle_type] ?? 0) + 1;
    });
    return breakdown;
  }, [filtered]);

  const isSingleDay = activeRange.days === 1;
  const chartTicksDense = chartData.length > 14;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(PERIOD_LABELS) as ReportPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={`px-2 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors touch-manipulation ${
                filter === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        <div
          className={`rounded-xl border p-3 sm:p-4 ${
            filter === 'custom'
              ? 'border-blue-300 bg-blue-50/50'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <CalendarRange className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-sm font-medium text-slate-700">Rango de fechas</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Desde</label>
              <input
                type="date"
                value={customStart}
                max={customEnd || today}
                onChange={(e) => {
                  setCustomStart(e.target.value);
                  setFilter('custom');
                }}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Hasta</label>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                max={today}
                onChange={(e) => {
                  setCustomEnd(e.target.value);
                  setFilter('custom');
                }}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>
          {rangeInvalid && (
            <p className="mt-2 text-xs text-red-600">
              La fecha de inicio no puede ser posterior a la fecha de fin.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border bg-blue-50 text-blue-700 border-blue-100 p-4 sm:p-5">
          <p className="text-xs sm:text-sm font-medium opacity-80">Vehículos atendidos</p>
          <p className="text-xl sm:text-2xl font-bold mt-1">{summary.total_entries}</p>
        </div>
        <div className="rounded-xl border bg-green-50 text-green-700 border-green-100 p-4 sm:p-5">
          <p className="text-xs sm:text-sm font-medium opacity-80">Ingresos totales</p>
          <p className="text-lg sm:text-2xl font-bold mt-1 break-words">{formatCurrency(summary.total_revenue)}</p>
        </div>
        <div className="rounded-xl border bg-amber-50 text-amber-700 border-amber-100 p-4 sm:p-5">
          <p className="text-xs sm:text-sm font-medium opacity-80">Ticket promedio</p>
          <p className="text-lg sm:text-2xl font-bold mt-1 break-words">{formatCurrency(summary.avg_amount)}</p>
        </div>
        <div className="rounded-xl border bg-purple-50 text-purple-700 border-purple-100 p-4 sm:p-5">
          <p className="text-xs sm:text-sm font-medium opacity-80">Estancia promedio</p>
          <p className="text-xl sm:text-2xl font-bold mt-1">{summary.avg_hours.toFixed(1)}h</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-slate-900 mb-4">
          Ingresos — {rangeLabel}
        </h2>
        <div className="w-full h-[220px] sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 10 }}
                interval={isSingleDay ? 2 : chartTicksDense ? 2 : 0}
                angle={chartTicksDense ? -35 : 0}
                textAnchor={chartTicksDense ? 'end' : 'middle'}
                height={chartTicksDense ? 50 : 30}
              />
              <YAxis tick={{ fontSize: 10 }} width={40} />
            <Tooltip
              formatter={(value, name) => [
                name === 'revenue' ? formatCurrency(Number(value)) : value,
                name === 'revenue' ? 'Ingresos' : 'Vehículos',
              ]}
            />
            <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} name="revenue" />
          </BarChart>
        </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Por método de pago</h3>
          {Object.keys(paymentBreakdown).length === 0 ? (
            <p className="text-slate-400 text-sm">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(paymentBreakdown).map(([method, amount]) => (
                <div key={method} className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">
                    {PAYMENT_LABELS[method as keyof typeof PAYMENT_LABELS]}
                  </span>
                  <span className="font-medium text-green-600">{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Por tipo de vehículo</h3>
          {Object.keys(vehicleBreakdown).length === 0 ? (
            <p className="text-slate-400 text-sm">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(vehicleBreakdown).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">
                    {VEHICLE_LABELS[type as keyof typeof VEHICLE_LABELS]}
                  </span>
                  <span className="font-medium">{count} vehículos</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <h3 className="font-semibold text-slate-900 mb-4 text-sm sm:text-base">
          Últimas transacciones — {rangeLabel}
        </h3>
        {filtered.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">No hay transacciones en este periodo</p>
        ) : (
          <>
            {/* Móvil: tarjetas */}
            <div className="md:hidden space-y-3">
              {filtered.slice(0, 20).map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-slate-200 p-4 bg-slate-50/50"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono font-bold text-slate-900">{entry.plate}</span>
                    <span className="font-semibold text-green-600 shrink-0">
                      {entry.amount != null ? formatCurrency(entry.amount) : '—'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mb-2">{VEHICLE_LABELS[entry.vehicle_type]}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400 block">Entrada</span>
                      {formatBoliviaDateShort(entry.entry_at)}
                    </div>
                    <div>
                      <span className="text-slate-400 block">Salida</span>
                      {entry.exit_at ? formatBoliviaDateShort(entry.exit_at) : '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Escritorio: tabla */}
            <div className="hidden md:block overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-3 font-medium">Placa</th>
                  <th className="pb-3 font-medium">Tipo</th>
                  <th className="pb-3 font-medium">Entrada</th>
                  <th className="pb-3 font-medium">Salida</th>
                  <th className="pb-3 font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 20).map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100">
                    <td className="py-2.5 font-mono font-bold">{entry.plate}</td>
                    <td className="py-2.5">{VEHICLE_LABELS[entry.vehicle_type]}</td>
                    <td className="py-2.5">{formatBoliviaDateShort(entry.entry_at)}</td>
                    <td className="py-2.5">
                      {entry.exit_at ? formatBoliviaDateShort(entry.exit_at) : '—'}
                    </td>
                    <td className="py-2.5 font-medium text-green-600">
                      {entry.amount != null ? formatCurrency(entry.amount) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
