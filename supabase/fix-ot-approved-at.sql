-- Fix: Add approved_at column to ot_requests table
-- This column was missing from the original migration

-- Add approved_at to ot_requests
ALTER TABLE ot_requests
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Add comment
COMMENT ON COLUMN ot_requests.approved_at IS 'Timestamp when OT request was approved/rejected';

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ot_requests' AND column_name = 'approved_at';

