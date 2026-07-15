'use client';

import { formatBoliviaDateShort } from '@/lib/datetime';
import { formatCurrency } from '@/lib/pricing';
import type { WorkerDeposit } from '@/types/database';
import type { WorkerWeekCollections } from '@/lib/worker-deposits';
import {
  Banknote,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  Loader2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface WeekResponse {
  collections: WorkerWeekCollections;
  deposit: WorkerDeposit | null;
  history: WorkerDeposit[];
  isCurrentWeek: boolean;
}

function parseMoneyInput(value: string): number {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return 0;
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function WorkerDepositDashboard() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [data, setData] = useState<WeekResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [depositedInput, setDepositedInput] = useState('');
  const [notes, setNotes] = useState('');

  const loadWeek = useCallback(async (offset: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/deposits/week?weekOffset=${offset}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error al cargar');
      setData(json);
      if (!json.deposit) {
        setDepositedInput(String(json.collections.expectedAmount));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeek(weekOffset);
  }, [weekOffset, loadWeek]);

  async function handleConfirm() {
    if (!data) return;
    setSubmitting(true);
    setError('');
    setSuccess('');

    const depositedAmount = parseMoneyInput(depositedInput);

    try {
      const res = await fetch('/api/deposits/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStart: data.collections.weekStart,
          depositedAmount,
          notes: notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'No se pudo confirmar');

      setSuccess('Depósito confirmado correctamente');
      setShowConfirm(false);
      window.dispatchEvent(new Event('deposit-pending-refresh'));
      await loadWeek(weekOffset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar');
    } finally {
      setSubmitting(false);
    }
  }

  const collections = data?.collections;
  const deposit = data?.deposit;
  const canGoNext = weekOffset < 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Banknote className="w-5 h-5 text-green-600" />
          Depósito semanal
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Efectivo cobrado en la semana (lunes a domingo) que debes depositar
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
          {success}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <button
            type="button"
            onClick={() => setWeekOffset((o) => o - 1)}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center min-w-0">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Semana</p>
            <p className="font-semibold text-slate-900 truncate">
              {loading ? '…' : collections?.label}
            </p>
            {data?.isCurrentWeek && (
              <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                Semana actual
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => canGoNext && setWeekOffset((o) => o + 1)}
            disabled={!canGoNext}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-30"
            aria-label="Semana siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : collections ? (
          <>
            <div className="text-center mb-6 p-4 rounded-xl bg-green-50 border border-green-100">
              <p className="text-sm text-green-700 mb-1">Monto a depositar</p>
              <p className="text-3xl sm:text-4xl font-bold text-green-700">
                {formatCurrency(collections.expectedAmount)}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-slate-600 mb-2">
                  <Car className="w-4 h-4" />
                  <span className="text-sm font-medium">Por horas</span>
                </div>
                <p className="text-xl font-bold text-slate-900">
                  {formatCurrency(collections.hourlyTotal)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {collections.hourlyCount} salida(s) cobrada(s)
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-slate-600 mb-2">
                  <CalendarDays className="w-4 h-4" />
                  <span className="text-sm font-medium">Mensual</span>
                </div>
                <p className="text-xl font-bold text-slate-900">
                  {formatCurrency(collections.monthlyTotal)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {collections.monthlyCount} cobro(s) registrado(s)
                </p>
              </div>
            </div>

            {deposit ? (
              <div className="rounded-xl border border-green-200 bg-green-50/50 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-semibold text-green-800">Depósito confirmado</p>
                    <p className="text-sm text-green-700 mt-1">
                      Depositaste {formatCurrency(Number(deposit.deposited_amount))} el{' '}
                      {formatBoliviaDateShort(deposit.confirmed_at)}
                    </p>
                    {Number(deposit.deposited_amount) !== Number(deposit.expected_amount) && (
                      <p className="text-xs text-amber-700 mt-1">
                        Esperado: {formatCurrency(Number(deposit.expected_amount))} · Diferencia:{' '}
                        {formatCurrency(
                          Number(deposit.deposited_amount) - Number(deposit.expected_amount)
                        )}
                      </p>
                    )}
                    {deposit.notes && (
                      <p className="text-xs text-slate-600 mt-2">Nota: {deposit.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {collections.expectedAmount === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-2">
                    No hay cobros registrados en esta semana.
                  </p>
                ) : null}

                {!showConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowConfirm(true)}
                    className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 touch-manipulation"
                  >
                    <Banknote className="w-4 h-4" />
                    Confirmar depósito
                  </button>
                ) : (
                  <div className="rounded-xl border border-slate-200 p-4 space-y-4">
                    <h3 className="font-semibold text-slate-900">Confirmar depósito</h3>
                    <p className="text-sm text-slate-500">
                      Indica el monto que depositaste. Por defecto es el total cobrado en la semana.
                    </p>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Monto depositado (Bs)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={depositedInput}
                        onChange={(e) => setDepositedInput(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500 text-lg font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Nota (opcional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        placeholder="Ej: depositado en caja principal el viernes"
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none"
                      />
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => setShowConfirm(false)}
                        className="w-full sm:w-auto px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={submitting}
                        className="w-full sm:flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg flex items-center justify-center gap-2"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Confirmar depósito
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>

      {data?.history && data.history.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-1">
            <History className="w-4 h-4 text-slate-500" />
            Historial de depósitos
          </h3>
          <p className="text-xs text-slate-500 mb-4">Últimos {data.history.length} depósitos</p>
          <div className="space-y-2">
            {data.history.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-slate-50 border border-slate-100"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {formatBoliviaDateShort(item.week_start)} – {formatBoliviaDateShort(item.week_end)}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    Confirmado {formatBoliviaDateShort(item.confirmed_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-700">
                    {formatCurrency(Number(item.deposited_amount))}
                  </p>
                  <p className="text-xs text-slate-500">
                    Esperado {formatCurrency(Number(item.expected_amount))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
