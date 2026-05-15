-- =============================================================
-- RLS Policies: attendance_logs, attendance_anomalies,
--               branches, holidays (multi-entity)
-- Source: fix-admin-rls.sql + fix-rls-policies.sql + fix-rls.sql
--         (merged, latest wins — reconciled Phase A 2026-05-16)
-- =============================================================

-- =====================================================
-- ATTENDANCE LOGS
-- =====================================================
DROP POLICY IF EXISTS "Employee can read own attendance" ON attendance_logs;
CREATE POLICY "Employee can read own attendance"
ON attendance_logs FOR SELECT TO authenticated
USING (employee_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Employee can insert own attendance" ON attendance_logs;
CREATE POLICY "Employee can insert own attendance"
ON attendance_logs FOR INSERT TO authenticated
WITH CHECK (employee_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Employee can update own attendance" ON attendance_logs;
CREATE POLICY "Employee can update own attendance"
ON attendance_logs FOR UPDATE TO authenticated
USING (employee_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admin can manage all attendance" ON attendance_logs;
CREATE POLICY "Admin can manage all attendance"
ON attendance_logs FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM employees WHERE employees.id::text = auth.uid()::text AND employees.role IN ('admin', 'supervisor'))
);

-- =====================================================
-- ATTENDANCE ANOMALIES
-- =====================================================
DROP POLICY IF EXISTS "Employee can insert anomalies" ON attendance_anomalies;
CREATE POLICY "Employee can insert anomalies"
ON attendance_anomalies FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can manage anomalies" ON attendance_anomalies;
CREATE POLICY "Admin can manage anomalies"
ON attendance_anomalies FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM employees WHERE employees.id::text = auth.uid()::text AND employees.role IN ('admin', 'supervisor'))
);

-- =====================================================
-- BRANCHES
-- =====================================================
DROP POLICY IF EXISTS "Allow read branches" ON branches;
CREATE POLICY "Allow read branches"
ON branches FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage branches" ON branches;
CREATE POLICY "Admins can manage branches"
ON branches FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role = 'admin')
);

-- =====================================================
-- HOLIDAYS
-- =====================================================
DROP POLICY IF EXISTS "All authenticated users can read holidays" ON holidays;
CREATE POLICY "All authenticated users can read holidays"
ON holidays FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage holidays" ON holidays;
CREATE POLICY "Admins can manage holidays"
ON holidays FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM employees WHERE employees.id::text = auth.uid()::text AND employees.role = 'admin')
);
