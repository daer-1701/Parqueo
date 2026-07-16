'use client';

import { createClient } from '@/lib/supabase/client';
import {
  calculateParkingAmount,
  formatCurrency,
  formatDuration,
  formatPricingSummary,
  getPricingForVehicle,
} from '@/lib/pricing';
import { APP_TIMEZONE, formatBoliviaTime } from '@/lib/datetime';
import { hasActiveMonthlyPlate } from '@/lib/monthly-parking';
import { formatInTimeZone } from 'date-fns-tz';
import { useNow } from '@/hooks/useNow';
import type {
  ParkingEntry,
  PricingConfig,
  VehicleType,
} from '@/types/database';
import { ACTIVE_VEHICLE_LABELS, ACTIVE_VEHICLE_TYPES, VEHICLE_LABELS } from '@/types/database';
import { Car, Clock, Loader2, Plus, Printer, Search, Banknote } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function parseMoneyInput(value: string): number {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return 0;
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function getQuickCashAmounts(total: number): number[] {
  const options = new Set<number>();
  options.add(Math.round(total * 100) / 100);
  for (const bill of [5, 10, 20, 50, 100, 200]) {
    if (bill >= total) options.add(bill);
  }
  return Array.from(options).sort((a, b) => a - b).slice(0, 6);
}

interface EntryFormProps {
  pricing: PricingConfig[];
  userId: string;
  onSuccess: () => void;
}

function EntryForm({ pricing, userId, onSuccess }: EntryFormProps) {
  const [plate, setPlate] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [printWarning, setPrintWarning] = useState('');
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setPrintWarning('');

    const normalizedPlate = plate.trim().toUpperCase();

    const { data: existing } = await supabase
      .from('parking_entries')
      .select('id')
      .eq('plate', normalizedPlate)
      .eq('status', 'active')
      .maybeSingle();

    if (existing) {
      setError('Este vehículo ya tiene una entrada activa');
      setLoading(false);
      return;
    }

    const { data: entry, error: insertError } = await supabase
      .from('parking_entries')
      .insert({
        plate: normalizedPlate,
        vehicle_type: vehicleType,
        notes: notes || null,
        worker_entry_id: userId,
      })
      .select('plate, entry_at, vehicle_type')
      .single();

    if (insertError || !entry) {
      setError('Error al registrar la entrada');
      setLoading(false);
      return;
    }

    const isMonthly = await hasActiveMonthlyPlate(supabase, normalizedPlate);

    if (!isMonthly) {
      const { printEntryLabel } = await import('@/lib/print-entry-label');
      const printResult = await printEntryLabel({
        plate: entry.plate,
        entryAt: entry.entry_at,
        vehicleType: entry.vehicle_type,
      });

      if (printResult === 'direct') {
        setPrintWarning('');
      } else if (printResult === 'dialog') {
        setPrintWarning('Impresión manual por Chrome (respaldo).');
      } else {
        setPrintWarning(
          'Entrada registrada. No se pudo imprimir: en el PC de la impresora ejecuta scripts\\start-print-server.bat y déjalo abierto.'
        );
      }
    }

    setPlate('');
    setNotes('');
    setLoading(false);
    onSuccess();
  }

  const selectedPricing = getPricingForVehicle(vehicleType, pricing);

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Plus className="w-5 h-5 text-blue-600" />
        Registrar entrada
      </h2>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {printWarning && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          {printWarning}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Placa *
          </label>
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
            Tipo de vehículo
          </label>
          <select
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value as VehicleType)}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ACTIVE_VEHICLE_TYPES.map((key) => {
              const label = ACTIVE_VEHICLE_LABELS[key];
              const config = pricing.find((p) => p.vehicle_type === key);
              const summary = config
                ? formatPricingSummary(config)
                : formatPricingSummary({
                    id: '',
                    vehicle_type: key as VehicleType,
                    first_hour_rate: selectedPricing.first_hour_rate,
                    extra_hour_rate: selectedPricing.extra_hour_rate,
                    grace_minutes: selectedPricing.grace_minutes,
                    updated_at: '',
                  });
              return (
              <option key={key} value={key}>
                {label} — {summary}
              </option>
            );})}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Notas (opcional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Color, marca, observaciones..."
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !plate.trim()}
        className="mt-4 w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Car className="w-4 h-4" />}
        Registrar entrada
      </button>
    </form>
  );
}

