-- Fix RLS Policies for holidays table
-- Run this in Supabase SQL Editor

-- =============================================
-- DROP EXISTING POLICIES
-- =============================================
DROP POLICY IF EXISTS "Allow anyone to read holidays" ON holidays;
DROP POLICY IF EXISTS "Allow service role to manage holidays" ON holidays;
DROP POLICY IF EXISTS "Anyone can view holidays" ON holidays;
DROP POLICY IF EXISTS "Admins can manage holidays" ON holidays;
DROP POLICY IF EXISTS "All authenticated users can read holidays" ON holidays;

-- =============================================
-- HOLIDAYS TABLE POLICIES
-- =============================================

-- 1. ทุกคนที่ authenticated สามารถอ่านวันหยุดได้
CREATE POLICY "All authenticated users can read holidays"
  ON holidays 
  FOR SELECT 
  TO authenticated
  USING (true);

-- 2. Admin สามารถจัดการวันหยุดได้ทั้งหมด (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage holidays"
  ON holidays 
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.id::text = auth.uid()::text 
      AND employees.role = 'admin'
    )
  );

-- =============================================
-- VERIFY
-- =============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'holidays'
ORDER BY policyname;

