-- Fix RLS policy for attendance_logs update by admin
-- ให้ admin สามารถแก้ไขข้อมูล attendance ได้

-- ลบ policy เดิมถ้ามี
DROP POLICY IF EXISTS "Admin can update attendance" ON attendance_logs;
DROP POLICY IF EXISTS "admin_update_attendance" ON attendance_logs;

-- สร้าง policy ใหม่สำหรับ admin update
CREATE POLICY "Admin can update attendance"
ON attendance_logs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- ตรวจสอบว่ามี policy สำหรับ select ด้วย
DROP POLICY IF EXISTS "Admin can select attendance" ON attendance_logs;

CREATE POLICY "Admin can select attendance"
ON attendance_logs FOR SELECT
USING (
  employee_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM employees 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- สร้างตาราง attendance_anomalies ถ้ายังไม่มี
CREATE TABLE IF NOT EXISTS attendance_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID REFERENCES attendance_logs(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  anomaly_type TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  resolution_note TEXT,
  resolved_by UUID REFERENCES employees(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE attendance_anomalies ENABLE ROW LEVEL SECURITY;

-- Fix RLS สำหรับ attendance_anomalies
DROP POLICY IF EXISTS "Admin can insert anomalies" ON attendance_anomalies;
DROP POLICY IF EXISTS "Admin can select anomalies" ON attendance_anomalies;

CREATE POLICY "Admin can insert anomalies"
ON attendance_anomalies FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admin can select anomalies"
ON attendance_anomalies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

