-- ============================================================
-- FIX: Error "Database error creating new user"
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

-- El trigger handle_new_user no podía insertar en profiles por RLS
DROP POLICY IF EXISTS "Insertar perfil al registrarse" ON profiles;
CREATE POLICY "Insertar perfil al registrarse"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- Trigger mejorado (search_path seguro)
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
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'worker')
  );
  RETURN NEW;
END;
$$;
