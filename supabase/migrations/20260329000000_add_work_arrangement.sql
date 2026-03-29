ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS work_arrangement VARCHAR(20) DEFAULT 'onsite'
  CHECK (work_arrangement IN ('onsite', 'wfh', 'hybrid'));
