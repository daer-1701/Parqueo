-- Migración: tarifa 1ra hora + horas extra
-- Ejecutar en Supabase → SQL Editor si ya tienes la tabla antigua

ALTER TABLE pricing_config
  ADD COLUMN IF NOT EXISTS first_hour_rate DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS extra_hour_rate DECIMAL(10,2);

-- Migrar desde rate_per_hour si existe, luego aplicar tarifas nuevas (7 + 1)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pricing_config' AND column_name = 'rate_per_hour'
  ) THEN
    UPDATE pricing_config
    SET
      first_hour_rate = COALESCE(first_hour_rate, rate_per_hour),
      extra_hour_rate = COALESCE(extra_hour_rate, 1.00);
  END IF;
END $$;

-- Tarifas por defecto del negocio: Bs. 7 la 1ra hora, Bs. 1 cada hora extra
UPDATE pricing_config
SET
  first_hour_rate = 7.00,
  extra_hour_rate = 1.00,
  updated_at = NOW();

ALTER TABLE pricing_config
  ALTER COLUMN first_hour_rate SET NOT NULL,
  ALTER COLUMN extra_hour_rate SET NOT NULL;

ALTER TABLE pricing_config DROP COLUMN IF EXISTS rate_per_hour;

-- Actualizar función de cálculo
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
