-- Add commission and is_system_account columns to employees table
-- Run this in Supabase SQL Editor

-- Add commission column (monthly bonus/commission)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS commission DECIMAL(12,2) DEFAULT 0;

-- Add is_system_account column (to mark non-employee accounts like admin/system)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS is_system_account BOOLEAN DEFAULT false;

-- Comments
COMMENT ON COLUMN employees.commission IS 'Monthly commission/bonus in THB';
COMMENT ON COLUMN employees.is_system_account IS 'If true, this is a system account (not a real employee) - hidden from reports and payroll';

-- Example: Set specific accounts as system accounts
-- UPDATE employees SET is_system_account = true WHERE email = 'admin@example.com';

