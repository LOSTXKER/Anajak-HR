-- Migration: Fix leave days calculation to exclude weekends and holidays
-- Run this in Supabase SQL Editor

-- =====================================================
-- Update calculate_leave_days function
-- Previously: (end_date - start_date) + 1 (calendar days, includes weekends)
-- Now: Count only working days (Mon-Fri), excluding holidays
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_leave_days(
  p_start_date DATE,
  p_end_date DATE,
  p_is_half_day BOOLEAN
) RETURNS DECIMAL(5, 2) AS $$
DECLARE
  v_days DECIMAL(5, 2) := 0;
  v_date DATE;
BEGIN
  IF p_is_half_day THEN
    RETURN 0.5;
  END IF;

  -- Iterate through each day in range
  FOR v_date IN
    SELECT d::DATE
    FROM generate_series(p_start_date, p_end_date, '1 day'::INTERVAL) AS d
  LOOP
    -- Skip weekends: 0 = Sunday, 6 = Saturday
    IF EXTRACT(DOW FROM v_date) IN (0, 6) THEN
      CONTINUE;
    END IF;

    -- Skip public holidays
    IF EXISTS (
      SELECT 1 FROM holidays
      WHERE date = v_date
        AND (is_active IS NULL OR is_active = TRUE)
    ) THEN
      CONTINUE;
    END IF;

    v_days := v_days + 1;
  END LOOP;

  RETURN GREATEST(v_days, 0);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Recalculate all existing leave balances
-- (to fix any records created with the old calculation)
-- =====================================================
UPDATE leave_balances lb
SET
  annual_leave_used = (
    SELECT COALESCE(SUM(calculate_leave_days(lr.start_date, lr.end_date, lr.is_half_day)), 0)
    FROM leave_requests lr
    WHERE lr.employee_id = lb.employee_id
      AND lr.leave_type = 'annual'
      AND lr.status = 'approved'
      AND EXTRACT(YEAR FROM lr.start_date) = lb.year
  ),
  sick_leave_used = (
    SELECT COALESCE(SUM(calculate_leave_days(lr.start_date, lr.end_date, lr.is_half_day)), 0)
    FROM leave_requests lr
    WHERE lr.employee_id = lb.employee_id
      AND lr.leave_type = 'sick'
      AND lr.status = 'approved'
      AND EXTRACT(YEAR FROM lr.start_date) = lb.year
  ),
  personal_leave_used = (
    SELECT COALESCE(SUM(calculate_leave_days(lr.start_date, lr.end_date, lr.is_half_day)), 0)
    FROM leave_requests lr
    WHERE lr.employee_id = lb.employee_id
      AND lr.leave_type = 'personal'
      AND lr.status = 'approved'
      AND EXTRACT(YEAR FROM lr.start_date) = lb.year
  ),
  updated_at = NOW();

-- Recalculate remaining days
UPDATE leave_balances
SET
  annual_leave_remaining  = annual_leave_quota  - annual_leave_used,
  sick_leave_remaining    = sick_leave_quota    - sick_leave_used,
  personal_leave_remaining = personal_leave_quota - personal_leave_used;

SELECT 'calculate_leave_days updated to exclude weekends & holidays. Balances recalculated.' AS message;
