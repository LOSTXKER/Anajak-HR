-- Add soft delete columns to employees table
-- This allows marking employees as deleted without losing historical data

-- Add deleted_at column (timestamp when employee was soft deleted)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_by column (who deleted the employee)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES employees(id) ON DELETE SET NULL;

-- Add index for filtering active employees efficiently
CREATE INDEX IF NOT EXISTS idx_employees_deleted_at ON employees(deleted_at) WHERE deleted_at IS NULL;

-- Update RLS policies to exclude deleted employees from normal queries
-- Note: Admins can still see deleted employees when needed

-- Comment: To restore a deleted employee, simply set deleted_at and deleted_by to NULL
-- UPDATE employees SET deleted_at = NULL, deleted_by = NULL WHERE id = 'employee-uuid';
