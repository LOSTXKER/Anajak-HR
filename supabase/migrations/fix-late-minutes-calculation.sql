-- Fix late_minutes calculation for existing records
-- This migration recalculates late_minutes by subtracting late_threshold
-- Run this in Supabase SQL Editor or via migration

DO $$
DECLARE
  v_work_start_time TEXT;
  v_late_threshold INT;
  v_record RECORD;
  v_work_start_minutes INT;
  v_clock_in_minutes INT;
  v_minutes_after_start INT;
  v_new_late_minutes INT;
BEGIN
  -- Get current settings
  SELECT setting_value INTO v_work_start_time 
  FROM system_settings 
  WHERE setting_key = 'work_start_time';
  
  SELECT setting_value::INT INTO v_late_threshold 
  FROM system_settings 
  WHERE setting_key = 'late_threshold_minutes';
  
  -- Default values if settings not found
  IF v_work_start_time IS NULL THEN
    v_work_start_time := '09:00';
  END IF;
  
  IF v_late_threshold IS NULL THEN
    v_late_threshold := 15;
  END IF;
  
  -- Calculate work_start in minutes
  v_work_start_minutes := (SPLIT_PART(v_work_start_time, ':', 1)::INT * 60) 
                        + SPLIT_PART(v_work_start_time, ':', 2)::INT;
  
  RAISE NOTICE 'Work start time: %, Late threshold: % minutes', v_work_start_time, v_late_threshold;
  RAISE NOTICE 'Recalculating late_minutes for existing records...';
  
  -- Loop through all late attendance records
  FOR v_record IN 
    SELECT id, clock_in_time, late_minutes, work_date
    FROM attendance_logs 
    WHERE is_late = true 
      AND clock_in_time IS NOT NULL
      AND late_minutes > 0
  LOOP
    -- Calculate clock_in time in minutes
    v_clock_in_minutes := EXTRACT(HOUR FROM v_record.clock_in_time)::INT * 60 
                        + EXTRACT(MINUTE FROM v_record.clock_in_time)::INT;
    
    -- Calculate minutes after work start
    v_minutes_after_start := v_clock_in_minutes - v_work_start_minutes;
    
    -- Only update if currently late AND after threshold
    IF v_minutes_after_start > v_late_threshold THEN
      -- Subtract threshold from late_minutes
      v_new_late_minutes := GREATEST(0, v_minutes_after_start - v_late_threshold);
      
      -- Update only if value changed
      IF v_new_late_minutes != v_record.late_minutes THEN
        UPDATE attendance_logs 
        SET late_minutes = v_new_late_minutes
        WHERE id = v_record.id;
        
        RAISE NOTICE 'Updated record %: % -> % minutes late', 
                     v_record.work_date, 
                     v_record.late_minutes, 
                     v_new_late_minutes;
      END IF;
    ELSIF v_minutes_after_start <= v_late_threshold THEN
      -- Within threshold - should not be marked as late
      UPDATE attendance_logs 
      SET is_late = false, late_minutes = 0
      WHERE id = v_record.id;
      
      RAISE NOTICE 'Cleared late status for record %: within threshold', v_record.work_date;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Migration completed successfully!';
END $$;

-- Verify results
SELECT 
  work_date,
  TO_CHAR(clock_in_time, 'HH24:MI') as clock_in,
  is_late,
  late_minutes,
  CASE 
    WHEN late_minutes > 60 THEN '⚠️ ตรวจสอบ (สายเกิน 1 ชม.)'
    WHEN is_late AND late_minutes = 0 THEN '⚠️ ตรวจสอบ (สายแต่ไม่มีนาที)'
    ELSE '✅'
  END as status
FROM attendance_logs
WHERE work_date >= CURRENT_DATE - INTERVAL '30 days'
  AND is_late = true
ORDER BY work_date DESC, clock_in_time DESC
LIMIT 20;

