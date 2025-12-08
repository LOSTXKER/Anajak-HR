-- Add columns for auto checkout tracking
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS auto_checkout BOOLEAN DEFAULT FALSE;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS auto_checkout_reason TEXT;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES employees(id);
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS edit_reason TEXT;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS original_clock_out TIMESTAMP WITH TIME ZONE;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;

-- Create table for tracking reminders sent
CREATE TABLE IF NOT EXISTS checkout_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_id UUID REFERENCES attendance_logs(id) NOT NULL,
  employee_id UUID REFERENCES employees(id) NOT NULL,
  reminder_number INTEGER NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_via TEXT DEFAULT 'line',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE checkout_reminders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all reminders" ON checkout_reminders;
DROP POLICY IF EXISTS "System can insert reminders" ON checkout_reminders;

-- RLS Policies
CREATE POLICY "Admins can view all reminders"
  ON checkout_reminders FOR SELECT
  USING (EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role IN ('admin', 'supervisor')));

CREATE POLICY "System can insert reminders"
  ON checkout_reminders FOR INSERT
  WITH CHECK (true);

-- Create table for attendance anomalies
CREATE TABLE IF NOT EXISTS attendance_anomalies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_id UUID REFERENCES attendance_logs(id),
  employee_id UUID REFERENCES employees(id) NOT NULL,
  date DATE NOT NULL,
  anomaly_type TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  resolved_by UUID REFERENCES employees(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE attendance_anomalies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all anomalies" ON attendance_anomalies;
DROP POLICY IF EXISTS "Admins can update anomalies" ON attendance_anomalies;
DROP POLICY IF EXISTS "System can insert anomalies" ON attendance_anomalies;

-- RLS Policies
CREATE POLICY "Admins can view all anomalies"
  ON attendance_anomalies FOR SELECT
  USING (EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role IN ('admin', 'supervisor')));

CREATE POLICY "Admins can update anomalies"
  ON attendance_anomalies FOR UPDATE
  USING (EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role IN ('admin', 'supervisor')));

CREATE POLICY "System can insert anomalies"
  ON attendance_anomalies FOR INSERT
  WITH CHECK (true);

-- Anomaly types:
-- 'forgot_checkout' - ลืมเช็คเอาท์
-- 'auto_checkout' - เช็คเอาท์อัตโนมัติ
-- 'overtime_no_request' - อยู่เกินเวลาแต่ไม่ขอ OT
-- 'late_checkin' - เช็คอินสาย
-- 'early_checkout' - เช็คเอาท์ก่อนเวลา
-- 'location_mismatch' - ตำแหน่งไม่ตรงกับสาขา
-- 'manual_edit' - แก้ไขข้อมูลย้อนหลัง

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_anomalies_date ON attendance_anomalies(date);
CREATE INDEX IF NOT EXISTS idx_anomalies_status ON attendance_anomalies(status);
CREATE INDEX IF NOT EXISTS idx_anomalies_employee ON attendance_anomalies(employee_id);

