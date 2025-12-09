-- Add base_salary column to employees table
-- Run this in Supabase SQL Editor

-- Add base_salary column if not exists
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS base_salary DECIMAL(12,2) DEFAULT 0;

-- Update existing employees with default salary (optional)
-- UPDATE employees SET base_salary = 15000 WHERE base_salary = 0;

-- Comment
COMMENT ON COLUMN employees.base_salary IS 'Monthly base salary in THB';

