-- Fix late_minutes calculation for ALL existing records
-- This migration recalculates is_late and late_minutes properly
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  v_work_start_time TEXT;
  v_late_threshold INT;
  v_record RECORD;
  v_work_start_minutes INT;
  v_clock_in_minutes INT;
  v_minutes_after_start INT;
  v_new_late_minutes INT;
  v_is_late BOOLEAN;
  v_updated_count INT := 0;
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
    v_work_start_time := '10:00';
  END IF;
  
  IF v_late_threshold IS NULL THEN
    v_late_threshold := 30;
  END IF;
  
  -- Calculate work_start in minutes
  v_work_start_minutes := (SPLIT_PART(v_work_start_time, ':', 1)::INT * 60) 
                        + SPLIT_PART(v_work_start_time, ':', 2)::INT;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'เวลาเข้างาน: % น.', v_work_start_time;
  RAISE NOTICE 'เกณฑ์มาสาย: % นาที', v_late_threshold;
  RAISE NOTICE 'สาย = เช็คอินหลัง %:%', 
    (v_work_start_minutes + v_late_threshold) / 60,
    LPAD(((v_work_start_minutes + v_late_threshold) % 60)::TEXT, 2, '0');
  RAISE NOTICE '========================================';
  
  -- Loop through ALL attendance records with clock_in_time
  FOR v_record IN 
    SELECT a.id, a.clock_in_time, a.is_late, a.late_minutes, a.work_date,
           e.name as employee_name
    FROM attendance_logs a
    LEFT JOIN employees e ON e.id = a.employee_id
    WHERE a.clock_in_time IS NOT NULL
    ORDER BY a.work_date DESC
  LOOP
    -- Calculate clock_in time in minutes (in local timezone)
    v_clock_in_minutes := EXTRACT(HOUR FROM v_record.clock_in_time AT TIME ZONE 'Asia/Bangkok')::INT * 60 
                        + EXTRACT(MINUTE FROM v_record.clock_in_time AT TIME ZONE 'Asia/Bangkok')::INT;
    
    -- Calculate minutes after work start
    v_minutes_after_start := v_clock_in_minutes - v_work_start_minutes;
    
    -- Determine if late (after threshold)
    v_is_late := v_minutes_after_start > v_late_threshold;
    
    -- Calculate late_minutes (subtract threshold)
    IF v_is_late THEN
      v_new_late_minutes := GREATEST(0, v_minutes_after_start - v_late_threshold);
    ELSE
      v_new_late_minutes := 0;
    END IF;
    
    -- Update only if values changed
    IF v_is_late != COALESCE(v_record.is_late, false) 
       OR v_new_late_minutes != COALESCE(v_record.late_minutes, 0) THEN
      
      UPDATE attendance_logs 
      SET is_late = v_is_late,
          late_minutes = v_new_late_minutes
      WHERE id = v_record.id;
      
      v_updated_count := v_updated_count + 1;
      
      RAISE NOTICE '[%] % เช็คอิน %:% → %', 
        v_record.work_date,
        COALESCE(v_record.employee_name, 'Unknown'),
        LPAD((v_clock_in_minutes / 60)::TEXT, 2, '0'),
        LPAD((v_clock_in_minutes % 60)::TEXT, 2, '0'),
        CASE 
          WHEN v_is_late THEN 'สาย ' || v_new_late_minutes || ' นาที'
          ELSE 'ปกติ'
        END;
    END IF;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'อัปเดตทั้งหมด % records', v_updated_count;
  RAISE NOTICE '========================================';
END $$;

-- Verify results - show recent attendance
SELECT 
  a.work_date as วันที่,
  e.name as ชื่อ,
  TO_CHAR(a.clock_in_time AT TIME ZONE 'Asia/Bangkok', 'HH24:MI') as เช็คอิน,
  CASE WHEN a.is_late THEN '⚠️ สาย' ELSE '✅ ปกติ' END as สถานะ,
  a.late_minutes as นาทีสาย
FROM attendance_logs a
LEFT JOIN employees e ON e.id = a.employee_id
WHERE a.work_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY a.work_date DESC, a.clock_in_time DESC;
