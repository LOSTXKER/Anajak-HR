-- Migration: Add Leave Quota/Balance System
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. ADD LEAVE QUOTA COLUMNS TO employees
-- =====================================================
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS annual_leave_quota INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS sick_leave_quota INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS personal_leave_quota INTEGER DEFAULT 3;

COMMENT ON COLUMN employees.annual_leave_quota IS 'วันลาพักร้อนที่มีสิทธิ์ต่อปี';
COMMENT ON COLUMN employees.sick_leave_quota IS 'วันลาป่วยที่มีสิทธิ์ต่อปี';
COMMENT ON COLUMN employees.personal_leave_quota IS 'วันลากิจที่มีสิทธิ์ต่อปี';

-- =====================================================
-- 2. CREATE leave_balances TABLE (for tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) NOT NULL,
  year INTEGER NOT NULL,
  
  -- Quotas (from employees table, cached here for history)
  annual_leave_quota INTEGER DEFAULT 10,
  sick_leave_quota INTEGER DEFAULT 30,
  personal_leave_quota INTEGER DEFAULT 3,
  
  -- Used days (calculated from leave_requests)
  annual_leave_used DECIMAL(5, 2) DEFAULT 0,
  sick_leave_used DECIMAL(5, 2) DEFAULT 0,
  personal_leave_used DECIMAL(5, 2) DEFAULT 0,
  
  -- Remaining days (calculated)
  annual_leave_remaining DECIMAL(5, 2) DEFAULT 10,
  sick_leave_remaining DECIMAL(5, 2) DEFAULT 30,
  personal_leave_remaining DECIMAL(5, 2) DEFAULT 3,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(employee_id, year)
);

CREATE INDEX IF NOT EXISTS idx_leave_balances_employee ON leave_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_year ON leave_balances(year);

-- =====================================================
-- 3. CREATE FUNCTION to calculate leave balance
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_leave_balance(
  p_employee_id UUID,
  p_year INTEGER,
  p_leave_type VARCHAR(50)
) RETURNS DECIMAL(5, 2) AS $$
DECLARE
  v_used DECIMAL(5, 2);
  v_quota INTEGER;
BEGIN
  -- Get quota from employees table
  SELECT 
    CASE 
      WHEN p_leave_type = 'annual' THEN annual_leave_quota
      WHEN p_leave_type = 'sick' THEN sick_leave_quota
      WHEN p_leave_type = 'personal' THEN personal_leave_quota
      ELSE 0
    END
  INTO v_quota
  FROM employees
  WHERE id = p_employee_id;
  
  -- Calculate used days
  SELECT COALESCE(SUM(
    CASE 
      WHEN is_half_day THEN 0.5
      ELSE EXTRACT(DAY FROM (end_date - start_date)) + 1
    END
  ), 0)
  INTO v_used
  FROM leave_requests
  WHERE employee_id = p_employee_id
    AND leave_type = p_leave_type
    AND status = 'approved'
    AND EXTRACT(YEAR FROM start_date) = p_year;
  
  RETURN GREATEST(0, v_quota - v_used);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. CREATE FUNCTION to update leave balances
-- =====================================================
CREATE OR REPLACE FUNCTION update_leave_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if status changed to approved or cancelled
  IF (NEW.status = 'approved' AND OLD.status != 'approved') 
     OR (NEW.status != 'approved' AND OLD.status = 'approved') THEN
    
    -- Update or insert leave balance for this year
    INSERT INTO leave_balances (
      employee_id,
      year,
      annual_leave_quota,
      sick_leave_quota,
      personal_leave_quota
    )
    SELECT 
      NEW.employee_id,
      EXTRACT(YEAR FROM NEW.start_date)::INTEGER,
      e.annual_leave_quota,
      e.sick_leave_quota,
      e.personal_leave_quota
    FROM employees e
    WHERE e.id = NEW.employee_id
    ON CONFLICT (employee_id, year) DO UPDATE SET
      annual_leave_quota = EXCLUDED.annual_leave_quota,
      sick_leave_quota = EXCLUDED.sick_leave_quota,
      personal_leave_quota = EXCLUDED.personal_leave_quota;
    
    -- Recalculate used and remaining days
    UPDATE leave_balances
    SET
      annual_leave_used = (
        SELECT COALESCE(SUM(
          CASE WHEN is_half_day THEN 0.5
          ELSE EXTRACT(DAY FROM (end_date - start_date)) + 1 END
        ), 0)
        FROM leave_requests
        WHERE employee_id = NEW.employee_id
          AND leave_type = 'annual'
          AND status = 'approved'
          AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM NEW.start_date)
      ),
      sick_leave_used = (
        SELECT COALESCE(SUM(
          CASE WHEN is_half_day THEN 0.5
          ELSE EXTRACT(DAY FROM (end_date - start_date)) + 1 END
        ), 0)
        FROM leave_requests
        WHERE employee_id = NEW.employee_id
          AND leave_type = 'sick'
          AND status = 'approved'
          AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM NEW.start_date)
      ),
      personal_leave_used = (
        SELECT COALESCE(SUM(
          CASE WHEN is_half_day THEN 0.5
          ELSE EXTRACT(DAY FROM (end_date - start_date)) + 1 END
        ), 0)
        FROM leave_requests
        WHERE employee_id = NEW.employee_id
          AND leave_type = 'personal'
          AND status = 'approved'
          AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM NEW.start_date)
      ),
      updated_at = NOW()
    WHERE employee_id = NEW.employee_id
      AND year = EXTRACT(YEAR FROM NEW.start_date)::INTEGER;
    
    -- Update remaining days
    UPDATE leave_balances
    SET
      annual_leave_remaining = annual_leave_quota - annual_leave_used,
      sick_leave_remaining = sick_leave_quota - sick_leave_used,
      personal_leave_remaining = personal_leave_quota - personal_leave_used
    WHERE employee_id = NEW.employee_id
      AND year = EXTRACT(YEAR FROM NEW.start_date)::INTEGER;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. CREATE TRIGGER for leave_requests
