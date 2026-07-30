-- ============================================================
-- FIX: Error "Database error creating new user" + rol seguro
-- Ejecutar en Supabase → SQL Editor
-- (Preferir migrate-security-hardening.sql en instalaciones actuales)
-- ============================================================

-- Sin política INSERT: el trigger SECURITY DEFINER y service_role insertan el perfil
DROP POLICY IF EXISTS "Insertar perfil al registrarse" ON profiles;

-- Siempre worker; el admin asigna rol vía API (service role)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'worker'
  );
  RETURN NEW;
END;
$$;
