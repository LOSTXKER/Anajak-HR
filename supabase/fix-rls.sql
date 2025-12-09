-- Fix RLS Policies สำหรับให้ user อ่านข้อมูลตัวเองได้

-- ลบ policy เก่า
DROP POLICY IF EXISTS "Employees can view their own data" ON employees;
DROP POLICY IF EXISTS "Employees can view their own attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Employees can insert their own attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Employees can update their own attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Employees can view their own OT requests" ON ot_requests;
DROP POLICY IF EXISTS "Employees can create their own OT requests" ON ot_requests;
DROP POLICY IF EXISTS "Supervisors and admins can update OT requests" ON ot_requests;

-- ปิด RLS ชั่วคราวเพื่อแก้ไข
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE ot_requests DISABLE ROW LEVEL SECURITY;

-- เปิด RLS อีกครั้ง
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ot_requests ENABLE ROW LEVEL SECURITY;

-- สร้าง Policies ใหม่ที่ง่ายกว่า

-- 1. Employees Table
CREATE POLICY "Allow users to read their own employee data"
ON employees FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Allow service role to manage employees"
ON employees FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- 2. Attendance Logs
CREATE POLICY "Allow users to read their own attendance"
ON attendance_logs FOR SELECT
USING (auth.uid() = employee_id);

CREATE POLICY "Allow users to insert their own attendance"
ON attendance_logs FOR INSERT
WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Allow users to update their own attendance"
ON attendance_logs FOR UPDATE
USING (auth.uid() = employee_id);

CREATE POLICY "Allow service role to manage attendance"
ON attendance_logs FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- 3. OT Requests
CREATE POLICY "Allow users to read their own OT requests"
ON ot_requests FOR SELECT
USING (auth.uid() = employee_id);

CREATE POLICY "Allow users to create their own OT requests"
ON ot_requests FOR INSERT
WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Allow users to update their own OT requests"
ON ot_requests FOR UPDATE
USING (auth.uid() = employee_id);

CREATE POLICY "Allow service role to manage OT requests"
ON ot_requests FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- 4. Branches (อนุญาตให้อ่านได้ทุกคน)
CREATE POLICY "Allow anyone to read branches"
ON branches FOR SELECT
USING (true);

CREATE POLICY "Allow service role to manage branches"
ON branches FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- 5. Holidays (อนุญาตให้อ่านได้ทุกคน)
CREATE POLICY "Allow anyone to read holidays"
ON holidays FOR SELECT
USING (true);

CREATE POLICY "Allow service role to manage holidays"
ON holidays FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- แสดงผลลัพธ์
SELECT 'RLS Policies updated successfully!' as message;


