-- Parqueo mensual — precio por vehículo definido por el operador
-- Ejecutar en Supabase Dashboard > SQL Editor

CREATE TYPE monthly_parking_status AS ENUM ('active', 'expired', 'cancelled');

CREATE TABLE monthly_parking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate TEXT NOT NULL,
  vehicle_type vehicle_type NOT NULL DEFAULT 'car',
  monthly_amount DECIMAL(10,2) NOT NULL CHECK (monthly_amount >= 0),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status monthly_parking_status NOT NULL DEFAULT 'active',
  customer_name TEXT,
  notes TEXT,
  worker_id UUID NOT NULL REFERENCES profiles(id),
  paid_at TIMESTAMPTZ,
  payment_method payment_method,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT monthly_parking_period_valid CHECK (period_end >= period_start)
);

CREATE INDEX idx_monthly_parking_plate ON monthly_parking(upper(plate));
CREATE INDEX idx_monthly_parking_status ON monthly_parking(status);
CREATE INDEX idx_monthly_parking_period ON monthly_parking(period_start, period_end);

CREATE UNIQUE INDEX idx_monthly_parking_one_active_plate
  ON monthly_parking (upper(plate))
  WHERE status = 'active';

ALTER TABLE monthly_parking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers ven parqueo mensual"
  ON monthly_parking FOR SELECT
  USING (get_my_role() = 'worker');

CREATE POLICY "Admins ven parqueo mensual"
  ON monthly_parking FOR SELECT
  USING (get_my_role() = 'admin');

CREATE POLICY "Workers registran parqueo mensual"
  ON monthly_parking FOR INSERT
  WITH CHECK (get_my_role() = 'worker' AND worker_id = auth.uid());

CREATE POLICY "Workers actualizan parqueo mensual"
  ON monthly_parking FOR UPDATE
  USING (get_my_role() = 'worker');

CREATE POLICY "Admins gestionan parqueo mensual"
  ON monthly_parking FOR ALL
  USING (get_my_role() = 'admin');
