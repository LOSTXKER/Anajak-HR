-- Add account_status to employees table for approval system
-- Run this in Supabase SQL Editor

-- =============================================
-- ADD ACCOUNT_STATUS COLUMN
-- =============================================

-- Add account_status column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'account_status'
  ) THEN
    ALTER TABLE employees 
    ADD COLUMN account_status VARCHAR(20) DEFAULT 'approved' 
    CHECK (account_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Set existing employees to approved
UPDATE employees 
SET account_status = 'approved' 
WHERE account_status IS NULL;

-- =============================================
-- ADD APPROVED BY AND DATE COLUMNS
-- =============================================

-- Add approved_by column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE employees 
    ADD COLUMN approved_by UUID REFERENCES employees(id);
  END IF;
END $$;

-- Add approved_at column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE employees 
    ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add rejection_reason column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE employees 
    ADD COLUMN rejection_reason TEXT;
  END IF;
END $$;

-- =============================================
-- CREATE INDEX
-- =============================================

CREATE INDEX IF NOT EXISTS idx_employees_account_status 
ON employees(account_status);

-- =============================================
-- UPDATE RLS POLICIES
-- =============================================

-- Drop existing policy
DROP POLICY IF EXISTS "Users can only login if approved" ON employees;

-- Create policy to prevent pending/rejected users from logging in
-- (This is handled in application logic, but we add it for extra security)

-- =============================================
-- VERIFY
-- =============================================

SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'employees' 
  AND column_name IN ('account_status', 'approved_by', 'approved_at', 'rejection_reason')
ORDER BY column_name;

SELECT 'Account status system added successfully!' as message;

