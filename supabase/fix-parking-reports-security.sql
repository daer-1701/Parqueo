-- Corrige alerta: Security Definer View en public.parking_reports
-- Ejecutar en Supabase Dashboard > SQL Editor
--
-- La vista pasa a SECURITY INVOKER: respeta el RLS del usuario que consulta.
-- (La app hoy no usa esta vista; los reportes leen parking_entries.)

DROP VIEW IF EXISTS public.parking_reports;

CREATE VIEW public.parking_reports
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
FROM public.parking_entries
WHERE status = 'completed';
