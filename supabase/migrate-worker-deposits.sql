-- Depósitos semanales del operador (efectivo cobrado → depósito al admin)
-- Ejecutar en Supabase Dashboard > SQL Editor

CREATE TABLE worker_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  expected_amount DECIMAL(10,2) NOT NULL CHECK (expected_amount >= 0),
  deposited_amount DECIMAL(10,2) NOT NULL CHECK (deposited_amount >= 0),
  hourly_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  monthly_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  hourly_count INT NOT NULL DEFAULT 0,
  monthly_count INT NOT NULL DEFAULT 0,
  notes TEXT,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT worker_deposits_week_valid CHECK (week_end >= week_start),
  UNIQUE (worker_id, week_start)
);

CREATE INDEX idx_worker_deposits_worker ON worker_deposits(worker_id);
CREATE INDEX idx_worker_deposits_week ON worker_deposits(week_start DESC);
CREATE INDEX idx_worker_deposits_confirmed ON worker_deposits(confirmed_at DESC);

ALTER TABLE worker_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers ven sus depósitos"
  ON worker_deposits FOR SELECT
  USING (worker_id = auth.uid());

CREATE POLICY "Workers confirman sus depósitos"
  ON worker_deposits FOR INSERT
  WITH CHECK (worker_id = auth.uid());

CREATE POLICY "Admins ven todos los depósitos"
  ON worker_deposits FOR SELECT
  USING (get_my_role() = 'admin');
