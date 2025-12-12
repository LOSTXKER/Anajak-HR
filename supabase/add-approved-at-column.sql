-- Add approved_at column to all request tables
-- Run this in Supabase SQL Editor

-- Add approved_at to leave_requests
ALTER TABLE leave_requests 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Add approved_at to wfh_requests
ALTER TABLE wfh_requests 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Add approved_at to late_requests
ALTER TABLE late_requests 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Add approved_at to field_work_requests (if table exists)
ALTER TABLE field_work_requests 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Add comments
COMMENT ON COLUMN leave_requests.approved_at IS 'Timestamp when request was approved/rejected';
COMMENT ON COLUMN wfh_requests.approved_at IS 'Timestamp when request was approved/rejected';
COMMENT ON COLUMN late_requests.approved_at IS 'Timestamp when request was approved/rejected';
COMMENT ON COLUMN field_work_requests.approved_at IS 'Timestamp when request was approved/rejected';

-- Note: approved_at will be NULL for pending requests

