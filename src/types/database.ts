export type UserRole = 'admin' | 'worker';
export type ParkingStatus = 'active' | 'completed' | 'cancelled';
export type MonthlyParkingStatus = 'active' | 'expired' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'transfer';
export type VehicleType = 'car' | 'motorcycle' | 'truck';

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
  truck: 'Vagoneta / Camioneta',
};

export type ActiveVehicleType = 'car' | 'motorcycle';

/** Tipos activos en parqueo por horas */
export const ACTIVE_VEHICLE_TYPES: ActiveVehicleType[] = ['car', 'motorcycle'];

export const ACTIVE_VEHICLE_LABELS: Record<ActiveVehicleType, string> = {
  car: 'Automóvil',
  motorcycle: 'Motocicleta',
};

/** Tipos activos en parqueo mensual (3 categorías) */
export const MONTHLY_VEHICLE_TYPES: VehicleType[] = [
  'motorcycle',
  'car',
  'truck',
];

export const MONTHLY_VEHICLE_LABELS: Record<VehicleType, string> = {
  motorcycle: 'Motocicleta',
  car: 'Automóvil estándar',
  truck: 'Vagoneta / Camioneta',
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
};
