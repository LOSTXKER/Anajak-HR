-- =============================================================
-- Migration: Fix increment_employee_points RPC
--
-- Problems fixed:
--   1. References dropped column `monthly_points`
--   2. Level thresholds don't match service LEVELS constant
--   3. Does not update `quarterly_points` or `rank_tier`
-- =============================================================

CREATE OR REPLACE FUNCTION increment_employee_points(
  p_employee_id UUID,
  p_points      INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_total     INT;
  v_new_quarterly INT;
  v_level         INT;
  v_level_name    TEXT;
  v_rank_tier     TEXT;
BEGIN
  -- Atomic update: total_points + quarterly_points (no more monthly_points)
  UPDATE employee_points
  SET
    total_points     = GREATEST(0, total_points     + p_points),
    quarterly_points = GREATEST(0, quarterly_points + p_points),
    updated_at       = NOW()
  WHERE employee_id = p_employee_id
  RETURNING total_points, quarterly_points
    INTO v_new_total, v_new_quarterly;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Level thresholds (must match LEVELS in gamification.service.ts)
  SELECT
    CASE
      WHEN v_new_total >= 15000 THEN 8
      WHEN v_new_total >= 10000 THEN 7
      WHEN v_new_total >= 6000  THEN 6
      WHEN v_new_total >= 3000  THEN 5
      WHEN v_new_total >= 1500  THEN 4
      WHEN v_new_total >= 600   THEN 3
      WHEN v_new_total >= 200   THEN 2
      ELSE 1
    END,
    CASE
      WHEN v_new_total >= 15000 THEN 'Immortal'
      WHEN v_new_total >= 10000 THEN 'Legend'
      WHEN v_new_total >= 6000  THEN 'MVP'
      WHEN v_new_total >= 3000  THEN 'Super Star'
      WHEN v_new_total >= 1500  THEN 'Star'
      WHEN v_new_total >= 600   THEN 'Reliable'
      WHEN v_new_total >= 200   THEN 'Regular'
      ELSE 'Rookie'
    END
  INTO v_level, v_level_name;

  -- Rank tier thresholds (must match RANK_TIERS in gamification.service.ts)
  SELECT
    CASE
      WHEN v_new_quarterly >= 700 THEN 'Diamond'
      WHEN v_new_quarterly >= 500 THEN 'Platinum'
      WHEN v_new_quarterly >= 300 THEN 'Gold'
      WHEN v_new_quarterly >= 150 THEN 'Silver'
      WHEN v_new_quarterly >= 50  THEN 'Bronze'
      ELSE 'Unranked'
    END
  INTO v_rank_tier;

  UPDATE employee_points
  SET
    level      = v_level,
    level_name = v_level_name,
    rank_tier  = v_rank_tier
  WHERE employee_id = p_employee_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_employee_points(UUID, INT) TO authenticated;

SELECT 'RPC increment_employee_points fixed successfully!' AS message;
