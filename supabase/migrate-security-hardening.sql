-- ============================================================
-- Seguridad: montos, roles, RLS, triggers
-- Ejecutar en Supabase Dashboard > SQL Editor (producción)
-- ============================================================

-- 1) Cálculo de monto alineado con la app (1ra hora siempre; gracia solo después)
CREATE OR REPLACE FUNCTION calculate_parking_amount(
  p_vehicle_type vehicle_type,
  p_entry_at TIMESTAMPTZ,
  p_exit_at TIMESTAMPTZ
) RETURNS DECIMAL AS $$
DECLARE
  v_first DECIMAL(10,2);
  v_extra DECIMAL(10,2);
  v_grace INT;
  v_minutes NUMERIC;
  v_billable_extra NUMERIC;
  v_extra_hours INT;
BEGIN
  SELECT first_hour_rate, extra_hour_rate, grace_minutes
  INTO v_first, v_extra, v_grace
  FROM pricing_config
  WHERE vehicle_type = p_vehicle_type;

  IF v_first IS NULL THEN
    IF p_vehicle_type::text = 'motorcycle_day' THEN
      RETURN 10.00;
    END IF;
    v_first := 7.00;
    v_extra := 1.00;
    v_grace := 15;
  END IF;

  -- Tarifa fija de día (moto día)
  IF p_vehicle_type::text = 'motorcycle_day' THEN
    RETURN v_first;
  END IF;

  v_minutes := EXTRACT(EPOCH FROM (p_exit_at - p_entry_at)) / 60.0;

  IF v_minutes <= 0 THEN
    RETURN 0;
  END IF;

  IF v_minutes <= 60 THEN
    RETURN v_first;
  END IF;

  v_billable_extra := v_minutes - 60 - COALESCE(v_grace, 0);
  IF v_billable_extra <= 0 THEN
    RETURN v_first;
  END IF;

  v_extra_hours := CEIL(v_billable_extra / 60.0);
  RETURN v_first + v_extra_hours * COALESCE(v_extra, 0);
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

-- 2) Nuevos usuarios siempre worker (el admin asigna rol vía API)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'worker'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3) Helper de rol (INVOKER + search_path fijo; sin SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SET search_path = public;

REVOKE ALL ON FUNCTION get_my_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION get_my_role() FROM anon;
GRANT EXECUTE ON FUNCTION get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_role() TO service_role;

REVOKE ALL ON FUNCTION handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION handle_new_user() FROM authenticated;

-- 4) Forzar montos y campos en parking_entries
CREATE OR REPLACE FUNCTION enforce_parking_entry_security()
RETURNS TRIGGER AS $$
DECLARE
  v_today DATE;
  v_has_monthly BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'active';
    NEW.amount := NULL;
    NEW.exit_at := NULL;
    NEW.worker_exit_id := NULL;
    IF auth.uid() IS NOT NULL THEN
      NEW.worker_entry_id := auth.uid();
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: no alterar identidad de la entrada
  NEW.plate := OLD.plate;
  NEW.vehicle_type := OLD.vehicle_type;
  NEW.entry_at := OLD.entry_at;
  NEW.worker_entry_id := OLD.worker_entry_id;

  IF OLD.status = 'active' AND NEW.status = 'completed' THEN
    NEW.exit_at := COALESCE(NEW.exit_at, NOW());
    v_today := (NEW.exit_at AT TIME ZONE 'America/La_Paz')::date;

    SELECT EXISTS (
      SELECT 1
      FROM monthly_parking mp
      WHERE mp.status = 'active'
        AND upper(mp.plate) = upper(OLD.plate)
        AND mp.period_start <= v_today
        AND mp.period_end >= v_today
    ) INTO v_has_monthly;

    IF v_has_monthly THEN
      NEW.amount := 0;
    ELSE
      NEW.amount := calculate_parking_amount(OLD.vehicle_type, OLD.entry_at, NEW.exit_at);
    END IF;

    IF auth.uid() IS NOT NULL THEN
      NEW.worker_exit_id := auth.uid();
    END IF;
  ELSIF OLD.status IS DISTINCT FROM NEW.status AND get_my_role() IS DISTINCT FROM 'admin' THEN
    -- Workers no pueden cancelar/cambiar status arbitrariamente salvo completed (arriba)
    IF NOT (OLD.status = 'active' AND NEW.status = 'completed') THEN
      RAISE EXCEPTION 'Cambio de estado no permitido';
    END IF;
  END IF;

  -- No rebajar montos de entradas ya cobradas (salvo admin)
  IF OLD.status = 'completed' AND get_my_role() IS DISTINCT FROM 'admin' THEN
    NEW.amount := OLD.amount;
    NEW.exit_at := OLD.exit_at;
    NEW.status := OLD.status;
    NEW.payment_method := OLD.payment_method;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_parking_entry_security ON parking_entries;
