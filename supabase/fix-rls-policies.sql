-- Fix RLS Policies for Employee Access
-- Run this in Supabase SQL Editor
-- Note: employees.id = auth.uid() (not user_id)

-- =====================================================
-- 1. SYSTEM_SETTINGS - Allow all authenticated to read
-- =====================================================
DROP POLICY IF EXISTS "Allow read system_settings" ON system_settings;
CREATE POLICY "Allow read system_settings" 
ON system_settings 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow admin to manage
DROP POLICY IF EXISTS "Allow admin to manage system_settings" ON system_settings;
CREATE POLICY "Allow admin to manage system_settings" 
ON system_settings 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE employees.id::text = auth.uid()::text 
    AND employees.role IN ('admin', 'superadmin')
  )
);

-- =====================================================
-- 2. HOLIDAYS - Allow all authenticated to read
-- =====================================================
DROP POLICY IF EXISTS "Allow read holidays" ON holidays;
CREATE POLICY "Allow read holidays" 
ON holidays 
FOR SELECT 
TO authenticated 
USING (true);

-- =====================================================
-- 3. BRANCHES - Allow all authenticated to read
-- =====================================================
DROP POLICY IF EXISTS "Allow read branches" ON branches;
CREATE POLICY "Allow read branches" 
ON branches 
FOR SELECT 
TO authenticated 
USING (true);

-- =====================================================
-- 4. ATTENDANCE_LOGS - Employee can read/write own records
-- =====================================================
-- Read own records
DROP POLICY IF EXISTS "Employee can read own attendance" ON attendance_logs;
CREATE POLICY "Employee can read own attendance" 
ON attendance_logs 
FOR SELECT 
TO authenticated 
USING (
  employee_id::text = auth.uid()::text
);

-- Insert own records (check-in)
DROP POLICY IF EXISTS "Employee can insert own attendance" ON attendance_logs;
CREATE POLICY "Employee can insert own attendance" 
ON attendance_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (
  employee_id::text = auth.uid()::text
);

-- Update own records (check-out)
DROP POLICY IF EXISTS "Employee can update own attendance" ON attendance_logs;
CREATE POLICY "Employee can update own attendance" 
ON attendance_logs 
FOR UPDATE 
TO authenticated 
USING (
  employee_id::text = auth.uid()::text
);

-- Admin can manage all
DROP POLICY IF EXISTS "Admin can manage all attendance" ON attendance_logs;
CREATE POLICY "Admin can manage all attendance" 
ON attendance_logs 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE employees.id::text = auth.uid()::text 
    AND employees.role IN ('admin', 'superadmin')
  )
);

-- =====================================================
-- 5. ATTENDANCE_ANOMALIES - Employee can insert, Admin can manage
-- =====================================================
DROP POLICY IF EXISTS "Employee can insert anomalies" ON attendance_anomalies;
CREATE POLICY "Employee can insert anomalies" 
ON attendance_anomalies 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can manage anomalies" ON attendance_anomalies;
CREATE POLICY "Admin can manage anomalies" 
ON attendance_anomalies 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE employees.id::text = auth.uid()::text 
    AND employees.role IN ('admin', 'superadmin')
  )
);

-- =====================================================
-- 6. OT_REQUESTS - Employee can manage own, Admin can manage all
-- =====================================================
DROP POLICY IF EXISTS "Employee can read own OT requests" ON ot_requests;
CREATE POLICY "Employee can read own OT requests" 
ON ot_requests 
FOR SELECT 
TO authenticated 
USING (
  employee_id::text = auth.uid()::text
);

DROP POLICY IF EXISTS "Employee can insert own OT requests" ON ot_requests;
CREATE POLICY "Employee can insert own OT requests" 
ON ot_requests 
FOR INSERT 
TO authenticated 
WITH CHECK (
  employee_id::text = auth.uid()::text
);

DROP POLICY IF EXISTS "Employee can update own OT requests" ON ot_requests;
CREATE POLICY "Employee can update own OT requests" 
ON ot_requests 
FOR UPDATE 
TO authenticated 
USING (
  employee_id::text = auth.uid()::text
);

DROP POLICY IF EXISTS "Admin can manage all OT requests" ON ot_requests;
CREATE POLICY "Admin can manage all OT requests" 
ON ot_requests 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE employees.id::text = auth.uid()::text 
    AND employees.role IN ('admin', 'superadmin')
  )
);

