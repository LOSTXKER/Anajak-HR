-- Migration: Add salary_history table
-- Tracks historical salary changes so payroll can use the correct salary for each period

-- Create salary_history table
CREATE TABLE IF NOT EXISTS salary_history (
  id            UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id   UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  base_salary   DECIMAL(12, 2) NOT NULL DEFAULT 0,
  commission    DECIMAL(12, 2) NOT NULL DEFAULT 0,
  effective_date DATE       NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by employee + date
CREATE INDEX IF NOT EXISTS idx_salary_history_employee_date
  ON salary_history (employee_id, effective_date DESC);

-- Seed baseline records from current employees.base_salary
-- effective_date = '2000-01-01' so that all historical payroll months use this as fallback
INSERT INTO salary_history (employee_id, base_salary, commission, effective_date)
SELECT
  id,
  COALESCE(base_salary, 0),
  COALESCE(commission, 0),
  '2000-01-01'::DATE
FROM employees
WHERE deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- Enable RLS (match pattern of other tables)
ALTER TABLE salary_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read salary_history
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'salary_history_select' AND tablename = 'salary_history') THEN
    CREATE POLICY "salary_history_select" ON salary_history FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'salary_history_insert' AND tablename = 'salary_history') THEN
    CREATE POLICY "salary_history_insert" ON salary_history FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;
