-- ============================================================
-- Corrige advertencias del Security Advisor (Warnings)
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- Luego: Advisors > Security > Rerun linter
-- ============================================================

-- ------------------------------------------------------------
-- 1) Function Search Path Mutable
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_parking_amount(
  p_vehicle_type vehicle_type,
  p_entry_at TIMESTAMPTZ,
  p_exit_at TIMESTAMPTZ
) RETURNS DECIMAL
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
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

  IF p_vehicle_type::text = 'motorcycle_day' THEN
    RETURN v_first;
  END IF;

  v_minutes := EXTRACT(EPOCH FROM (p_exit_at - p_entry_at)) / 60.0;
  IF v_minutes <= 0 THEN RETURN 0; END IF;
  IF v_minutes <= 60 THEN RETURN v_first; END IF;

  v_billable_extra := v_minutes - 60 - COALESCE(v_grace, 0);
  IF v_billable_extra <= 0 THEN RETURN v_first; END IF;

  v_extra_hours := CEIL(v_billable_extra / 60.0);
  RETURN v_first + v_extra_hours * COALESCE(v_extra, 0);
END;
$$;

-- get_my_role sin SECURITY DEFINER: lee solo el propio perfil (RLS OK) y evita alertas
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'worker'
  );
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 2) Revocar EXECUTE público / anónimo en funciones sensibles
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;
-- El trigger en auth.users sigue ejecutándola como owner

REVOKE ALL ON FUNCTION public.calculate_parking_amount(vehicle_type, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.calculate_parking_amount(vehicle_type, timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.calculate_parking_amount(vehicle_type, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_parking_amount(vehicle_type, timestamptz, timestamptz) TO service_role;

-- ------------------------------------------------------------
-- 3) RLS Policy Always True en profiles
--    Recrea políticas seguras (sin USING (true))
-- ------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Usuarios ven su propio perfil"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins ven todos los perfiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Admins actualizan perfiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- Sin política INSERT: solo trigger handle_new_user / service_role
-- ------------------------------------------------------------
-- 4) Leaked Password Protection
--    NO se activa por SQL. En el Dashboard:
--    Authentication → Providers → Email (o Attack Protection)
--    → activar "Leaked password protection" (HaveIBeenPwned)
-- ------------------------------------------------------------
