-- Add missing indexes for commonly queried columns

-- leave_requests
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests (employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests (status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_approved_by ON leave_requests (approved_by);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests (start_date, end_date);

-- wfh_requests
CREATE INDEX IF NOT EXISTS idx_wfh_requests_employee ON wfh_requests (employee_id);
CREATE INDEX IF NOT EXISTS idx_wfh_requests_status ON wfh_requests (status);
CREATE INDEX IF NOT EXISTS idx_wfh_requests_approved_by ON wfh_requests (approved_by);
CREATE INDEX IF NOT EXISTS idx_wfh_requests_date ON wfh_requests (date);

-- Drop duplicate unique constraint on attendance_logs if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attendance_logs_employee_id_work_date_key'
    AND conrelid = 'attendance_logs'::regclass
  ) THEN
    ALTER TABLE attendance_logs DROP CONSTRAINT attendance_logs_employee_id_work_date_key;
  END IF;
END $$;
