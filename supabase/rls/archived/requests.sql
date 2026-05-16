-- =============================================================
-- RLS Policies: ot_requests, leave_requests, wfh_requests,
--               late_requests, field_work_requests
-- Source: fix-cancel-rls.sql + fix-leave-wfh-rls.sql (reconciled Phase A 2026-05-16)
-- Latest version: fix-rls-policies.sql (comprehensive)
-- =============================================================

-- =====================================================
-- OT REQUESTS
-- =====================================================
DROP POLICY IF EXISTS "Employee can read own OT requests" ON ot_requests;
CREATE POLICY "Employee can read own OT requests"
ON ot_requests FOR SELECT TO authenticated
USING (employee_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Employee can insert own OT requests" ON ot_requests;
CREATE POLICY "Employee can insert own OT requests"
ON ot_requests FOR INSERT TO authenticated
WITH CHECK (employee_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Employee can update own OT requests" ON ot_requests;
CREATE POLICY "Employee can update own OT requests"
ON ot_requests FOR UPDATE TO authenticated
USING (employee_id::text = auth.uid()::text)
WITH CHECK (
  auth.uid() = employee_id OR
  EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

DROP POLICY IF EXISTS "Admin can manage all OT requests" ON ot_requests;
CREATE POLICY "Admin can manage all OT requests"
ON ot_requests FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM employees WHERE employees.id::text = auth.uid()::text AND employees.role IN ('admin', 'supervisor'))
);

-- =====================================================
-- LEAVE REQUESTS
-- =====================================================
DROP POLICY IF EXISTS "Employee can read own leave requests" ON leave_requests;
CREATE POLICY "Employee can read own leave requests"
ON leave_requests FOR SELECT TO authenticated
USING (employee_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Employee can insert own leave requests" ON leave_requests;
CREATE POLICY "Employee can insert own leave requests"
ON leave_requests FOR INSERT TO authenticated
WITH CHECK (employee_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Employee can update own leave requests" ON leave_requests;
CREATE POLICY "Employee can update own leave requests"
ON leave_requests FOR UPDATE TO authenticated
USING (employee_id::text = auth.uid()::text)
WITH CHECK (
  auth.uid() = employee_id OR
  EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

DROP POLICY IF EXISTS "Admin can manage all leave requests" ON leave_requests;
CREATE POLICY "Admin can manage all leave requests"
ON leave_requests FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM employees WHERE employees.id::text = auth.uid()::text AND employees.role IN ('admin', 'supervisor'))
);

-- =====================================================
-- WFH REQUESTS
-- =====================================================
DROP POLICY IF EXISTS "Employee can read own WFH requests" ON wfh_requests;
CREATE POLICY "Employee can read own WFH requests"
ON wfh_requests FOR SELECT TO authenticated
USING (employee_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Employee can insert own WFH requests" ON wfh_requests;
CREATE POLICY "Employee can insert own WFH requests"
ON wfh_requests FOR INSERT TO authenticated
WITH CHECK (employee_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Employee can update own WFH requests" ON wfh_requests;
CREATE POLICY "Employee can update own WFH requests"
ON wfh_requests FOR UPDATE TO authenticated
USING (employee_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admin can manage all WFH requests" ON wfh_requests;
CREATE POLICY "Admin can manage all WFH requests"
ON wfh_requests FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM employees WHERE employees.id::text = auth.uid()::text AND employees.role IN ('admin', 'supervisor'))
);

-- =====================================================
-- LATE REQUESTS
-- =====================================================
DROP POLICY IF EXISTS "Employee can read own late requests" ON late_requests;
CREATE POLICY "Employee can read own late requests"
ON late_requests FOR SELECT TO authenticated
USING (employee_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Employee can insert own late requests" ON late_requests;
CREATE POLICY "Employee can insert own late requests"
ON late_requests FOR INSERT TO authenticated
WITH CHECK (employee_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Employee can update own late requests" ON late_requests;
CREATE POLICY "Employee can update own late requests"
ON late_requests FOR UPDATE TO authenticated
USING (employee_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admin can manage all late requests" ON late_requests;
CREATE POLICY "Admin can manage all late requests"
ON late_requests FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM employees WHERE employees.id::text = auth.uid()::text AND employees.role IN ('admin', 'supervisor'))
);

-- =====================================================
-- FIELD WORK REQUESTS
-- =====================================================
DROP POLICY IF EXISTS "Employees can view their own field work requests" ON field_work_requests;
CREATE POLICY "Employees can view their own field work requests"
ON field_work_requests FOR SELECT
USING (
  auth.uid()::text = employee_id::text OR
  EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role IN ('supervisor', 'admin'))
);

DROP POLICY IF EXISTS "Employees can create their own field work requests" ON field_work_requests;
CREATE POLICY "Employees can create their own field work requests"
ON field_work_requests FOR INSERT
WITH CHECK (auth.uid()::text = employee_id::text);

DROP POLICY IF EXISTS "Supervisors and admins can update field work requests" ON field_work_requests;
CREATE POLICY "Supervisors and admins can update field work requests"
ON field_work_requests FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role IN ('supervisor', 'admin'))
);

DROP POLICY IF EXISTS "Employees can cancel their own pending field work requests" ON field_work_requests;
CREATE POLICY "Employees can cancel their own pending field work requests"
ON field_work_requests FOR UPDATE
USING (auth.uid()::text = employee_id::text AND status = 'pending')
WITH CHECK (status = 'cancelled');
