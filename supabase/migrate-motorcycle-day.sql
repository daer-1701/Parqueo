-- Moto todo el día: tarifa fija (default 10 Bs), editable por admin
-- Ejecutar en Supabase Dashboard > SQL Editor
--
-- Si el INSERT falla por "unsafe use of new value", vuelve a ejecutar
-- solo el bloque INSERT (el enum ya quedó creado).

ALTER TYPE vehicle_type ADD VALUE IF NOT EXISTS 'motorcycle_day';

INSERT INTO pricing_config (vehicle_type, first_hour_rate, extra_hour_rate, grace_minutes, monthly_rate)
VALUES ('motorcycle_day', 10.00, 0.00, 0, 0.00)
ON CONFLICT (vehicle_type) DO NOTHING;
