-- ===========================================
-- Atomic Functions for Race Condition Prevention
-- รันใน Supabase Dashboard > SQL Editor
-- ===========================================

-- 1. Atomic Check-in Function
-- Prevents duplicate check-ins by using INSERT with ON CONFLICT
-- ----------------------------------------------------------------

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
  -- Try to insert, if conflict (already checked in today) return error
  INSERT INTO attendance_logs (
    employee_id,
    work_date,
    clock_in_time,
    clock_in_location,
    clock_in_photo_url,
    is_late,
    late_minutes
  )
  VALUES (
    p_employee_id,
    p_work_date,
    p_clock_in_time,
    p_clock_in_location,
    p_clock_in_photo_url,
    p_is_late,
    p_late_minutes
  )
  ON CONFLICT (employee_id, work_date) DO NOTHING
  RETURNING to_jsonb(attendance_logs.*) INTO v_result;
  
  -- If nothing was inserted, record already exists
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


-- 2. Atomic Check-out Function
-- Uses optimistic locking to prevent concurrent updates
-- ----------------------------------------------------------------

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
BEGIN
  -- Get current record
  SELECT * INTO v_existing 
  FROM attendance_logs 
  WHERE employee_id = p_employee_id AND work_date = p_work_date;
  
  -- Check if record exists
  IF v_existing IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No check-in record found'
    );
  END IF;
  
  -- Check if already checked out
  IF v_existing.clock_out_time IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Already checked out today',
      'existing', to_jsonb(v_existing)
    );
  END IF;
  
  -- Atomic update with condition (optimistic lock)
  UPDATE attendance_logs
  SET 
    clock_out_time = p_clock_out_time,
    clock_out_location = p_clock_out_location,
    clock_out_photo_url = p_clock_out_photo_url
  WHERE id = v_existing.id
    AND clock_out_time IS NULL  -- Ensure not already checked out
  RETURNING to_jsonb(attendance_logs.*) INTO v_result;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  IF v_updated_count = 0 THEN
    -- Another process beat us to it
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


-- 3. Atomic Start OT Function
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.atomic_start_ot(
  p_ot_id UUID,
  p_actual_start_time TIMESTAMPTZ,
  p_before_photo_url TEXT,
  p_ot_type TEXT DEFAULT 'workday',
  p_ot_rate DECIMAL DEFAULT 1.5,
  p_start_location JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_existing RECORD;
  v_updated_count INTEGER;
BEGIN
  -- Get current OT request
  SELECT * INTO v_existing 
  FROM ot_requests 
  WHERE id = p_ot_id;
  
  IF v_existing IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'OT request not found'
    );
  END IF;
  
  IF v_existing.status != 'approved' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'OT request is not approved'
    );
  END IF;
  
  IF v_existing.actual_start_time IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'OT already started',
      'existing', to_jsonb(v_existing)
    );
  END IF;
  
  -- Atomic update with condition
  UPDATE ot_requests
  SET 
    actual_start_time = p_actual_start_time,
    before_photo_url = p_before_photo_url,
    ot_type = p_ot_type,
    ot_rate = p_ot_rate,
    start_gps_lat = CASE WHEN p_start_location IS NOT NULL THEN (p_start_location->>'lat')::DECIMAL ELSE NULL END,
    start_gps_lng = CASE WHEN p_start_location IS NOT NULL THEN (p_start_location->>'lng')::DECIMAL ELSE NULL END
  WHERE id = p_ot_id
    AND actual_start_time IS NULL  -- Ensure not already started
    AND status = 'approved'
  RETURNING to_jsonb(ot_requests.*) INTO v_result;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  IF v_updated_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'OT already started by another process'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'data', v_result
  );
END;
$$;


-- 4. Atomic End OT Function
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.atomic_end_ot(
  p_ot_id UUID,
  p_actual_end_time TIMESTAMPTZ,
  p_after_photo_url TEXT,
  p_actual_ot_hours DECIMAL,
  p_ot_amount DECIMAL,
  p_end_location JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_existing RECORD;
  v_updated_count INTEGER;
BEGIN
  -- Get current OT request
  SELECT * INTO v_existing 
  FROM ot_requests 
  WHERE id = p_ot_id;
  
  IF v_existing IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'OT request not found'
    );
  END IF;
  
  IF v_existing.actual_start_time IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'OT has not started'
    );
  END IF;
  
  IF v_existing.actual_end_time IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'OT already ended',
      'existing', to_jsonb(v_existing)
    );
  END IF;
  
  -- Atomic update with condition
  UPDATE ot_requests
  SET 
    actual_end_time = p_actual_end_time,
    after_photo_url = p_after_photo_url,
    actual_ot_hours = p_actual_ot_hours,
    ot_amount = p_ot_amount,
    status = 'completed',
    end_gps_lat = CASE WHEN p_end_location IS NOT NULL THEN (p_end_location->>'lat')::DECIMAL ELSE NULL END,
    end_gps_lng = CASE WHEN p_end_location IS NOT NULL THEN (p_end_location->>'lng')::DECIMAL ELSE NULL END
  WHERE id = p_ot_id
    AND actual_end_time IS NULL  -- Ensure not already ended
    AND actual_start_time IS NOT NULL  -- Ensure OT was started
  RETURNING to_jsonb(ot_requests.*) INTO v_result;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  IF v_updated_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'OT already ended by another process'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'data', v_result
  );
END;
$$;


-- 5. Add unique constraint for attendance if not exists
-- ----------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'attendance_logs_employee_date_unique'
  ) THEN
    ALTER TABLE attendance_logs 
    ADD CONSTRAINT attendance_logs_employee_date_unique 
    UNIQUE (employee_id, work_date);
  END IF;
END $$;


-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.atomic_checkin TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_checkout TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_start_ot TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_end_ot TO authenticated;


-- Done!
-- ===========================================