-- =====================================================
-- 7. LEAVE_REQUESTS - Employee can manage own, Admin can manage all
-- =====================================================
DROP POLICY IF EXISTS "Employee can read own leave requests" ON leave_requests;
CREATE POLICY "Employee can read own leave requests" 
ON leave_requests 
FOR SELECT 
TO authenticated 
USING (
  employee_id::text = auth.uid()::text
);

DROP POLICY IF EXISTS "Employee can insert own leave requests" ON leave_requests;
CREATE POLICY "Employee can insert own leave requests" 
ON leave_requests 
FOR INSERT 
TO authenticated 
WITH CHECK (
  employee_id::text = auth.uid()::text
);

DROP POLICY IF EXISTS "Employee can update own leave requests" ON leave_requests;
CREATE POLICY "Employee can update own leave requests" 
ON leave_requests 
FOR UPDATE 
TO authenticated 
USING (
  employee_id::text = auth.uid()::text
);

DROP POLICY IF EXISTS "Admin can manage all leave requests" ON leave_requests;
CREATE POLICY "Admin can manage all leave requests" 
ON leave_requests 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE employees.id::text = auth.uid()::text 
    AND employees.role IN ('admin', 'superadmin')
  )
);

-- =====================================================
-- 8. WFH_REQUESTS - Employee can manage own, Admin can manage all
-- =====================================================
DROP POLICY IF EXISTS "Employee can read own WFH requests" ON wfh_requests;
CREATE POLICY "Employee can read own WFH requests" 
ON wfh_requests 
FOR SELECT 
TO authenticated 
USING (
  employee_id::text = auth.uid()::text
);

DROP POLICY IF EXISTS "Employee can insert own WFH requests" ON wfh_requests;
CREATE POLICY "Employee can insert own WFH requests" 
ON wfh_requests 
FOR INSERT 
TO authenticated 
WITH CHECK (
  employee_id::text = auth.uid()::text
);

DROP POLICY IF EXISTS "Employee can update own WFH requests" ON wfh_requests;
CREATE POLICY "Employee can update own WFH requests" 
ON wfh_requests 
FOR UPDATE 
TO authenticated 
USING (
  employee_id::text = auth.uid()::text
);

DROP POLICY IF EXISTS "Admin can manage all WFH requests" ON wfh_requests;
CREATE POLICY "Admin can manage all WFH requests" 
ON wfh_requests 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE employees.id::text = auth.uid()::text 
    AND employees.role IN ('admin', 'superadmin')
  )
);

-- =====================================================
-- 9. LATE_REQUESTS - Employee can manage own, Admin can manage all
-- =====================================================
DROP POLICY IF EXISTS "Employee can read own late requests" ON late_requests;
CREATE POLICY "Employee can read own late requests" 
ON late_requests 
FOR SELECT 
TO authenticated 
USING (
  employee_id::text = auth.uid()::text
);

DROP POLICY IF EXISTS "Employee can insert own late requests" ON late_requests;
CREATE POLICY "Employee can insert own late requests" 
ON late_requests 
FOR INSERT 
TO authenticated 
WITH CHECK (
  employee_id::text = auth.uid()::text
);

DROP POLICY IF EXISTS "Employee can update own late requests" ON late_requests;
CREATE POLICY "Employee can update own late requests" 
ON late_requests 
FOR UPDATE 
TO authenticated 
USING (
  employee_id::text = auth.uid()::text
);

DROP POLICY IF EXISTS "Admin can manage all late requests" ON late_requests;
CREATE POLICY "Admin can manage all late requests" 
ON late_requests 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE employees.id::text = auth.uid()::text 
    AND employees.role IN ('admin', 'superadmin')
  )
);

-- =====================================================
-- 10. EMPLOYEES - Read own profile
-- =====================================================
DROP POLICY IF EXISTS "Employee can read own profile" ON employees;
CREATE POLICY "Employee can read own profile" 
ON employees 
FOR SELECT 
TO authenticated 
USING (id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admin can manage all employees" ON employees;
CREATE POLICY "Admin can manage all employees" 
ON employees 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id::text = auth.uid()::text 
    AND e.role IN ('admin', 'superadmin')
  )
);

-- =====================================================
-- Verify policies
-- =====================================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
