-- Fix atomic_checkin and atomic_checkout functions
-- The original functions reference clock_in_location / clock_out_location (JSONB)
-- but the actual table uses clock_in_gps_lat/lng and clock_out_gps_lat/lng (DECIMAL).
-- Also adds total_hours calculation to atomic_checkout.

-- 1. Fix atomic_checkin: extract lat/lng from JSONB parameter
CREATE OR REPLACE FUNCTION public.atomic_checkin(
  p_employee_id UUID,
  p_work_date DATE,
  p_clock_in_time TIMESTAMPTZ,
  p_clock_in_location JSONB DEFAULT NULL,
  p_clock_in_photo_url TEXT DEFAULT NULL,
  p_is_late BOOLEAN DEFAULT FALSE,
  p_late_minutes INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_existing RECORD;
BEGIN
  INSERT INTO attendance_logs (
    employee_id,
    work_date,
    clock_in_time,
    clock_in_gps_lat,
    clock_in_gps_lng,
    clock_in_photo_url,
    is_late,
    late_minutes
  )
  VALUES (
    p_employee_id,
    p_work_date,
    p_clock_in_time,
    CASE WHEN p_clock_in_location IS NOT NULL THEN (p_clock_in_location->>'lat')::DECIMAL ELSE NULL END,
    CASE WHEN p_clock_in_location IS NOT NULL THEN (p_clock_in_location->>'lng')::DECIMAL ELSE NULL END,
    p_clock_in_photo_url,
    p_is_late,
    p_late_minutes
  )
  ON CONFLICT (employee_id, work_date) DO NOTHING
  RETURNING to_jsonb(attendance_logs.*) INTO v_result;

  IF v_result IS NULL THEN
    SELECT * INTO v_existing
    FROM attendance_logs
    WHERE employee_id = p_employee_id AND work_date = p_work_date;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Already checked in today',
      'existing', to_jsonb(v_existing)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'data', v_result
  );
END;
$$;


-- 2. Fix atomic_checkout: use correct columns + calculate total_hours
CREATE OR REPLACE FUNCTION public.atomic_checkout(
  p_employee_id UUID,
  p_work_date DATE,
  p_clock_out_time TIMESTAMPTZ,
  p_clock_out_location JSONB DEFAULT NULL,
  p_clock_out_photo_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_existing RECORD;
  v_updated_count INTEGER;
  v_total_hours DECIMAL(5,2);
BEGIN
  SELECT * INTO v_existing
  FROM attendance_logs
  WHERE employee_id = p_employee_id AND work_date = p_work_date;

  IF v_existing IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No check-in record found'
    );
  END IF;

  IF v_existing.clock_out_time IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Already checked out today',
      'existing', to_jsonb(v_existing)
    );
  END IF;

  -- Calculate total_hours from clock_in to clock_out
  IF v_existing.clock_in_time IS NOT NULL THEN
    v_total_hours := ROUND(EXTRACT(EPOCH FROM (p_clock_out_time - v_existing.clock_in_time)) / 3600.0, 2);
    IF v_total_hours < 0 THEN
      v_total_hours := 0;
    END IF;
  END IF;

  UPDATE attendance_logs
  SET
    clock_out_time = p_clock_out_time,
    clock_out_gps_lat = CASE WHEN p_clock_out_location IS NOT NULL THEN (p_clock_out_location->>'lat')::DECIMAL ELSE NULL END,
    clock_out_gps_lng = CASE WHEN p_clock_out_location IS NOT NULL THEN (p_clock_out_location->>'lng')::DECIMAL ELSE NULL END,
    clock_out_photo_url = p_clock_out_photo_url,
    total_hours = v_total_hours
  WHERE id = v_existing.id
    AND clock_out_time IS NULL
  RETURNING to_jsonb(attendance_logs.*) INTO v_result;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Already checked out by another process'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'data', v_result
  );
END;
$$;


GRANT EXECUTE ON FUNCTION public.atomic_checkin TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_checkout TO authenticated;
