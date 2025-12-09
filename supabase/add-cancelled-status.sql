-- Add 'cancelled' status to ot_requests and leave_requests
-- Run this in Supabase SQL Editor

-- =============================================
-- OT REQUESTS - Add cancelled status
-- =============================================

-- Drop the existing check constraint
ALTER TABLE ot_requests DROP CONSTRAINT IF EXISTS ot_requests_status_check;

-- Add new check constraint with 'cancelled' included
ALTER TABLE ot_requests ADD CONSTRAINT ot_requests_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled'));

-- =============================================
-- LEAVE REQUESTS - Add cancelled status  
-- =============================================

-- Drop the existing check constraint
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_status_check;

-- Add new check constraint with 'cancelled' included
ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));

-- =============================================
-- WFH REQUESTS - Add cancelled status (if exists)
-- =============================================

-- Drop the existing check constraint
ALTER TABLE wfh_requests DROP CONSTRAINT IF EXISTS wfh_requests_status_check;

-- Add new check constraint with 'cancelled' included
ALTER TABLE wfh_requests ADD CONSTRAINT wfh_requests_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));

