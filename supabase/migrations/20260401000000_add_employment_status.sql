-- Add employment status and resignation fields to employees table
-- Replaces the soft-delete-only approach with a proper resignation/termination workflow

-- Add employment_status column
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS employment_status VARCHAR(20) DEFAULT 'active'
  CHECK (employment_status IN ('active', 'resigned', 'terminated'));

-- Add resignation detail columns
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS resignation_date DATE DEFAULT NULL;

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS last_working_date DATE DEFAULT NULL;

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS resignation_reason TEXT DEFAULT NULL;

-- Index for filtering by employment status
CREATE INDEX IF NOT EXISTS idx_employees_employment_status
  ON employees(employment_status);

-- Create employment_history table to track hire/resign/rehire events
CREATE TABLE IF NOT EXISTS employment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('hired', 'resigned', 'terminated', 'rehired')),
  effective_date DATE NOT NULL,
  reason TEXT,
  performed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employment_history_employee
  ON employment_history(employee_id);

CREATE INDEX IF NOT EXISTS idx_employment_history_created
  ON employment_history(created_at DESC);

-- Enable RLS on employment_history
ALTER TABLE employment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY employment_history_select ON employment_history
  FOR SELECT USING (true);

CREATE POLICY employment_history_insert ON employment_history
  FOR INSERT WITH CHECK (true);

-- Backfill: set employment_status based on existing deleted_at
UPDATE employees
SET employment_status = 'resigned'
WHERE deleted_at IS NOT NULL AND employment_status IS NULL OR employment_status = 'active';

UPDATE employees
SET employment_status = 'active'
WHERE deleted_at IS NULL AND (employment_status IS NULL);
