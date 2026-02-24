-- Atomic increment for gamification points to avoid race conditions
CREATE OR REPLACE FUNCTION increment_employee_points(
  p_employee_id UUID,
  p_points INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_total INT;
  v_level INT;
  v_level_name TEXT;
BEGIN
  UPDATE employee_points
  SET
    total_points = GREATEST(0, total_points + p_points),
    monthly_points = GREATEST(0, monthly_points + p_points),
    updated_at = NOW()
  WHERE employee_id = p_employee_id
  RETURNING total_points INTO v_new_total;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Calculate level
  SELECT
    CASE
      WHEN v_new_total >= 2500 THEN 7
      WHEN v_new_total >= 1500 THEN 6
      WHEN v_new_total >= 1000 THEN 5
      WHEN v_new_total >= 600  THEN 4
      WHEN v_new_total >= 300  THEN 3
      WHEN v_new_total >= 100  THEN 2
      ELSE 1
    END,
    CASE
      WHEN v_new_total >= 2500 THEN 'Legend'
      WHEN v_new_total >= 1500 THEN 'MVP'
      WHEN v_new_total >= 1000 THEN 'Super Star'
      WHEN v_new_total >= 600  THEN 'Star'
      WHEN v_new_total >= 300  THEN 'Reliable'
      WHEN v_new_total >= 100  THEN 'Regular'
      ELSE 'Rookie'
    END
  INTO v_level, v_level_name;

  UPDATE employee_points
  SET level = v_level, level_name = v_level_name
  WHERE employee_id = p_employee_id;

  RETURN TRUE;
END;
$$;
