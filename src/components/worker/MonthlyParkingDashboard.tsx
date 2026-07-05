'use client';

/** Parqueo mensual: sin impresión de etiquetas. */

import { createClient } from '@/lib/supabase/client';
import {
  calculateSubscriptionPeriod,
  countPeriodMonths,
  formatDurationLabel,
  formatPeriodRange,
  isSubscriptionCurrent,
  normalizePlate,
  todayDateString,
  totalSubscriptionAmount,
} from '@/lib/monthly-parking';
import { formatCurrency } from '@/lib/pricing';
import type { MonthlyParking, VehicleType } from '@/types/database';
import { VEHICLE_LABELS } from '@/types/database';
import {
  Banknote,
  CalendarDays,
  Check,
  Loader2,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

const DURATION_OPTIONS = [1, 2, 3, 4, 5, 6, 12];

interface MonthlyParkingDashboardProps {
  userId: string;
  initialSubscriptions: MonthlyParking[];
}

function parseMoneyInput(value: string): number {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return 0;
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function getQuickCashAmounts(total: number): number[] {
  const options = new Set<number>();
  options.add(Math.round(total * 100) / 100);
  for (const bill of [20, 50, 100, 200, 500]) {
    if (bill >= total) options.add(bill);
  }
  return Array.from(options).sort((a, b) => a - b).slice(0, 5);
}

interface PayModalProps {
  subscription: MonthlyParking;
  onClose: () => void;
  onPaid: () => void;
}

function PayModal({ subscription, onClose, onPaid }: PayModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [received, setReceived] = useState('');
  const supabase = createClient();

  const amount = totalSubscriptionAmount(
    subscription.monthly_amount,
    subscription.period_start,
    subscription.period_end
  );
  const months = countPeriodMonths(subscription.period_start, subscription.period_end);
  const receivedAmount = parseMoneyInput(received);
  const change = receivedAmount - amount;
  const quickAmounts = useMemo(() => getQuickCashAmounts(amount), [amount]);

  async function handlePay() {
    setLoading(true);
    setError('');

    const { error: updateError } = await supabase
      .from('monthly_parking')
      .update({
        paid_at: new Date().toISOString(),
        payment_method: 'cash',
      })
      .eq('id', subscription.id);

    if (updateError) {
      setError('No se pudo registrar el pago');
      setLoading(false);
      return;
    }

    onPaid();
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full sm:max-w-md shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Cobro anticipado</h3>
        <p className="text-sm text-slate-500 mb-1 font-mono">{subscription.plate}</p>
        <p className="text-xs text-slate-400 mb-4">
          {formatPeriodRange(subscription.period_start, subscription.period_end)}
        </p>

        <div className="text-sm text-slate-600 mb-2">
          {formatCurrency(subscription.monthly_amount)}/mes × {formatDurationLabel(months)}
        </div>
        <div className="flex justify-between text-lg font-bold mb-4 pb-3 border-b">
          <span>Total</span>
          <span className="text-green-600">{formatCurrency(amount)}</span>
        </div>

        <div className="mb-4 space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Banknote className="w-4 h-4" />
            Efectivo recibido
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={received}
            onChange={(e) => setReceived(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-3 text-lg font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <div className="flex flex-wrap gap-2">
            {quickAmounts.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setReceived(String(value))}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50"
              >
                {formatCurrency(value)}
              </button>
            ))}
          </div>
          {receivedAmount > 0 && change >= 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
              <p className="text-sm text-amber-800">Cambio a entregar</p>
              <p className="text-2xl font-bold text-amber-900">{formatCurrency(change)}</p>
            </div>
          )}
          {receivedAmount > 0 && change < 0 && (
            <p className="text-sm text-red-600 text-center">
              Falta {formatCurrency(Math.abs(change))}
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={handlePay}
            disabled={loading}
            className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Confirmar cobro
          </button>
        </div>
      </div>
    </div>
  );
}

export function MonthlyParkingDashboard({
  userId,
  initialSubscriptions,
}: MonthlyParkingDashboardProps) {
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState(todayDateString());
  const [durationMonths, setDurationMonths] = useState(1);
  const [plate, setPlate] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [customerName, setCustomerName] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [received, setReceived] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [payTarget, setPayTarget] = useState<MonthlyParking | null>(null);
  const supabase = createClient();

  const periodPreview = useMemo(
    () => calculateSubscriptionPeriod(startDate, durationMonths),
    [startDate, durationMonths]
  );

  const previewTotal = useMemo(() => {
    const amount = parseMoneyInput(monthlyAmount);
    if (amount <= 0) return null;
    return totalSubscriptionAmount(
      amount,
      periodPreview.periodStart,
      periodPreview.periodEnd
    );
  }, [monthlyAmount, periodPreview]);

  const receivedAmount = parseMoneyInput(received);
  const registerChange =
    previewTotal !== null ? receivedAmount - previewTotal : 0;
  const registerQuickAmounts = useMemo(
    () => (previewTotal !== null ? getQuickCashAmounts(previewTotal) : []),
    [previewTotal]
  );

  const loadSubscriptions = useCallback(async () => {
    const today = todayDateString();
    const { data } = await supabase
      .from('monthly_parking')
      .select(
        'id, plate, vehicle_type, monthly_amount, period_start, period_end, status, customer_name, notes, worker_id, paid_at, payment_method, created_at'
      )
      .eq('status', 'active')
      .gte('period_end', today)
      .order('period_end', { ascending: true });

    if (data) setSubscriptions(data);
  }, [supabase]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q) return subscriptions;
    return subscriptions.filter(
      (s) =>
        s.plate.includes(q) ||
        s.customer_name?.toUpperCase().includes(q)
    );
  }, [subscriptions, search]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const normalizedPlate = normalizePlate(plate);
    const amount = parseMoneyInput(monthlyAmount);

    if (!normalizedPlate) {
      setError('Ingresa la placa');
      setLoading(false);
      return;
    }

    if (amount <= 0) {
      setError('Ingresa el precio mensual');
      setLoading(false);
      return;
    }

    const { periodStart, periodEnd } = calculateSubscriptionPeriod(startDate, durationMonths);
    const total = totalSubscriptionAmount(amount, periodStart, periodEnd);
    const paidAmount = parseMoneyInput(received);

    if (paidAmount < total) {
      setError(`Pago anticipado: falta ${formatCurrency(total - paidAmount)}`);
      setLoading(false);
      return;
    }

    const { data: existing } = await supabase
      .from('monthly_parking')
      .select('id')
      .eq('status', 'active')
      .ilike('plate', normalizedPlate)
      .maybeSingle();

    if (existing) {
      setError('Esta placa ya tiene un plan mensual activo');
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('monthly_parking').insert({
      plate: normalizedPlate,
      vehicle_type: vehicleType,
      monthly_amount: amount,
      period_start: periodStart,
      period_end: periodEnd,
      customer_name: customerName.trim() || null,
      notes: notes.trim() || null,
      worker_id: userId,
      paid_at: new Date().toISOString(),
      payment_method: 'cash',
    });

    if (insertError) {
      setError('No se pudo registrar. ¿Ejecutaste la migración SQL en Supabase?');
      setLoading(false);
      return;
    }

    const changeToGive = paidAmount - total;

    setPlate('');
    setCustomerName('');
    setMonthlyAmount('');
    setNotes('');
    setReceived('');
    setSuccess(
      `${normalizedPlate} registrado · Pago anticipado ${formatCurrency(total)}` +
        (changeToGive > 0 ? ` · Cambio ${formatCurrency(changeToGive)}` : '')
    );
    setLoading(false);
    loadSubscriptions();
  }

  async function handleCancel(id: string) {
    if (!confirm('¿Cancelar este plan mensual?')) return;

    const { error: updateError } = await supabase
      .from('monthly_parking')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (!updateError) loadSubscriptions();
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleRegister}
        className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6"
      >
        <h2 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-600" />
          Nuevo plan mensual
        </h2>
        <p className="text-sm text-blue-700 mb-4">
          Pago anticipado: se cobra al registrar, antes de iniciar la vigencia.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Placa *</label>
            <input
              type="text"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              required
              placeholder="ABC-1234"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Precio mensual (Bs) *
            </label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={monthlyAmount}
              onChange={(e) => setMonthlyAmount(e.target.value)}
              required
              placeholder="Ej. 350"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Inicio del plan *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Duración *
            </label>
            <select
              value={durationMonths}
              onChange={(e) => setDurationMonths(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DURATION_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {formatDurationLabel(n)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Vehículo</label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value as VehicleType)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(VEHICLE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Nombre (opcional)
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Cliente frecuente"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notas</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Casa 12, turno noche..."
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700">
          <span className="font-medium">Vigencia: </span>
          {formatPeriodRange(periodPreview.periodStart, periodPreview.periodEnd)}
          {previewTotal !== null && (
            <span className="block mt-1 text-green-700 font-semibold">
              Total anticipado: {formatCurrency(previewTotal)}
              {durationMonths > 1 && (
                <span className="font-normal text-slate-500">
                  {' '}
                  ({formatCurrency(parseMoneyInput(monthlyAmount))}/mes ×{' '}
                  {formatDurationLabel(durationMonths)})
                </span>
              )}
            </span>
          )}
        </div>

        {previewTotal !== null && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Banknote className="w-4 h-4 text-slate-500" />
              Efectivo recibido (anticipado) *
            </label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={received}
              onChange={(e) => setReceived(e.target.value)}
              required
              placeholder="0.00"
              className="w-full px-4 py-3 text-lg font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="flex flex-wrap gap-2">
              {registerQuickAmounts.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setReceived(String(value))}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50"
                >
                  {formatCurrency(value)}
                </button>
              ))}
            </div>
            {receivedAmount > 0 && registerChange >= 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                <p className="text-sm text-amber-800">Cambio a entregar</p>
                <p className="text-2xl font-bold text-amber-900">{formatCurrency(registerChange)}</p>
              </div>
            )}
            {receivedAmount > 0 && registerChange < 0 && (
              <p className="text-sm text-red-600 text-center">
                Falta {formatCurrency(Math.abs(registerChange))}
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || previewTotal === null}
          className="mt-4 w-full sm:w-auto px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
          Registrar y cobrar anticipado
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-600" />
            Planes activos ({filtered.length})
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar placa..."
              className="pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">
            No hay planes mensuales activos
          </p>
        ) : (
          <div className="space-y-3">
            {filtered.map((sub) => {
              const current = isSubscriptionCurrent(
                sub.period_start,
                sub.period_end,
                sub.status
              );
              const paid = Boolean(sub.paid_at);

              return (
                <div
                  key={sub.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-slate-300"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{sub.plate}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {VEHICLE_LABELS[sub.vehicle_type]}
                      </span>
                      {current && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          Vigente
                        </span>
                      )}
                      {paid ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Pagado anticipado
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          Cobro anticipado pendiente
                        </span>
                      )}
                    </div>
                    {sub.customer_name && (
                      <p className="text-sm text-slate-600 mt-0.5">{sub.customer_name}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatPeriodRange(sub.period_start, sub.period_end)}
                    </p>
                    {sub.notes && (
                      <p className="text-xs text-slate-400 mt-0.5">{sub.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 sm:shrink-0">
                    <div className="text-right">
                      <span className="text-lg font-bold text-green-600 block">
                        {formatCurrency(
                          totalSubscriptionAmount(
                            sub.monthly_amount,
                            sub.period_start,
                            sub.period_end
                          )
                        )}
                      </span>
                      {countPeriodMonths(sub.period_start, sub.period_end) > 1 && (
                        <span className="text-xs text-slate-500">
                          {formatCurrency(sub.monthly_amount)}/mes
                        </span>
                      )}
                    </div>
                    {!paid && (
                      <button
                        onClick={() => setPayTarget(sub)}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg"
                      >
                        Cobrar anticipado
                      </button>
                    )}
                    <button
                      onClick={() => handleCancel(sub.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Cancelar plan"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {payTarget && (
        <PayModal
          subscription={payTarget}
          onClose={() => setPayTarget(null)}
          onPaid={() => {
            setPayTarget(null);
            loadSubscriptions();
          }}
        />
      )}
    </div>
  );
}
