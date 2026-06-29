import { parseISO } from 'date-fns';
import type { PricingConfig, VehicleType } from '@/types/database';

const DEFAULT_FIRST_HOUR = 7;
const DEFAULT_EXTRA_HOUR = 1;
const DEFAULT_GRACE = 15;

export function getPricingForVehicle(
  vehicleType: VehicleType,
  pricing: PricingConfig[]
): Pick<PricingConfig, 'first_hour_rate' | 'extra_hour_rate' | 'grace_minutes'> {
  const config = pricing.find((p) => p.vehicle_type === vehicleType);
  return {
    first_hour_rate: config?.first_hour_rate ?? DEFAULT_FIRST_HOUR,
    extra_hour_rate: config?.extra_hour_rate ?? DEFAULT_EXTRA_HOUR,
    grace_minutes: config?.grace_minutes ?? DEFAULT_GRACE,
  };
}

/**
 * Lógica: 1ra hora siempre se cobra completa (sin gracia).
 * Después de la 1ra hora, aplican minutos de gracia antes de cobrar horas extra.
 * Las horas parciales extra se redondean hacia arriba.
 */
export function calculateParkingAmount(
  vehicleType: VehicleType,
  entryAt: Date,
  exitAt: Date,
  pricing: PricingConfig[]
): number {
  const { first_hour_rate, extra_hour_rate, grace_minutes } = getPricingForVehicle(
    vehicleType,
    pricing
  );

  const minutes = (exitAt.getTime() - entryAt.getTime()) / (1000 * 60);

  if (minutes <= 0) return 0;

  if (minutes <= 60) {
    return first_hour_rate;
  }

  const billableExtraMinutes = minutes - 60 - grace_minutes;
  if (billableExtraMinutes <= 0) {
    return first_hour_rate;
  }

  const extraHours = Math.ceil(billableExtraMinutes / 60);
  return first_hour_rate + extraHours * extra_hour_rate;
}

export function formatPricingSummary(config: PricingConfig): string {
  return `${formatCurrency(config.first_hour_rate)} 1ra hr + ${formatCurrency(config.extra_hour_rate)}/hr extra`;
}

export function formatDuration(entryAt: string, exitAt?: string | Date | null): string {
  const start = parseISO(entryAt);
  const end =
    exitAt instanceof Date ? exitAt : exitAt ? parseISO(exitAt) : new Date();
  const minutes = Math.max(
    0,
    Math.floor((end.getTime() - start.getTime()) / (1000 * 60))
  );

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
  }).format(amount);
}
