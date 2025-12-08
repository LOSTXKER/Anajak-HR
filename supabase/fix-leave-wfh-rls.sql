-- Fix RLS Policies for leave_requests and wfh_requests
-- Run this in Supabase SQL Editor

-- =============================================
-- DROP EXISTING POLICIES (if any)
-- =============================================

DROP POLICY IF EXISTS "Employees can view their own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Employees can create their own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Supervisors and admins can update leave requests" ON leave_requests;

DROP POLICY IF EXISTS "Employees can view their own WFH requests" ON wfh_requests;
DROP POLICY IF EXISTS "Employees can create their own WFH requests" ON wfh_requests;
DROP POLICY IF EXISTS "Supervisors and admins can update WFH requests" ON wfh_requests;

DROP POLICY IF EXISTS "Anyone can view holidays" ON holidays;
DROP POLICY IF EXISTS "Admins can manage holidays" ON holidays;

DROP POLICY IF EXISTS "Anyone can view branches" ON branches;
DROP POLICY IF EXISTS "Admins can manage branches" ON branches;

-- =============================================
-- LEAVE REQUESTS POLICIES
-- =============================================

-- พนักงานดูคำขอลาของตัวเอง / Admin-Supervisor ดูทั้งหมด
CREATE POLICY "Employees can view their own leave requests"
  ON leave_requests FOR SELECT
  USING (
    auth.uid()::text = employee_id::text OR 
    EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role IN ('supervisor', 'admin'))
  );

-- พนักงานสร้างคำขอลาของตัวเอง
CREATE POLICY "Employees can create their own leave requests"
  ON leave_requests FOR INSERT
  WITH CHECK (auth.uid()::text = employee_id::text);

-- Admin/Supervisor อัพเดทคำขอลา (อนุมัติ/ปฏิเสธ)
CREATE POLICY "Supervisors and admins can update leave requests"
  ON leave_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role IN ('supervisor', 'admin')) OR
    auth.uid()::text = employee_id::text
  );

-- =============================================
-- WFH REQUESTS POLICIES
-- =============================================

-- พนักงานดูคำขอ WFH ของตัวเอง / Admin-Supervisor ดูทั้งหมด
CREATE POLICY "Employees can view their own WFH requests"
  ON wfh_requests FOR SELECT
  USING (
    auth.uid()::text = employee_id::text OR 
    EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role IN ('supervisor', 'admin'))
  );

-- พนักงานสร้างคำขอ WFH ของตัวเอง
CREATE POLICY "Employees can create their own WFH requests"
  ON wfh_requests FOR INSERT
  WITH CHECK (auth.uid()::text = employee_id::text);

-- Admin/Supervisor อัพเดทคำขอ WFH (อนุมัติ/ปฏิเสธ)
CREATE POLICY "Supervisors and admins can update WFH requests"
  ON wfh_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role IN ('supervisor', 'admin')) OR
    auth.uid()::text = employee_id::text
  );

-- =============================================
-- HOLIDAYS POLICIES
-- =============================================

-- ทุกคนดูวันหยุดได้
CREATE POLICY "Anyone can view holidays"
  ON holidays FOR SELECT
  USING (true);

-- Admin จัดการวันหยุดได้
CREATE POLICY "Admins can manage holidays"
  ON holidays FOR ALL
  USING (EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role = 'admin'));

-- =============================================
-- BRANCHES POLICIES
-- =============================================

-- ทุกคนดูสาขาได้
CREATE POLICY "Anyone can view branches"
  ON branches FOR SELECT
  USING (true);

-- Admin จัดการสาขาได้
CREATE POLICY "Admins can manage branches"
  ON branches FOR ALL
  USING (EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role = 'admin'));

-- =============================================
-- VERIFY
-- =============================================
-- หลังจากรัน SQL นี้แล้ว ให้ทดสอบการขอลา/WFH อีกครั้ง

