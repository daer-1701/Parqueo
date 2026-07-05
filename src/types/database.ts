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
}

export interface PricingConfig {
  id: string;
  vehicle_type: VehicleType;
  first_hour_rate: number;
  extra_hour_rate: number;
  grace_minutes: number;
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
  truck: 'Camión',
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
};