interface CheckoutModalProps {
  entry: ParkingEntry;
  pricing: PricingConfig[];
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function CheckoutModal({ entry, pricing, userId, onClose, onSuccess }: CheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [received, setReceived] = useState('');
  const [isMonthly, setIsMonthly] = useState(false);
  const receivedRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const now = useNow(15_000);

  const hourlyAmount = calculateParkingAmount(
    entry.vehicle_type,
    new Date(entry.entry_at),
    now,
    pricing
  );
  const amount = isMonthly ? 0 : hourlyAmount;

  const receivedAmount = parseMoneyInput(received);
  const change = receivedAmount - amount;
  const quickAmounts = useMemo(() => getQuickCashAmounts(amount), [amount]);

  useEffect(() => {
    setReceived('');
    setError('');
    setIsMonthly(false);

    async function checkMonthly() {
      const today = formatInTimeZone(new Date(), APP_TIMEZONE, 'yyyy-MM-dd');
      const { data } = await supabase
        .from('monthly_parking')
        .select('id')
        .eq('status', 'active')
        .ilike('plate', entry.plate)
        .lte('period_start', today)
        .gte('period_end', today)
        .maybeSingle();
      setIsMonthly(Boolean(data));
    }

    void checkMonthly();
  }, [entry.id, entry.plate, supabase]);

  useEffect(() => {
    if (isMonthly) return;
    const timer = window.setTimeout(() => receivedRef.current?.focus(), 150);
    return () => window.clearTimeout(timer);
  }, [entry.id, isMonthly]);

  async function handleCheckout() {
    setLoading(true);
    setError('');

    const { error: updateError } = await supabase
      .from('parking_entries')
      .update({
        status: 'completed',
        exit_at: now.toISOString(),
        amount,
        worker_exit_id: userId,
      })
      .eq('id', entry.id);

    if (updateError) {
      setError('Error al procesar la salida');
      setLoading(false);
      return;
    }

    onSuccess();
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full sm:max-w-md shadow-xl max-h-[92dvh] overflow-y-auto pb-safe">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Procesar salida</h3>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Placa</span>
            <span className="font-mono font-bold">{entry.plate}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Vehículo</span>
            <span>{VEHICLE_LABELS[entry.vehicle_type]}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Tiempo</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDuration(entry.entry_at, now)}
            </span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-3">
            <span>{isMonthly ? 'Cobro por horas' : 'Total a cobrar'}</span>
            <span className={isMonthly ? 'text-blue-600' : 'text-green-600'}>
              {isMonthly ? 'Plan mensual' : formatCurrency(amount)}
            </span>
          </div>
          {isMonthly && (
            <p className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg p-3">
              Esta placa tiene plan mensual vigente. No se cobra por horas.
            </p>
          )}
        </div>

        {!isMonthly && (
        <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Banknote className="w-4 h-4 text-slate-500" />
            Efectivo recibido
          </label>
          <input
            ref={receivedRef}
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
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors touch-manipulation"
              >
                {formatCurrency(value)}
              </button>
            ))}
          </div>
          {receivedAmount > 0 && change >= 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
              <p className="text-sm font-medium text-amber-800">Cambio a entregar</p>
              <p className="text-3xl font-bold text-amber-900 mt-1">
                {formatCurrency(change)}
              </p>
            </div>
          )}
          {receivedAmount > 0 && change < 0 && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-center text-sm font-medium text-red-700">
              Falta {formatCurrency(Math.abs(change))}
            </div>
          )}
        </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 sm:py-2.5 px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors touch-manipulation"
          >
            Cancelar
          </button>
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="flex-1 py-3 sm:py-2.5 px-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 touch-manipulation"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isMonthly ? 'Registrar salida' : `Cobrar ${formatCurrency(amount)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ActiveEntriesListProps {
  entries: ParkingEntry[];
  search: string;
  pricing: PricingConfig[];
  printWarning: string;
  onReprint: (entry: ParkingEntry) => void;
  onCheckout: (entry: ParkingEntry) => void;
}

function ActiveEntriesList({
  entries,
  search,
  pricing,
  printWarning,
  onReprint,
  onCheckout,
}: ActiveEntriesListProps) {
  const now = useNow(30_000);

  const filtered = useMemo(
    () => entries.filter((e) => e.plate.toLowerCase().includes(search.toLowerCase())),
    [entries, search]
  );

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No hay vehículos activos</p>
      </div>
    );
  }

  return (
    <>
      {printWarning && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          {printWarning}
        </div>
      )}

      <div className="md:hidden space-y-3">
        {filtered.map((entry) => {
          const estAmount = calculateParkingAmount(
            entry.vehicle_type,
            new Date(entry.entry_at),
            now,
            pricing
          );
          return (
            <div
              key={entry.id}
              className="rounded-xl border border-slate-200 p-4 bg-slate-50/50"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-mono text-lg font-bold text-slate-900">{entry.plate}</p>
                  <p className="text-sm text-slate-500">{VEHICLE_LABELS[entry.vehicle_type]}</p>
                </div>
                <p className="text-lg font-bold text-green-600 shrink-0">
                  {formatCurrency(estAmount)}
                </p>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-600 mb-3">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDuration(entry.entry_at, now)}
                </span>
                <span>Entrada {formatBoliviaTime(entry.entry_at)}</span>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onReprint(entry)}
                  className="w-full py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors touch-manipulation flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Reimprimir etiqueta
                </button>
                <button
                  type="button"
                  onClick={() => onCheckout(entry)}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors touch-manipulation"
                >
                  Cobrar salida
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden md:block overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="pb-3 font-medium">Placa</th>
              <th className="pb-3 font-medium">Tipo</th>
              <th className="pb-3 font-medium">Entrada</th>
              <th className="pb-3 font-medium">Tiempo</th>
              <th className="pb-3 font-medium">Est. cobro</th>
              <th className="pb-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => {
              const estAmount = calculateParkingAmount(
                entry.vehicle_type,
                new Date(entry.entry_at),
                now,
                pricing
              );
              return (
                <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 font-mono font-bold">{entry.plate}</td>
                  <td className="py-3">{VEHICLE_LABELS[entry.vehicle_type]}</td>
                  <td className="py-3">{formatBoliviaTime(entry.entry_at)}</td>
                  <td className="py-3">{formatDuration(entry.entry_at, now)}</td>
                  <td className="py-3 font-medium text-green-600">
                    {formatCurrency(estAmount)}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onReprint(entry)}
                        title="Reimprimir etiqueta"
                        className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Etiqueta
                      </button>
                      <button
                        type="button"
                        onClick={() => onCheckout(entry)}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        Cobrar salida
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

interface WorkerDashboardProps {
  userId: string;
  initialEntries: ParkingEntry[];
  pricing: PricingConfig[];
}

export function WorkerDashboard({
  userId,
  initialEntries,
  pricing,
}: WorkerDashboardProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [search, setSearch] = useState('');
  const [checkoutEntry, setCheckoutEntry] = useState<ParkingEntry | null>(null);
  const [printWarning, setPrintWarning] = useState('');
  const supabase = createClient();

  async function handleReprintLabel(entry: ParkingEntry) {
    setPrintWarning('');
    const { printEntryLabel } = await import('@/lib/print-entry-label');
    const printResult = await printEntryLabel({
      plate: entry.plate,
      entryAt: entry.entry_at,
      vehicleType: entry.vehicle_type,
    });
    if (printResult === 'failed') {
      setPrintWarning(
        'No se pudo imprimir: en el PC de la impresora ejecuta scripts\\start-print-server.bat y déjalo abierto.'
      );
    } else {
      setPrintWarning('');
    }
  }

  const loadEntries = useCallback(async () => {
    const { data } = await supabase
      .from('parking_entries')
      .select(
        'id, plate, vehicle_type, entry_at, exit_at, amount, status, payment_method, notes, worker_entry_id, worker_exit_id, created_at'
      )
      .eq('status', 'active')
      .order('entry_at', { ascending: false });

    if (data) setEntries(data);
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel('parking-active')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parking_entries',
          filter: 'status=eq.active',
        },
        () => loadEntries()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, loadEntries]);

  return (
    <div className="space-y-6">
      <EntryForm pricing={pricing} userId={userId} onSuccess={loadEntries} />

      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900">
            Vehículos activos ({entries.length})
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar placa..."
              className="pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-base sm:text-sm"
            />
          </div>
        </div>

        <ActiveEntriesList
          entries={entries}
          search={search}
          pricing={pricing}
          printWarning={printWarning}
          onReprint={handleReprintLabel}
          onCheckout={setCheckoutEntry}
        />
      </div>

      {checkoutEntry && (
        <CheckoutModal
          entry={checkoutEntry}
          pricing={pricing}
          userId={userId}
          onClose={() => setCheckoutEntry(null)}
          onSuccess={() => {
            setCheckoutEntry(null);
            loadEntries();
          }}
        />
      )}
    </div>
  );
}
