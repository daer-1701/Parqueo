'use client';

import {
  formatBoliviaDateInput,
  formatBoliviaDateShort,
  todayInBolivia,
  type ReportFilter,
  type ReportPeriod,
} from '@/lib/datetime';
import { formatCurrency } from '@/lib/pricing';
import {
  Banknote,
  CalendarRange,
  Loader2,
  TrendingUp,
  Users,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';

const AdminRevenueChart = dynamic(
  () => import('./AdminRevenueChart').then((m) => m.AdminRevenueChart),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[220px] sm:h-[280px] bg-slate-100 animate-pulse rounded-lg" />
    ),
  }
);

interface DepositReportRow {
  id: string;
  worker_id: string;
  worker_name: string;
  week_start: string;
  week_end: string;
  week_label: string;
  expected_amount: number;
  deposited_amount: number;
  difference: number;
  hourly_count: number;
  monthly_count: number;
  notes: string | null;
  confirmed_at: string;
}

interface WorkerBreakdown {
  worker_id: string;
  worker_name: string;
  deposits_count: number;
  expected_amount: number;
  deposited_amount: number;
  difference: number;
}

interface ChartPoint {
  period: string;
  revenue: number;
  entries: number;
}

interface ReportResponse {
  summary: {
    total_expected: number;
    total_deposited: number;
    difference: number;
    deposits_count: number;
    workers_count: number;
    range_start: string;
    range_end: string;
  };
  chartData: ChartPoint[];
  byWorker: WorkerBreakdown[];
  deposits: DepositReportRow[];
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

export function AdminDepositsReport() {
  const today = todayInBolivia();
  const [filter, setFilter] = useState<ReportFilter>('month');
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const rangeInvalid =
    filter === 'custom' && Boolean(customStart && customEnd && customStart > customEnd);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set('period', filter);
    if (filter === 'custom') {
      params.set('start', customStart);
      params.set('end', customEnd);
    }
    return params.toString();
  }, [filter, customStart, customEnd]);

  const loadReport = useCallback(async () => {
    if (rangeInvalid) {
      setData(null);
      setError('La fecha inicial no puede ser posterior a la final');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/deposits/report?${query}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error al cargar reporte');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar reporte');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [query, rangeInvalid]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const rangeLabel = getRangeLabel(filter, customStart, customEnd);
  const chartData = data?.chartData ?? [];
  const chartTicksDense = chartData.length > 6;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Reporte de depósitos
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Totales depositados por operadores en el periodo seleccionado
        </p>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(PERIOD_LABELS) as ReportPeriod[]).map((p) => (
            <button
              key={p}
              type="button"
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
          <div className="flex items-center gap-2 mb-3 text-sm font-medium text-slate-700">
            <CalendarRange className="w-4 h-4" />
            Rango personalizado
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs text-slate-500">
              Desde
              <input
                type="date"
                value={customStart}
                max={today}
                onChange={(e) => {
                  setCustomStart(e.target.value);
                  setFilter('custom');
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="text-xs text-slate-500">
              Hasta
              <input
                type="date"
                value={customEnd}
                max={today}
                onChange={(e) => {
                  setCustomEnd(e.target.value);
                  setFilter('custom');
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </label>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl bg-green-50 border border-green-100 p-4">
              <p className="text-xs text-green-700 mb-1">Total depositado</p>
              <p className="text-xl font-bold text-green-700">
                {formatCurrency(data.summary.total_deposited)}
              </p>
              <p className="text-xs text-green-600/80 mt-1">{rangeLabel}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs text-slate-500 mb-1">Total esperado</p>
              <p className="text-xl font-bold text-slate-900">
                {formatCurrency(data.summary.total_expected)}
              </p>
            </div>
            <div
              className={`rounded-xl border p-4 ${
                data.summary.difference === 0
                  ? 'bg-blue-50 border-blue-100'
                  : data.summary.difference > 0
                    ? 'bg-emerald-50 border-emerald-100'
                    : 'bg-amber-50 border-amber-100'
              }`}
            >
              <p className="text-xs text-slate-600 mb-1">Diferencia</p>
              <p
                className={`text-xl font-bold ${
                  data.summary.difference === 0
                    ? 'text-blue-700'
                    : data.summary.difference > 0
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                }`}
              >
                {formatCurrency(data.summary.difference)}
              </p>
            </div>
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
              <p className="text-xs text-blue-700 mb-1">Depósitos</p>
              <p className="text-xl font-bold text-blue-700">
                {data.summary.deposits_count}
              </p>
              <p className="text-xs text-blue-600/80 mt-1 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {data.summary.workers_count} operadores
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
            <h3 className="font-semibold text-slate-900 mb-1">
              Depositado por semana
            </h3>
            <p className="text-xs text-slate-500 mb-4">{rangeLabel}</p>
            {chartData.length === 0 ? (
              <p className="text-center py-10 text-slate-400 text-sm">
                No hay depósitos confirmados en este periodo
              </p>
            ) : (
              <AdminRevenueChart
                data={chartData}
                isSingleDay={false}
                chartTicksDense={chartTicksDense}
              />
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-slate-500" />
              Por operador
            </h3>
            {data.byWorker.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-sm">Sin datos</p>
            ) : (
              <>
                <div className="md:hidden space-y-3">
                  {data.byWorker.map((w) => (
                    <div
                      key={w.worker_id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-medium text-slate-900">{w.worker_name}</p>
                          <p className="text-xs text-slate-500">
                            {w.deposits_count} depósito
                            {w.deposits_count === 1 ? '' : 's'}
                          </p>
                        </div>
                        <p className="font-bold text-green-700">
                          {formatCurrency(w.deposited_amount)}
                        </p>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                        <span>Esperado: {formatCurrency(w.expected_amount)}</span>
                        <span
                          className={
                            w.difference !== 0 ? 'text-amber-600 font-medium' : ''
                          }
                        >
                          Dif.: {formatCurrency(w.difference)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="pb-3 font-medium">Operador</th>
                        <th className="pb-3 font-medium">Depósitos</th>
                        <th className="pb-3 font-medium">Esperado</th>
                        <th className="pb-3 font-medium">Depositado</th>
                        <th className="pb-3 font-medium">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byWorker.map((w) => (
                        <tr key={w.worker_id} className="border-b border-slate-100">
                          <td className="py-3 font-medium">{w.worker_name}</td>
                          <td className="py-3">{w.deposits_count}</td>
                          <td className="py-3">{formatCurrency(w.expected_amount)}</td>
                          <td className="py-3 font-semibold text-green-700">
                            {formatCurrency(w.deposited_amount)}
                          </td>
                          <td
                            className={`py-3 ${
                              w.difference !== 0
                                ? 'text-amber-600 font-medium'
                                : 'text-slate-500'
                            }`}
                          >
                            {formatCurrency(w.difference)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <Banknote className="w-4 h-4 text-green-600" />
              Detalle de depósitos
            </h3>
            {data.deposits.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-sm">
                No hay depósitos en este periodo
              </p>
            ) : (
              <>
                <div className="md:hidden space-y-3">
                  {data.deposits.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <p className="font-medium text-slate-900">{d.worker_name}</p>
                        <p className="font-bold text-green-700">
                          {formatCurrency(d.deposited_amount)}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">{d.week_label}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Confirmado: {formatBoliviaDateShort(d.confirmed_at)}
                      </p>
                      {d.notes && (
                        <p className="text-xs text-slate-600 mt-2 italic">{d.notes}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="pb-3 font-medium">Operador</th>
                        <th className="pb-3 font-medium">Semana</th>
                        <th className="pb-3 font-medium">Esperado</th>
                        <th className="pb-3 font-medium">Depositado</th>
                        <th className="pb-3 font-medium">Diferencia</th>
                        <th className="pb-3 font-medium">Confirmado</th>
                        <th className="pb-3 font-medium">Nota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.deposits.map((d) => (
                        <tr key={d.id} className="border-b border-slate-100">
                          <td className="py-3 font-medium">{d.worker_name}</td>
                          <td className="py-3 text-slate-600">{d.week_label}</td>
                          <td className="py-3">{formatCurrency(d.expected_amount)}</td>
                          <td className="py-3 font-semibold text-green-700">
                            {formatCurrency(d.deposited_amount)}
                          </td>
                          <td
                            className={`py-3 ${
                              d.difference !== 0
                                ? 'text-amber-600 font-medium'
                                : 'text-slate-500'
                            }`}
                          >
                            {formatCurrency(d.difference)}
                          </td>
                          <td className="py-3 text-slate-500">
                            {formatBoliviaDateShort(d.confirmed_at)}
                          </td>
                          <td className="py-3 text-slate-500 max-w-[160px] truncate">
                            {d.notes ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
