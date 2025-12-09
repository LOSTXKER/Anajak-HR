-- Fix RLS policy to allow employees to cancel their own pending requests
-- Run this in Supabase SQL Editor if canceling requests doesn't work

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Users and admins can update OT requests" ON ot_requests;
DROP POLICY IF EXISTS "Users and admins can update leave requests" ON leave_requests;

-- Recreate OT requests UPDATE policy with explicit employee_id check
CREATE POLICY "Users and admins can update OT requests"
  ON ot_requests FOR UPDATE
  USING (
    auth.uid() = employee_id OR
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  )
  WITH CHECK (
    auth.uid() = employee_id OR
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

-- Recreate leave requests UPDATE policy with explicit employee_id check
CREATE POLICY "Users and admins can update leave requests"
  ON leave_requests FOR UPDATE
  USING (
    auth.uid() = employee_id OR
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  )
  WITH CHECK (
    auth.uid() = employee_id OR
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