CREATE TRIGGER trg_parking_entry_security
  BEFORE INSERT OR UPDATE ON parking_entries
  FOR EACH ROW EXECUTE FUNCTION enforce_parking_entry_security();

-- 5) Mensual: monto desde tarifas; workers solo cancelan
CREATE OR REPLACE FUNCTION enforce_monthly_parking_security()
RETURNS TRIGGER AS $$
DECLARE
  v_rate DECIMAL(10,2);
  v_role user_role;
BEGIN
  v_role := get_my_role();

  IF TG_OP = 'INSERT' THEN
    SELECT monthly_rate INTO v_rate
    FROM pricing_config
    WHERE vehicle_type = NEW.vehicle_type;

    IF v_rate IS NULL OR v_rate <= 0 THEN
      RAISE EXCEPTION 'No hay tarifa mensual configurada para este vehículo';
    END IF;

    NEW.monthly_amount := v_rate;
    IF auth.uid() IS NOT NULL THEN
      NEW.worker_id := auth.uid();
    END IF;
    NEW.status := COALESCE(NEW.status, 'active');
    RETURN NEW;
  END IF;

  -- UPDATE
  IF v_role = 'admin' THEN
    RETURN NEW;
  END IF;

  -- Worker: cancelar, o solo marcar pago (paid_at / payment_method / notes)
  IF NEW.status = 'cancelled' AND OLD.status = 'active' THEN
    NEW.plate := OLD.plate;
    NEW.vehicle_type := OLD.vehicle_type;
    NEW.monthly_amount := OLD.monthly_amount;
    NEW.period_start := OLD.period_start;
    NEW.period_end := OLD.period_end;
    NEW.worker_id := OLD.worker_id;
    NEW.paid_at := OLD.paid_at;
    NEW.payment_method := OLD.payment_method;
    NEW.customer_name := OLD.customer_name;
    RETURN NEW;
  END IF;

  IF
    NEW.plate IS NOT DISTINCT FROM OLD.plate
    AND NEW.vehicle_type IS NOT DISTINCT FROM OLD.vehicle_type
    AND NEW.monthly_amount IS NOT DISTINCT FROM OLD.monthly_amount
    AND NEW.period_start IS NOT DISTINCT FROM OLD.period_start
    AND NEW.period_end IS NOT DISTINCT FROM OLD.period_end
    AND NEW.status IS NOT DISTINCT FROM OLD.status
    AND NEW.worker_id IS NOT DISTINCT FROM OLD.worker_id
    AND NEW.customer_name IS NOT DISTINCT FROM OLD.customer_name
  THEN
    -- Solo pago / notas
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Solo puedes cancelar un plan o registrar el pago';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_monthly_parking_security ON monthly_parking;
CREATE TRIGGER trg_monthly_parking_security
  BEFORE INSERT OR UPDATE ON monthly_parking
  FOR EACH ROW EXECUTE FUNCTION enforce_monthly_parking_security();

DROP POLICY IF EXISTS "Workers actualizan parqueo mensual" ON monthly_parking;
CREATE POLICY "Workers actualizan parqueo mensual"
  ON monthly_parking FOR UPDATE
  USING (get_my_role() = 'worker')
  WITH CHECK (get_my_role() = 'worker');

-- 6) Depósitos: workers NO insertan directo (solo API con service role)
DROP POLICY IF EXISTS "Workers confirman sus depósitos" ON worker_deposits;

-- 7) Profiles: sin INSERT para clientes (solo trigger SECURITY DEFINER / service_role)
DROP POLICY IF EXISTS "Insertar perfil al registrarse" ON profiles;

-- 8) Vista con security_invoker (respeta RLS de la tabla base)
DROP VIEW IF EXISTS parking_reports;
CREATE VIEW parking_reports
WITH (security_invoker = true)
AS
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
