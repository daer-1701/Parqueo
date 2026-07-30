-- ============================================================
-- Limpieza para entrega al cliente
-- Borra datos operativos. CONSERVA usuarios (auth + profiles)
-- y tarifas (pricing_config).
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

BEGIN;

-- Orden: tablas hijas / dependientes primero
TRUNCATE TABLE worker_deposits RESTART IDENTITY;
TRUNCATE TABLE parking_entries RESTART IDENTITY;
TRUNCATE TABLE monthly_parking RESTART IDENTITY;

-- Desbloquear perfiles (sin borrar usuarios)
UPDATE profiles
SET
  is_locked = false,
  failed_login_attempts = 0,
  locked_at = NULL
WHERE is_locked = true
   OR failed_login_attempts > 0
   OR locked_at IS NOT NULL;

COMMIT;

-- Verificación rápida
SELECT 'parking_entries' AS tabla, COUNT(*) AS filas FROM parking_entries
UNION ALL
SELECT 'monthly_parking', COUNT(*) FROM monthly_parking
UNION ALL
SELECT 'worker_deposits', COUNT(*) FROM worker_deposits
UNION ALL
SELECT 'profiles (usuarios)', COUNT(*) FROM profiles
UNION ALL
SELECT 'pricing_config (tarifas)', COUNT(*) FROM pricing_config;
