export type UserRole = 'admin' | 'worker';
export type ParkingStatus = 'active' | 'completed' | 'cancelled';
export type MonthlyParkingStatus = 'active' | 'expired' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'transfer';
export type VehicleType = 'car' | 'motorcycle' | 'motorcycle_day' | 'truck';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  is_locked?: boolean;
  failed_login_attempts?: number;
  locked_at?: string | null;
}

export interface PricingConfig {
  id: string;
  vehicle_type: VehicleType;
  first_hour_rate: number;
  extra_hour_rate: number;
  grace_minutes: number;
  monthly_rate?: number;
  updated_at: string;
}

export interface ParkingEntry {
  id: string;
  plate: string;
  vehicle_type: VehicleType;
  status: ParkingStatus;
  entry_at: string;
  exit_at: string | null;
  amount: number | null;
  payment_method: PaymentMethod | null;
  notes: string | null;
  worker_entry_id: string;
  worker_exit_id: string | null;
  created_at: string;
}

export interface ParkingEntryWithWorker extends ParkingEntry {
  worker_entry?: Profile;
  worker_exit?: Profile;
}

export interface WorkerDeposit {
  id: string;
  worker_id: string;
  week_start: string;
  week_end: string;
  expected_amount: number;
  deposited_amount: number;
  hourly_total: number;
  monthly_total: number;
  hourly_count: number;
  monthly_count: number;
  notes: string | null;
  confirmed_at: string;
  created_at: string;
}

export interface MonthlyParking {
  id: string;
  plate: string;
  vehicle_type: VehicleType;
  monthly_amount: number;
  period_start: string;
  period_end: string;
  status: MonthlyParkingStatus;
  customer_name: string | null;
  notes: string | null;
  worker_id: string;
  paid_at: string | null;
  payment_method: PaymentMethod | null;
  created_at: string;
}

export interface ReportSummary {
  total_entries: number;
  total_revenue: number;
  avg_amount: number;
  avg_hours: number;
}

export interface ReportPeriodData {
  period: string;
  entries: number;
  revenue: number;
}

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  car: 'Automóvil',
  motorcycle: 'Motocicleta',
  motorcycle_day: 'Moto todo el día',
  truck: 'Vagoneta / Camioneta',
};

export type HourlyVehicleType = 'car' | 'motorcycle';
export type DayVehicleType = 'motorcycle_day';
export type ActiveVehicleType = HourlyVehicleType | DayVehicleType;

/** Tipos con tarifa por horas */
export const HOURLY_VEHICLE_TYPES: HourlyVehicleType[] = ['car', 'motorcycle'];

/** Tipos con tarifa fija del día */
export const DAY_VEHICLE_TYPES: DayVehicleType[] = ['motorcycle_day'];

/** Tipos activos en parqueo por horas / día (entrada worker) */
export const ACTIVE_VEHICLE_TYPES: ActiveVehicleType[] = [
  ...HOURLY_VEHICLE_TYPES,
  ...DAY_VEHICLE_TYPES,
];

export const ACTIVE_VEHICLE_LABELS: Record<ActiveVehicleType, string> = {
  car: 'Automóvil',
  motorcycle: 'Motocicleta',
  motorcycle_day: 'Moto todo el día',
};

/** Tipos activos en parqueo mensual (3 categorías) */
export type MonthlyVehicleType = 'motorcycle' | 'car' | 'truck';

export const MONTHLY_VEHICLE_TYPES: MonthlyVehicleType[] = [
  'motorcycle',
  'car',
  'truck',
];

export const MONTHLY_VEHICLE_LABELS: Record<MonthlyVehicleType, string> = {
  motorcycle: 'Motocicleta',
  car: 'Automóvil estándar',
  truck: 'Vagoneta / Camioneta',
};

export function isDayRateVehicle(vehicleType: VehicleType): boolean {
  return (DAY_VEHICLE_TYPES as VehicleType[]).includes(vehicleType);
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
};
