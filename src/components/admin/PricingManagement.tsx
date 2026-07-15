'use client';

import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatPricingSummary } from '@/lib/pricing';
import type { PricingConfig, VehicleType } from '@/types/database';
import {
  ACTIVE_VEHICLE_TYPES,
  MONTHLY_VEHICLE_LABELS,
  MONTHLY_VEHICLE_TYPES,
  VEHICLE_LABELS,
} from '@/types/database';
import { Bike, Car, Clock, Loader2, Save, Truck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const VEHICLE_ICONS: Record<VehicleType, typeof Car> = {
  car: Car,
  motorcycle: Bike,
  truck: Truck,
};

interface PricingRow extends PricingConfig {
  draftFirstHour: string;
  draftExtraHour: string;
  draftGrace: string;
  draftMonthly: string;
}

interface PricingManagementProps {
  initialPricing: PricingConfig[];
}

function toRow(config: PricingConfig): PricingRow {
  return {
    ...config,
    monthly_rate: Number(config.monthly_rate ?? 0),
    draftFirstHour: String(config.first_hour_rate),
    draftExtraHour: String(config.extra_hour_rate),
    draftGrace: String(config.grace_minutes),
    draftMonthly: String(config.monthly_rate ?? 0),
  };
}

export function PricingManagement({ initialPricing }: PricingManagementProps) {
  const [rows, setRows] = useState<PricingRow[]>(() => initialPricing.map(toRow));
  const [savingHourly, setSavingHourly] = useState<VehicleType | null>(null);
  const [savingMonthly, setSavingMonthly] = useState<VehicleType | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const supabase = createClient();

  const loadPricing = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('pricing_config')
      .select('*')
      .order('vehicle_type');

    if (fetchError) {
      setError('Error al cargar tarifas');
      return;
    }

    if (data) setRows(data.map(toRow));
  }, [supabase]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  function updateHourlyDraft(
    vehicleType: VehicleType,
    field: 'first' | 'extra' | 'grace',
    value: string
  ) {
    setRows((prev) =>
      prev.map((row) =>
        row.vehicle_type === vehicleType
          ? {
              ...row,
              ...(field === 'first'
                ? { draftFirstHour: value }
                : field === 'extra'
                  ? { draftExtraHour: value }
                  : { draftGrace: value }),
            }
          : row
      )
    );
  }

  function updateMonthlyDraft(vehicleType: VehicleType, value: string) {
    setRows((prev) =>
      prev.map((row) =>
        row.vehicle_type === vehicleType ? { ...row, draftMonthly: value } : row
      )
    );
  }

  async function handleSaveHourly(vehicleType: VehicleType) {
    const row = rows.find((r) => r.vehicle_type === vehicleType);
    if (!row) return;

    const firstHour = parseFloat(row.draftFirstHour);
    const extraHour = parseFloat(row.draftExtraHour);
    const grace = parseInt(row.draftGrace, 10);

    if (isNaN(firstHour) || firstHour < 0) {
      setError('La tarifa de la 1ra hora debe ser 0 o mayor');
      return;
    }
    if (isNaN(extraHour) || extraHour < 0) {
      setError('La tarifa por hora extra debe ser 0 o mayor');
      return;
    }
    if (isNaN(grace) || grace < 0) {
      setError('Los minutos de gracia no pueden ser negativos');
      return;
    }

    setSavingHourly(vehicleType);
    setError('');
    setSuccess('');

    const { error: updateError } = await supabase
      .from('pricing_config')
      .update({
        first_hour_rate: firstHour,
        extra_hour_rate: extraHour,
        grace_minutes: grace,
        updated_at: new Date().toISOString(),
      })
      .eq('vehicle_type', vehicleType);

    setSavingHourly(null);

    if (updateError) {
      setError('Error al guardar la tarifa por horas');
      return;
    }

    setSuccess(`Tarifa por horas de ${VEHICLE_LABELS[vehicleType]} actualizada`);
    await loadPricing();
  }

  async function handleSaveMonthly(vehicleType: VehicleType) {
    const row = rows.find((r) => r.vehicle_type === vehicleType);
    if (!row) return;

    const monthly = parseFloat(row.draftMonthly);
    if (isNaN(monthly) || monthly < 0) {
      setError('El precio mensual debe ser 0 o mayor');
      return;
    }

    setSavingMonthly(vehicleType);
    setError('');
    setSuccess('');

    const { error: updateError } = await supabase
      .from('pricing_config')
      .update({
        monthly_rate: monthly,
        updated_at: new Date().toISOString(),
      })
      .eq('vehicle_type', vehicleType);

    setSavingMonthly(null);

    if (updateError) {
      setError(
        'Error al guardar tarifa mensual. ¿Ejecutaste migrate-monthly-pricing.sql en Supabase?'
      );
      return;
    }

    setSuccess(`Tarifa mensual de ${MONTHLY_VEHICLE_LABELS[vehicleType]} actualizada`);
    await loadPricing();
  }

  return (
    <div className="space-y-8">
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

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Tarifas por horas</h2>
          <p className="text-sm text-slate-500 mt-1">
            Automóvil y motocicleta. La 1ra hora se cobra completa; la gracia solo aplica después.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {ACTIVE_VEHICLE_TYPES.map((type) => {
            const row = rows.find((r) => r.vehicle_type === type);
            if (!row) return null;

            const Icon = VEHICLE_ICONS[type];
            const isSaving = savingHourly === type;

            return (
              <div
                key={`hourly-${type}`}
                className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 flex flex-col"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{VEHICLE_LABELS[type]}</h3>
                    <p className="text-xs text-slate-500">{formatPricingSummary(row)}</p>
                  </div>
                </div>

                <div className="space-y-4 flex-1">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      1ra hora (Bs.)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.draftFirstHour}
                      onChange={(e) => updateHourlyDraft(type, 'first', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Hora extra (Bs.)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.draftExtraHour}
                      onChange={(e) => updateHourlyDraft(type, 'extra', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Minutos de gracia
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={row.draftGrace}
                        onChange={(e) => updateHourlyDraft(type, 'grace', e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleSaveHourly(type)}
                  disabled={isSaving}
                  className="mt-5 w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Tarifas mensuales</h2>
          <p className="text-sm text-slate-500 mt-1">
            Precio por mes que el operador cobrará al registrar un plan mensual.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {MONTHLY_VEHICLE_TYPES.map((type) => {
            const row = rows.find((r) => r.vehicle_type === type);
            if (!row) return null;

            const Icon = VEHICLE_ICONS[type];
            const isSaving = savingMonthly === type;

            return (
              <div
                key={`monthly-${type}`}
                className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 flex flex-col"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {MONTHLY_VEHICLE_LABELS[type]}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Actual: {formatCurrency(Number(row.monthly_rate ?? 0))}/mes
                    </p>
                  </div>
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Precio mensual (Bs.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.draftMonthly}
                    onChange={(e) => updateMonthlyDraft(type, e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <button
                  onClick={() => handleSaveMonthly(type)}
                  disabled={isSaving}
                  className="mt-5 w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
