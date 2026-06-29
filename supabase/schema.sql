-- ============================================================
-- Sistema de Parqueo - Esquema Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- Roles de usuario
CREATE TYPE user_role AS ENUM ('admin', 'worker');

-- Estado de entrada al parqueo
CREATE TYPE parking_status AS ENUM ('active', 'completed', 'cancelled');

-- Método de pago
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'transfer');

-- Tipo de vehículo
CREATE TYPE vehicle_type AS ENUM ('car', 'motorcycle', 'truck');

-- Perfiles vinculados a auth.users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'worker',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Configuración de tarifas
CREATE TABLE pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_type vehicle_type NOT NULL UNIQUE,
  first_hour_rate DECIMAL(10,2) NOT NULL,
  extra_hour_rate DECIMAL(10,2) NOT NULL,
  grace_minutes INT NOT NULL DEFAULT 15,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Entradas al parqueo
CREATE TABLE parking_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate TEXT NOT NULL,
  vehicle_type vehicle_type NOT NULL DEFAULT 'car',
  status parking_status NOT NULL DEFAULT 'active',
  entry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exit_at TIMESTAMPTZ,
  amount DECIMAL(10,2),
  payment_method payment_method,
  notes TEXT,
  worker_entry_id UUID NOT NULL REFERENCES profiles(id),
  worker_exit_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_parking_entries_status ON parking_entries(status);
CREATE INDEX idx_parking_entries_plate ON parking_entries(plate);
CREATE INDEX idx_parking_entries_entry_at ON parking_entries(entry_at);
CREATE INDEX idx_parking_entries_exit_at ON parking_entries(exit_at);

-- ============================================================
-- Función: calcular monto del parqueo
-- Lógica: gracia → 1ra hora (tarifa fija) → horas extra
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_parking_amount(
  p_vehicle_type vehicle_type,
  p_entry_at TIMESTAMPTZ,
  p_exit_at TIMESTAMPTZ
) RETURNS DECIMAL AS $$
DECLARE
  v_first DECIMAL(10,2);
  v_extra DECIMAL(10,2);
  v_grace INT;
  v_minutes INT;
  v_hours INT;
BEGIN
  SELECT first_hour_rate, extra_hour_rate, grace_minutes
  INTO v_first, v_extra, v_grace
  FROM pricing_config
  WHERE vehicle_type = p_vehicle_type;

  IF v_first IS NULL THEN
    v_first := 7.00;
    v_extra := 1.00;
    v_grace := 15;
  END IF;

  v_minutes := EXTRACT(EPOCH FROM (p_exit_at - p_entry_at)) / 60;

  IF v_minutes <= v_grace THEN
    RETURN 0;
  END IF;

  v_hours := CEIL((v_minutes - v_grace) / 60.0);
  IF v_hours < 1 THEN
    v_hours := 1;
  END IF;

  IF v_hours <= 1 THEN
    RETURN v_first;
  END IF;

  RETURN v_first + (v_hours - 1) * v_extra;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- Trigger: crear perfil al registrar usuario
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'worker')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;

-- Helper: obtener rol del usuario actual
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- PROFILES
CREATE POLICY "Usuarios ven su propio perfil"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins ven todos los perfiles"
  ON profiles FOR SELECT
  USING (get_my_role() = 'admin');

CREATE POLICY "Admins actualizan perfiles"
  ON profiles FOR UPDATE
  USING (get_my_role() = 'admin');

CREATE POLICY "Insertar perfil al registrarse"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- PRICING CONFIG
CREATE POLICY "Todos los autenticados ven tarifas"
  ON pricing_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins gestionan tarifas"
  ON pricing_config FOR ALL
  USING (get_my_role() = 'admin');

-- PARKING ENTRIES
CREATE POLICY "Workers ven entradas activas y propias"
  ON parking_entries FOR SELECT
  USING (
    get_my_role() = 'worker' AND (
      status = 'active' OR worker_entry_id = auth.uid() OR worker_exit_id = auth.uid()
    )
  );

CREATE POLICY "Admins ven todas las entradas"
  ON parking_entries FOR SELECT
  USING (get_my_role() = 'admin');

CREATE POLICY "Workers registran entradas"
  ON parking_entries FOR INSERT
  WITH CHECK (
    get_my_role() = 'worker' AND worker_entry_id = auth.uid()
  );

CREATE POLICY "Workers completan salidas"
  ON parking_entries FOR UPDATE
  USING (get_my_role() = 'worker' AND status = 'active')
  WITH CHECK (worker_exit_id = auth.uid());

CREATE POLICY "Admins gestionan entradas"
  ON parking_entries FOR ALL
  USING (get_my_role() = 'admin');

-- ============================================================
-- Datos iniciales de tarifas
-- ============================================================
INSERT INTO pricing_config (vehicle_type, first_hour_rate, extra_hour_rate, grace_minutes) VALUES
  ('car', 7.00, 1.00, 15),
  ('motorcycle', 7.00, 1.00, 15),
  ('truck', 7.00, 1.00, 15);

-- ============================================================
-- Vista para reportes (accesible por admins via RLS en la tabla base)
-- ============================================================
CREATE OR REPLACE VIEW parking_reports AS
SELECT
  id,
  plate,
  vehicle_type,
  status,
  entry_at,
  exit_at,
  amount,
  payment_method,
  worker_entry_id,
  worker_exit_id,
  EXTRACT(EPOCH FROM (COALESCE(exit_at, NOW()) - entry_at)) / 3600 AS hours_parked,
  DATE(entry_at AT TIME ZONE 'America/La_Paz') AS entry_date,
  DATE_TRUNC('week', entry_at AT TIME ZONE 'America/La_Paz') AS entry_week,
  DATE_TRUNC('month', entry_at AT TIME ZONE 'America/La_Paz') AS entry_month
FROM parking_entries
WHERE status = 'completed';