-- =====================================================
DROP TRIGGER IF EXISTS trigger_update_leave_balance ON leave_requests;
CREATE TRIGGER trigger_update_leave_balance
  AFTER INSERT OR UPDATE OF status ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_leave_balance();

-- =====================================================
-- 6. Initialize balances for current year
-- =====================================================
INSERT INTO leave_balances (
  employee_id,
  year,
  annual_leave_quota,
  sick_leave_quota,
  personal_leave_quota
)
SELECT 
  e.id,
  EXTRACT(YEAR FROM NOW())::INTEGER,
  e.annual_leave_quota,
  e.sick_leave_quota,
  e.personal_leave_quota
FROM employees e
WHERE e.account_status = 'approved'
ON CONFLICT (employee_id, year) DO NOTHING;

-- Update used days for current year
UPDATE leave_balances lb
SET
  annual_leave_used = (
    SELECT COALESCE(SUM(
      CASE WHEN is_half_day THEN 0.5
      ELSE EXTRACT(DAY FROM (end_date - start_date)) + 1 END
    ), 0)
    FROM leave_requests
    WHERE employee_id = lb.employee_id
      AND leave_type = 'annual'
      AND status = 'approved'
      AND EXTRACT(YEAR FROM start_date) = lb.year
  ),
  sick_leave_used = (
    SELECT COALESCE(SUM(
      CASE WHEN is_half_day THEN 0.5
      ELSE EXTRACT(DAY FROM (end_date - start_date)) + 1 END
    ), 0)
    FROM leave_requests
    WHERE employee_id = lb.employee_id
      AND leave_type = 'sick'
      AND status = 'approved'
      AND EXTRACT(YEAR FROM start_date) = lb.year
  ),
  personal_leave_used = (
    SELECT COALESCE(SUM(
      CASE WHEN is_half_day THEN 0.5
      ELSE EXTRACT(DAY FROM (end_date - start_date)) + 1 END
    ), 0)
    FROM leave_requests
    WHERE employee_id = lb.employee_id
      AND leave_type = 'personal'
      AND status = 'approved'
      AND EXTRACT(YEAR FROM start_date) = lb.year
  )
WHERE lb.year = EXTRACT(YEAR FROM NOW())::INTEGER;

-- Update remaining
UPDATE leave_balances
SET
  annual_leave_remaining = annual_leave_quota - annual_leave_used,
  sick_leave_remaining = sick_leave_quota - sick_leave_used,
  personal_leave_remaining = personal_leave_quota - personal_leave_used
WHERE year = EXTRACT(YEAR FROM NOW())::INTEGER;

-- =====================================================
-- 7. Enable RLS on leave_balances
-- =====================================================
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

-- Employees can view their own balance
CREATE POLICY "leave_balances_select_own" ON leave_balances FOR SELECT TO authenticated 
USING (employee_id = auth.uid() OR EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('admin', 'supervisor')));

-- Only system/admin can modify
CREATE POLICY "leave_balances_admin" ON leave_balances FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- 8. Add trigger for updated_at
-- =====================================================
DROP TRIGGER IF EXISTS update_leave_balances_updated_at ON leave_balances;
CREATE TRIGGER update_leave_balances_updated_at BEFORE UPDATE ON leave_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Done!
-- =====================================================
SELECT 'Leave Quota System migration completed!' as message;

