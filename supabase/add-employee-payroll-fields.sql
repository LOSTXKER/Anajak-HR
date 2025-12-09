-- Add commission and exclude_from_payroll columns to employees table
-- Run this in Supabase SQL Editor

-- Add commission column (monthly bonus/commission)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS commission DECIMAL(12,2) DEFAULT 0;

-- Add exclude_from_payroll column (to exclude certain accounts from payroll calculation)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS exclude_from_payroll BOOLEAN DEFAULT false;

-- Comments
COMMENT ON COLUMN employees.commission IS 'Monthly commission/bonus in THB';
COMMENT ON COLUMN employees.exclude_from_payroll IS 'If true, employee will be excluded from payroll calculations';

-- Example: Set admin accounts to be excluded from payroll
-- UPDATE employees SET exclude_from_payroll = true WHERE role = 'admin';

