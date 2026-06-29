'use client';

import { createClient } from '@/lib/supabase/client';
import { formatPricingSummary } from '@/lib/pricing';
import type { PricingConfig, VehicleType } from '@/types/database';
import { VEHICLE_LABELS } from '@/types/database';
import { Car, Clock, Loader2, Save, Truck, Bike } from 'lucide-react';
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
}

interface PricingManagementProps {
  initialPricing: PricingConfig[];
}

function toRow(config: PricingConfig): PricingRow {
  return {
    ...config,
    draftFirstHour: String(config.first_hour_rate),
    draftExtraHour: String(config.extra_hour_rate),
    draftGrace: String(config.grace_minutes),
  };
}

export function PricingManagement({ initialPricing }: PricingManagementProps) {
  const [rows, setRows] = useState<PricingRow[]>(() => initialPricing.map(toRow));
  const [saving, setSaving] = useState<VehicleType | null>(null);
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

  function updateDraft(
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

  async function handleSave(vehicleType: VehicleType) {
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

    setSaving(vehicleType);
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

    setSaving(null);

    if (updateError) {
      setError('Error al guardar la tarifa');
      return;
    }

    setSuccess(`Tarifa de ${VEHICLE_LABELS[vehicleType]} actualizada`);
    await loadPricing();
  }

  const orderedTypes: VehicleType[] = ['car', 'motorcycle', 'truck'];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Tarifas del parqueo</h2>
        <p className="text-sm text-slate-500 mt-1">
          1ra hora siempre se cobra completa. La gracia solo aplica en horas adicionales.
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {orderedTypes.map((type) => {
          const row = rows.find((r) => r.vehicle_type === type);
          if (!row) return null;

          const Icon = VEHICLE_ICONS[type];
          const isSaving = saving === type;

          return (
            <div
              key={type}
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
                    onChange={(e) => updateDraft(type, 'first', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm"
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
                    onChange={(e) => updateDraft(type, 'extra', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Precio por cada hora después de la primera
                  </p>
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
                      onChange={(e) => updateDraft(type, 'grace', e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Solo después de la 1ra hora, no durante la primera
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleSave(type)}
                disabled={isSaving}
                className="mt-5 w-full py-3 sm:py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 touch-manipulation"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Guardar
              </button>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 sm:p-5 text-sm text-slate-600">
        <p className="font-medium text-slate-800 mb-2">Ejemplo con Bs. 7 + Bs. 1/hr extra y 15 min de gracia</p>
        <ul className="space-y-1 list-disc list-inside text-slate-500">
          <li>4 min: Bs. 7 (1ra hora completa, sin gracia)</li>
          <li>1h 2min: Bs. 7 (aún en 1ra hora + gracia extra)</li>
          <li>1h 16min: Bs. 8 (7 + 1 hora extra)</li>
          <li>2h 16min: Bs. 9 (7 + 2 horas extra)</li>
        </ul>
      </div>
    </div>
  );
}
