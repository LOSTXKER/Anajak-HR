-- Migration: Fix leave days calculation to exclude weekends and holidays
-- Run this in Supabase SQL Editor

-- =====================================================
-- Update calculate_leave_days function
-- Previously: (end_date - start_date) + 1 (calendar days, includes weekends)
-- Now: Count only working days based on system_settings.working_days, excluding holidays
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_leave_days(
  p_start_date DATE,
  p_end_date DATE,
  p_is_half_day BOOLEAN
) RETURNS DECIMAL(5, 2) AS $$
DECLARE
  v_days DECIMAL(5, 2) := 0;
  v_date DATE;
  v_working_days INTEGER[];
  v_working_days_str TEXT;
  v_dow INTEGER; -- our format: 1=Mon ... 6=Sat, 7=Sun
BEGIN
  IF p_is_half_day THEN
    RETURN 0.5;
  END IF;

  -- ดึง working_days จาก system_settings (เช่น "1,2,3,4,5,6" = จ-ส)
  SELECT setting_value INTO v_working_days_str
  FROM system_settings
  WHERE setting_key = 'working_days'
  LIMIT 1;

  -- แปลง string เป็น array of integers, default จ-ศ ถ้าไม่มีค่า
  IF v_working_days_str IS NULL OR v_working_days_str = '' THEN
    v_working_days := ARRAY[1, 2, 3, 4, 5];
  ELSE
    SELECT ARRAY(
      SELECT elem::INTEGER
      FROM unnest(string_to_array(v_working_days_str, ',')) AS elem
    ) INTO v_working_days;
  END IF;

  -- วนทุกวันในช่วง
  FOR v_date IN
    SELECT d::DATE
    FROM generate_series(p_start_date, p_end_date, '1 day'::INTERVAL) AS d
  LOOP
    -- แปลง DOW: PostgreSQL 0=อา, 1=จ, ..., 6=ส → our format: 0→7, อื่นๆ ตรงกัน
    v_dow := CASE WHEN EXTRACT(DOW FROM v_date)::INTEGER = 0 THEN 7
                  ELSE EXTRACT(DOW FROM v_date)::INTEGER
             END;

    -- ข้ามถ้าไม่ใช่วันทำงาน
    IF NOT (v_dow = ANY(v_working_days)) THEN
      CONTINUE;
    END IF;

    -- ข้ามวันหยุดนักขัตฤกษ์
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
