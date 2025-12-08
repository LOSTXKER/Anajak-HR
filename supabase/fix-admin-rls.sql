-- Fix RLS Policies สำหรับให้ Admin และ Supervisor ดูข้อมูลทั้งหมดได้
-- รันใน Supabase SQL Editor

-- =============================================
-- DROP EXISTING POLICIES
-- =============================================

-- Employees
DROP POLICY IF EXISTS "Allow users to read their own employee data" ON employees;
DROP POLICY IF EXISTS "Allow service role to manage employees" ON employees;
DROP POLICY IF EXISTS "Employees can view their own data" ON employees;
DROP POLICY IF EXISTS "Admins can view all employees" ON employees;
DROP POLICY IF EXISTS "All authenticated users can read employees" ON employees;

-- Attendance Logs
DROP POLICY IF EXISTS "Allow users to read their own attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Allow users to insert their own attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Allow users to update their own attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Allow service role to manage attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Employees can view their own attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Employees can insert their own attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Employees can update their own attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Admins can view all attendance" ON attendance_logs;
DROP POLICY IF EXISTS "All authenticated users can read attendance" ON attendance_logs;

-- OT Requests
DROP POLICY IF EXISTS "Allow users to read their own OT requests" ON ot_requests;
DROP POLICY IF EXISTS "Allow users to create their own OT requests" ON ot_requests;
DROP POLICY IF EXISTS "Allow users to update their own OT requests" ON ot_requests;
DROP POLICY IF EXISTS "Allow service role to manage OT requests" ON ot_requests;
DROP POLICY IF EXISTS "Employees can view their own OT requests" ON ot_requests;
DROP POLICY IF EXISTS "Employees can create their own OT requests" ON ot_requests;
DROP POLICY IF EXISTS "Supervisors and admins can update OT requests" ON ot_requests;
DROP POLICY IF EXISTS "Admins can view all OT requests" ON ot_requests;

-- Leave Requests
DROP POLICY IF EXISTS "Employees can view their own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Employees can create their own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Supervisors and admins can update leave requests" ON leave_requests;

-- WFH Requests
DROP POLICY IF EXISTS "Employees can view their own WFH requests" ON wfh_requests;
DROP POLICY IF EXISTS "Employees can create their own WFH requests" ON wfh_requests;
DROP POLICY IF EXISTS "Supervisors and admins can update WFH requests" ON wfh_requests;

-- =============================================
-- EMPLOYEES TABLE
-- =============================================
CREATE POLICY "All authenticated users can read employees"
  ON employees FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own employee data"
  ON employees FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage all employees"
  ON employees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- ATTENDANCE LOGS TABLE
-- =============================================
CREATE POLICY "All authenticated users can read attendance"
  ON attendance_logs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own attendance"
  ON attendance_logs FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Users can update their own attendance"
  ON attendance_logs FOR UPDATE
  USING (
    auth.uid() = employee_id OR
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

-- =============================================
-- OT REQUESTS TABLE
-- =============================================
CREATE POLICY "All authenticated users can read OT requests"
  ON ot_requests FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own OT requests"
  ON ot_requests FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Users and admins can update OT requests"
  ON ot_requests FOR UPDATE
  USING (
    auth.uid() = employee_id OR
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

-- =============================================
-- LEAVE REQUESTS TABLE
-- =============================================
CREATE POLICY "All authenticated users can read leave requests"
  ON leave_requests FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own leave requests"
  ON leave_requests FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Users and admins can update leave requests"
  ON leave_requests FOR UPDATE
  USING (
    auth.uid() = employee_id OR
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

-- =============================================
-- WFH REQUESTS TABLE
-- =============================================
CREATE POLICY "All authenticated users can read WFH requests"
  ON wfh_requests FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own WFH requests"
  ON wfh_requests FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Users and admins can update WFH requests"
  ON wfh_requests FOR UPDATE
  USING (
    auth.uid() = employee_id OR
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

-- =============================================
-- BRANCHES TABLE
-- =============================================
DROP POLICY IF EXISTS "Allow anyone to read branches" ON branches;
DROP POLICY IF EXISTS "Allow service role to manage branches" ON branches;
DROP POLICY IF EXISTS "Anyone can view branches" ON branches;
DROP POLICY IF EXISTS "Admins can manage branches" ON branches;

CREATE POLICY "All authenticated users can read branches"
  ON branches FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage branches"
  ON branches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- HOLIDAYS TABLE
-- =============================================
DROP POLICY IF EXISTS "Allow anyone to read holidays" ON holidays;
DROP POLICY IF EXISTS "Allow service role to manage holidays" ON holidays;
DROP POLICY IF EXISTS "Anyone can view holidays" ON holidays;
DROP POLICY IF EXISTS "Admins can manage holidays" ON holidays;

CREATE POLICY "All authenticated users can read holidays"
  ON holidays FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage holidays"
  ON holidays FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- VERIFY
-- =============================================
SELECT 'RLS Policies for Admin updated successfully!' as message;
