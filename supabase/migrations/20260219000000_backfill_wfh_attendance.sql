-- ============================================================
-- Backfill attendance_logs for approved WFH requests
-- that have no existing attendance record.
--
-- Uses work_start_time / work_end_time from system_settings
-- (defaults: 09:00 / 18:00 Bangkok time → UTC+7)
-- ============================================================

DO $$
DECLARE
  v_work_start TEXT;
  v_work_end   TEXT;
  v_start_hour INT;
  v_start_min  INT;
  v_end_hour   INT;
  v_end_min    INT;
  v_total_hours NUMERIC;
  rec RECORD;
BEGIN
  -- ดึงเวลาเริ่มงาน / เลิกงาน จาก system_settings
  SELECT setting_value INTO v_work_start
    FROM system_settings WHERE setting_key = 'work_start_time';
  SELECT setting_value INTO v_work_end
    FROM system_settings WHERE setting_key = 'work_end_time';

  -- ค่า default ถ้าไม่มีใน settings
  v_work_start := COALESCE(v_work_start, '09:00');
  v_work_end   := COALESCE(v_work_end,   '18:00');

  v_start_hour := SPLIT_PART(v_work_start, ':', 1)::INT;
  v_start_min  := SPLIT_PART(v_work_start, ':', 2)::INT;
  v_end_hour   := SPLIT_PART(v_work_end,   ':', 1)::INT;
  v_end_min    := SPLIT_PART(v_work_end,   ':', 2)::INT;

  -- คำนวณชั่วโมงทำงาน
  v_total_hours := (v_end_hour * 60 + v_end_min - v_start_hour * 60 - v_start_min)::NUMERIC / 60;

  -- วนรอบ approved WFH requests ที่ยังไม่มี attendance_log
  FOR rec IN
    SELECT
      w.id          AS wfh_id,
      w.employee_id,
      w.date        AS work_date
    FROM wfh_requests w
    LEFT JOIN attendance_logs a
      ON a.employee_id = w.employee_id
     AND a.work_date   = w.date
    WHERE w.status = 'approved'
      AND a.id IS NULL
    ORDER BY w.date
  LOOP
    INSERT INTO attendance_logs (
      employee_id,
      work_date,
      clock_in_time,
      clock_out_time,
      total_hours,
      is_late,
      late_minutes,
      work_mode,
      status,
      note
    ) VALUES (
      rec.employee_id,
      rec.work_date,
      -- clock_in: วันที่ WFH + work_start_time (Asia/Bangkok → UTC)
      (rec.work_date::TIMESTAMP + MAKE_INTERVAL(hours => v_start_hour, mins => v_start_min)) AT TIME ZONE 'Asia/Bangkok',
      -- clock_out: วันที่ WFH + work_end_time (Asia/Bangkok → UTC)
      (rec.work_date::TIMESTAMP + MAKE_INTERVAL(hours => v_end_hour,   mins => v_end_min))   AT TIME ZONE 'Asia/Bangkok',
      v_total_hours,
      FALSE,
      0,
      'wfh',
      'present',
      'บันทึกย้อนหลัง WFH (auto-backfill)'
    )
    ON CONFLICT (employee_id, work_date) DO NOTHING;

    RAISE NOTICE 'Backfilled WFH attendance for employee % on %', rec.employee_id, rec.work_date;
  END LOOP;

  RAISE NOTICE 'WFH attendance backfill completed.';
END;
$$;
