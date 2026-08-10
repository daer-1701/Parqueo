-- ============================================================
-- FIX URGENTE: Error 500 al registrar placas / parking_entries
-- Causa: get_my_role() sin SECURITY DEFINER + política admin en
-- profiles → "infinite recursion detected in policy for relation profiles"
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- Debe ser SECURITY DEFINER para leer profiles sin reentrar en RLS.
-- search_path fijo + REVOKE público mantiene el endurecimiento de seguridad.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO service_role;
