-- Tarifas mensuales por tipo de vehículo
-- Ejecutar en Supabase Dashboard > SQL Editor

ALTER TABLE pricing_config
  ADD COLUMN IF NOT EXISTS monthly_rate DECIMAL(10,2) NOT NULL DEFAULT 0
  CHECK (monthly_rate >= 0);

-- Asegurar filas para los 3 tipos usados en mensual
INSERT INTO pricing_config (vehicle_type, first_hour_rate, extra_hour_rate, grace_minutes, monthly_rate)
VALUES
  ('motorcycle', 5.00, 1.00, 10, 150.00),
  ('car', 7.00, 1.00, 15, 350.00),
  ('truck', 7.00, 1.00, 15, 450.00)
ON CONFLICT (vehicle_type) DO UPDATE
SET monthly_rate = CASE
  WHEN pricing_config.monthly_rate = 0 THEN EXCLUDED.monthly_rate
  ELSE pricing_config.monthly_rate
END;

UPDATE pricing_config SET monthly_rate = 150.00 WHERE vehicle_type = 'motorcycle' AND monthly_rate = 0;
UPDATE pricing_config SET monthly_rate = 350.00 WHERE vehicle_type = 'car' AND monthly_rate = 0;
UPDATE pricing_config SET monthly_rate = 450.00 WHERE vehicle_type = 'truck' AND monthly_rate = 0;
