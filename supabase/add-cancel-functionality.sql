-- Add Cancel functionality to all request tables
-- This allows admins to cancel approved requests with audit trail

-- ==========================================
-- 1. Add 'cancelled' status to all request tables
-- ==========================================

-- OT Requests
ALTER TABLE ot_requests DROP CONSTRAINT IF EXISTS ot_requests_status_check;
ALTER TABLE ot_requests ADD CONSTRAINT ot_requests_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled'));

-- Leave Requests
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_status_check;
ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));

-- WFH Requests
ALTER TABLE wfh_requests DROP CONSTRAINT IF EXISTS wfh_requests_status_check;
ALTER TABLE wfh_requests ADD CONSTRAINT wfh_requests_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));

-- Late Requests (already has 'cancelled', just ensure it's there)
ALTER TABLE late_requests DROP CONSTRAINT IF EXISTS late_requests_status_check;
ALTER TABLE late_requests ADD CONSTRAINT late_requests_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));

-- Field Work Requests (already has 'cancelled', just ensure it's there)
ALTER TABLE field_work_requests DROP CONSTRAINT IF EXISTS field_work_requests_status_check;
ALTER TABLE field_work_requests ADD CONSTRAINT field_work_requests_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));

-- ==========================================
-- 2. Add cancel audit fields to all request tables
-- ==========================================

-- OT Requests
ALTER TABLE ot_requests 
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- Leave Requests
ALTER TABLE leave_requests 
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- WFH Requests
ALTER TABLE wfh_requests 
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- Late Requests (check if already exists)
ALTER TABLE late_requests 
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- Field Work Requests (check if already exists)
ALTER TABLE field_work_requests 
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- ==========================================
-- 3. Add comments for documentation
-- ==========================================

COMMENT ON COLUMN ot_requests.cancelled_by IS 'Admin who cancelled the approved request';
COMMENT ON COLUMN ot_requests.cancelled_at IS 'Timestamp when request was cancelled';
COMMENT ON COLUMN ot_requests.cancel_reason IS 'Reason for cancelling the approved request';

COMMENT ON COLUMN leave_requests.cancelled_by IS 'Admin who cancelled the approved request';
COMMENT ON COLUMN leave_requests.cancelled_at IS 'Timestamp when request was cancelled';
COMMENT ON COLUMN leave_requests.cancel_reason IS 'Reason for cancelling the approved request';

COMMENT ON COLUMN wfh_requests.cancelled_by IS 'Admin who cancelled the approved request';
COMMENT ON COLUMN wfh_requests.cancelled_at IS 'Timestamp when request was cancelled';
COMMENT ON COLUMN wfh_requests.cancel_reason IS 'Reason for cancelling the approved request';

COMMENT ON COLUMN late_requests.cancelled_by IS 'Admin who cancelled the approved request';
COMMENT ON COLUMN late_requests.cancelled_at IS 'Timestamp when request was cancelled';
COMMENT ON COLUMN late_requests.cancel_reason IS 'Reason for cancelling the approved request';

COMMENT ON COLUMN field_work_requests.cancelled_by IS 'Admin who cancelled the approved request';
COMMENT ON COLUMN field_work_requests.cancelled_at IS 'Timestamp when request was cancelled';
COMMENT ON COLUMN field_work_requests.cancel_reason IS 'Reason for cancelling the approved request';

-- ==========================================
-- 4. Create indexes for better performance
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_ot_requests_cancelled_by ON ot_requests(cancelled_by);
CREATE INDEX IF NOT EXISTS idx_leave_requests_cancelled_by ON leave_requests(cancelled_by);
CREATE INDEX IF NOT EXISTS idx_wfh_requests_cancelled_by ON wfh_requests(cancelled_by);
CREATE INDEX IF NOT EXISTS idx_late_requests_cancelled_by ON late_requests(cancelled_by);
CREATE INDEX IF NOT EXISTS idx_field_work_requests_cancelled_by ON field_work_requests(cancelled_by);

-- ==========================================
-- Done! Cancel functionality added
-- ==========================================

SELECT 'Cancel functionality added to all request tables!' as status;

-- Verify the changes
SELECT 
  'ot_requests' as table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'ot_requests' 
  AND column_name IN ('cancelled_by', 'cancelled_at', 'cancel_reason')
UNION ALL
SELECT 
  'leave_requests' as table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'leave_requests' 
  AND column_name IN ('cancelled_by', 'cancelled_at', 'cancel_reason')
UNION ALL
SELECT 
  'wfh_requests' as table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'wfh_requests' 
  AND column_name IN ('cancelled_by', 'cancelled_at', 'cancel_reason');

