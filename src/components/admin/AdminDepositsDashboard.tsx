'use client';

import { formatBoliviaDateShort } from '@/lib/datetime';
import { formatCurrency } from '@/lib/pricing';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  Loader2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface DepositRow {
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

interface PendingRow {
  worker_id: string;
  worker_name: string;
  week_start: string;
  week_end: string;
  week_label: string;
  expected_amount: number;
  hourly_count: number;
  monthly_count: number;
}

interface AdminDepositsResponse {
  weekDeposits: DepositRow[];
  recentHistory: DepositRow[];
  pending: PendingRow[];
  weekSummary: {
    week_start: string;
    week_end: string;
    week_label: string;
    total_expected: number;
    total_deposited: number;
    confirmed_count: number;
    pending_count: number;
  };
}

export function AdminDepositsDashboard() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [data, setData] = useState<AdminDepositsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async (offset: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/deposits?weekOffset=${offset}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error al cargar');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(weekOffset);
  }, [weekOffset, loadData]);

  const canGoNext = weekOffset < 0;
  const weekDeposits = data?.weekDeposits ?? [];
  const recentHistory = data?.recentHistory ?? [];
  const pendingWithAmount = data?.pending.filter((p) => p.expected_amount > 0) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Banknote className="w-5 h-5 text-green-600" />
          Depósitos de operadores
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Control semanal de efectivo depositado por cada operador
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <button
            type="button"
            onClick={() => setWeekOffset((o) => o - 1)}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase">Semana</p>
            <p className="font-semibold text-slate-900">
              {loading ? '…' : data?.weekSummary.week_label}
            </p>
          </div>
          <button
            type="button"
            onClick={() => canGoNext && setWeekOffset((o) => o + 1)}
            disabled={!canGoNext}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : data ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
              <p className="text-xs text-slate-500">Esperado</p>
              <p className="text-lg font-bold text-slate-900">
                {formatCurrency(data.weekSummary.total_expected)}
              </p>
            </div>
            <div className="rounded-lg bg-green-50 border border-green-100 p-3 text-center">
              <p className="text-xs text-green-700">Depositado</p>
              <p className="text-lg font-bold text-green-700">
                {formatCurrency(data.weekSummary.total_deposited)}
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-center">
              <p className="text-xs text-blue-700">Confirmados</p>
              <p className="text-lg font-bold text-blue-700">
                {data.weekSummary.confirmed_count}
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-center">
              <p className="text-xs text-amber-700">Pendientes</p>
              <p className="text-lg font-bold text-amber-700">
                {data.weekSummary.pending_count}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {pendingWithAmount.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 p-4 sm:p-6">
          <h3 className="font-semibold text-amber-800 flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4" />
            Sin confirmar esta semana
          </h3>
          <div className="space-y-2">
            {pendingWithAmount.map((item) => (
              <div
                key={item.worker_id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-amber-50/50 border border-amber-100"
              >
                <div>
                  <p className="font-medium text-slate-900">{item.worker_name}</p>
                  <p className="text-xs text-slate-500">
                    {item.hourly_count} por horas · {item.monthly_count} mensual
                  </p>
                </div>
                <p className="font-bold text-amber-700">
                  {formatCurrency(item.expected_amount)} pendiente
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          Depósitos confirmados — {data?.weekSummary.week_label ?? ''}
        </h3>

        {loading ? (
          <div className="flex justify-center py-8 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : weekDeposits.length === 0 ? (
          <p className="text-center py-8 text-slate-400 text-sm">
            No hay depósitos confirmados en esta semana
          </p>
        ) : (
          <>
            <div className="md:hidden space-y-3">
              {weekDeposits.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium text-slate-900">{item.worker_name}</p>
                    <p className="font-bold text-green-700">
                      {formatCurrency(Number(item.deposited_amount))}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatBoliviaDateShort(item.confirmed_at)}
                  </p>
                  <div className="mt-2 text-xs text-slate-500 grid grid-cols-2 gap-2">
                    <span>Esperado: {formatCurrency(Number(item.expected_amount))}</span>
                    <span>
                      Dif.: {formatCurrency(item.difference)}
                    </span>
                  </div>
                  {item.notes && (
                    <p className="text-xs text-slate-600 mt-2 italic">{item.notes}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="pb-3 font-medium">Operador</th>
                    <th className="pb-3 font-medium">Esperado</th>
                    <th className="pb-3 font-medium">Depositado</th>
                    <th className="pb-3 font-medium">Diferencia</th>
                    <th className="pb-3 font-medium">Confirmado</th>
                    <th className="pb-3 font-medium">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {weekDeposits.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-3 font-medium">{item.worker_name}</td>
                      <td className="py-3">{formatCurrency(Number(item.expected_amount))}</td>
                      <td className="py-3 font-semibold text-green-700">
                        {formatCurrency(Number(item.deposited_amount))}
                      </td>
                      <td
                        className={`py-3 ${
                          item.difference !== 0 ? 'text-amber-600 font-medium' : 'text-slate-500'
                        }`}
                      >
                        {formatCurrency(item.difference)}
                      </td>
                      <td className="py-3 text-slate-500">
                        {formatBoliviaDateShort(item.confirmed_at)}
                      </td>
                      <td className="py-3 text-slate-500 max-w-[160px] truncate">
                        {item.notes ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {recentHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-1">
            <History className="w-4 h-4 text-slate-500" />
            Historial reciente (todas las semanas)
          </h3>
          <p className="text-xs text-slate-500 mb-4">Últimos {recentHistory.length} depósitos</p>
          <div className="space-y-2">
            {recentHistory.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-slate-50 text-sm"
              >
                <div>
                  <span className="font-medium text-slate-900">{item.worker_name}</span>
                  <span className="text-slate-400 mx-2">·</span>
                  <span className="text-slate-500">{item.week_label}</span>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <span className="font-semibold text-green-700">
                    {formatCurrency(Number(item.deposited_amount))}
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatBoliviaDateShort(item.confirmed_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
