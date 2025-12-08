-- Fix RLS Policies สำหรับ Admin/Supervisor ให้ดูข้อมูลทุกคนได้

-- ลบ Policy เก่า
DROP POLICY IF EXISTS "Allow users to read their own OT requests" ON ot_requests;
DROP POLICY IF EXISTS "Allow users to create their own OT requests" ON ot_requests;
DROP POLICY IF EXISTS "Allow users to update their own OT requests" ON ot_requests;
DROP POLICY IF EXISTS "Allow admins to read all OT requests" ON ot_requests;
DROP POLICY IF EXISTS "Allow admins to update all OT requests" ON ot_requests;

DROP POLICY IF EXISTS "Allow users to read their own attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Allow users to insert their own attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Allow users to update their own attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Allow admins to read all attendance" ON attendance_logs;

DROP POLICY IF EXISTS "Allow users to read their own employee data" ON employees;
DROP POLICY IF EXISTS "Allow admins to read all employees" ON employees;
DROP POLICY IF EXISTS "Allow admins to update employees" ON employees;
DROP POLICY IF EXISTS "Allow admins to delete employees" ON employees;

-- ============================================
-- EMPLOYEES TABLE
-- ============================================

-- Users อ่านข้อมูลตัวเอง
CREATE POLICY "employees_select_own"
ON employees FOR SELECT
USING (auth.uid() = id);

-- Admin/Supervisor อ่านข้อมูลทุกคน
CREATE POLICY "employees_select_admin"
ON employees FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.id = auth.uid() 
    AND e.role IN ('admin', 'supervisor')
  )
);

-- Admin อัพเดต/ลบพนักงาน
CREATE POLICY "employees_update_admin"
ON employees FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.id = auth.uid() 
    AND e.role = 'admin'
  )
);

CREATE POLICY "employees_delete_admin"
ON employees FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.id = auth.uid() 
    AND e.role = 'admin'
  )
);

-- ============================================
-- ATTENDANCE_LOGS TABLE
-- ============================================

-- Users อ่าน/เขียน/อัพเดตของตัวเอง
CREATE POLICY "attendance_select_own"
ON attendance_logs FOR SELECT
USING (auth.uid() = employee_id);

CREATE POLICY "attendance_insert_own"
ON attendance_logs FOR INSERT
WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "attendance_update_own"
ON attendance_logs FOR UPDATE
USING (auth.uid() = employee_id);

-- Admin/Supervisor อ่านทุกคน
CREATE POLICY "attendance_select_admin"
ON attendance_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.id = auth.uid() 
    AND e.role IN ('admin', 'supervisor')
  )
);

-- ============================================
-- OT_REQUESTS TABLE
-- ============================================

-- Users อ่าน/สร้าง/อัพเดตของตัวเอง
CREATE POLICY "ot_select_own"
ON ot_requests FOR SELECT
USING (auth.uid() = employee_id);

CREATE POLICY "ot_insert_own"
ON ot_requests FOR INSERT
WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "ot_update_own"
ON ot_requests FOR UPDATE
USING (auth.uid() = employee_id);

-- Admin/Supervisor อ่านทุกคน
CREATE POLICY "ot_select_admin"
ON ot_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.id = auth.uid() 
    AND e.role IN ('admin', 'supervisor')
  )
);

-- Admin/Supervisor อัพเดต OT ทุกคน (อนุมัติ/ปฏิเสธ)
CREATE POLICY "ot_update_admin"
ON ot_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.id = auth.uid() 
    AND e.role IN ('admin', 'supervisor')
  )
);

-- ============================================
-- BRANCHES TABLE (อ่านได้ทุกคน, Admin จัดการ)
-- ============================================

DROP POLICY IF EXISTS "Allow anyone to read branches" ON branches;
DROP POLICY IF EXISTS "Allow service role to manage branches" ON branches;
DROP POLICY IF EXISTS "branches_select_all" ON branches;
DROP POLICY IF EXISTS "branches_manage_admin" ON branches;

CREATE POLICY "branches_select_all"
ON branches FOR SELECT
USING (true);

CREATE POLICY "branches_insert_admin"
ON branches FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.id = auth.uid() 
    AND e.role = 'admin'
  )
);

CREATE POLICY "branches_update_admin"
ON branches FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.id = auth.uid() 
    AND e.role = 'admin'
  )
);

CREATE POLICY "branches_delete_admin"
ON branches FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.id = auth.uid() 
    AND e.role = 'admin'
  )
);

-- ============================================
-- HOLIDAYS TABLE (อ่านได้ทุกคน)
-- ============================================

DROP POLICY IF EXISTS "Allow anyone to read holidays" ON holidays;
DROP POLICY IF EXISTS "holidays_select_all" ON holidays;

CREATE POLICY "holidays_select_all"
ON holidays FOR SELECT
USING (true);

-- ============================================
-- Done
-- ============================================

SELECT 'Admin RLS Policies updated successfully!' as message;

