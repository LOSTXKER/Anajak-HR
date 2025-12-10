-- Migration: Add missing fields and tables
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. ADD MISSING COLUMNS TO attendance_logs
-- =====================================================
ALTER TABLE attendance_logs 
ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0;

ALTER TABLE attendance_logs 
ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;

ALTER TABLE attendance_logs 
ADD COLUMN IF NOT EXISTS auto_checkout BOOLEAN DEFAULT FALSE;

ALTER TABLE attendance_logs 
ADD COLUMN IF NOT EXISTS auto_checkout_reason TEXT;

-- =====================================================
-- 2. ADD MISSING COLUMNS TO ot_requests
-- =====================================================
ALTER TABLE ot_requests 
ADD COLUMN IF NOT EXISTS start_gps_lat DECIMAL(10, 8);

ALTER TABLE ot_requests 
ADD COLUMN IF NOT EXISTS start_gps_lng DECIMAL(11, 8);

ALTER TABLE ot_requests 
ADD COLUMN IF NOT EXISTS end_gps_lat DECIMAL(10, 8);

ALTER TABLE ot_requests 
ADD COLUMN IF NOT EXISTS end_gps_lng DECIMAL(11, 8);

-- Update ot_type constraint to include 'weekend' and 'workday'
ALTER TABLE ot_requests 
DROP CONSTRAINT IF EXISTS ot_requests_ot_type_check;

ALTER TABLE ot_requests 
ADD CONSTRAINT ot_requests_ot_type_check 
CHECK (ot_type IN ('normal', 'holiday', 'pre_shift', 'weekend', 'workday'));

-- =====================================================
-- 3. CREATE system_settings TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('work_start_time', '09:00', 'เวลาเริ่มงาน'),
  ('work_end_time', '18:00', 'เวลาเลิกงาน'),
  ('hours_per_day', '8', 'ชั่วโมงทำงานต่อวัน'),
  ('late_threshold_minutes', '15', 'นาทีที่อนุญาตให้สายได้'),
  ('checkin_time_start', '06:00', 'เวลาเริ่มเช็คอินได้'),
  ('checkin_time_end', '12:00', 'เวลาสิ้นสุดเช็คอิน'),
  ('checkout_time_start', '15:00', 'เวลาเริ่มเช็คเอาท์ได้'),
  ('checkout_time_end', '23:00', 'เวลาสิ้นสุดเช็คเอาท์'),
  ('auto_checkout_enabled', 'true', 'เปิด/ปิด Auto Checkout'),
  ('auto_checkout_delay_hours', '4', 'ชั่วโมงหลังเลิกงานก่อน Auto Checkout'),
  ('auto_checkout_time', '18:00', 'เวลาที่ใช้บันทึก Auto Checkout'),
  ('ot_early_start_buffer', '15', 'นาทีที่อนุญาตให้เริ่ม OT ก่อนเวลา'),
  ('ot_rate_normal', '1.5', 'อัตรา OT วันปกติ'),
  ('ot_rate_weekend', '2', 'อัตรา OT วันหยุดสุดสัปดาห์'),
  ('ot_rate_holiday', '3', 'อัตรา OT วันหยุดนักขัตฤกษ์'),
  ('reminder_enabled', 'true', 'เปิด/ปิดการเตือนเช็คเอาท์'),
  ('reminder_first_minutes', '15', 'นาทีแรกที่เตือน'),
  ('reminder_second_minutes', '60', 'นาทีที่สองที่เตือน'),
  ('reminder_third_minutes', '180', 'นาทีที่สามที่เตือน')
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================
-- 4. CREATE late_requests TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS late_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) NOT NULL,
  request_date DATE NOT NULL,
  reason TEXT NOT NULL,
  actual_late_minutes INTEGER,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  admin_note TEXT,
  approved_by UUID REFERENCES employees(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_late_requests_employee ON late_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_late_requests_date ON late_requests(request_date);
CREATE INDEX IF NOT EXISTS idx_late_requests_status ON late_requests(status);

-- =====================================================
-- 5. CREATE attendance_anomalies TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS attendance_anomalies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_id UUID REFERENCES attendance_logs(id),
  employee_id UUID REFERENCES employees(id) NOT NULL,
  date DATE NOT NULL,
  anomaly_type VARCHAR(50) NOT NULL CHECK (anomaly_type IN ('auto_checkout', 'early_checkout', 'late_checkin', 'missing_checkout', 'location_mismatch', 'other')),
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  reviewed_by UUID REFERENCES employees(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  resolution_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anomalies_employee ON attendance_anomalies(employee_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_date ON attendance_anomalies(date);
CREATE INDEX IF NOT EXISTS idx_anomalies_status ON attendance_anomalies(status);

-- =====================================================
-- 6. CREATE checkout_reminders TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS checkout_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_id UUID REFERENCES attendance_logs(id) NOT NULL,
  employee_id UUID REFERENCES employees(id) NOT NULL,
  reminder_number INTEGER NOT NULL,
  sent_via VARCHAR(20) DEFAULT 'line' CHECK (sent_via IN ('line', 'email', 'push')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_attendance ON checkout_reminders(attendance_id);

-- =====================================================
-- 7. Enable RLS on new tables
-- =====================================================
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE late_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_reminders ENABLE ROW LEVEL SECURITY;

-- System settings - readable by all authenticated
DROP POLICY IF EXISTS "Anyone can read settings" ON system_settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON system_settings;
CREATE POLICY "Anyone can read settings" ON system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage settings" ON system_settings FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role = 'admin'));

-- Late requests - employees can view their own
DROP POLICY IF EXISTS "late_requests_select_own" ON late_requests;
DROP POLICY IF EXISTS "late_requests_insert_own" ON late_requests;
DROP POLICY IF EXISTS "late_requests_update_admin" ON late_requests;
CREATE POLICY "late_requests_select_own" ON late_requests FOR SELECT TO authenticated 
USING (employee_id = auth.uid() OR EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('admin', 'supervisor')));

CREATE POLICY "late_requests_insert_own" ON late_requests FOR INSERT TO authenticated 
WITH CHECK (employee_id = auth.uid());

CREATE POLICY "late_requests_update_admin" ON late_requests FOR UPDATE TO authenticated 
USING (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('admin', 'supervisor')));

-- Anomalies - admin/supervisor only
DROP POLICY IF EXISTS "anomalies_admin" ON attendance_anomalies;
CREATE POLICY "anomalies_admin" ON attendance_anomalies FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('admin', 'supervisor')));

-- Reminders - admin/supervisor only
DROP POLICY IF EXISTS "reminders_admin" ON checkout_reminders;
CREATE POLICY "reminders_admin" ON checkout_reminders FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('admin', 'supervisor')));

-- =====================================================
-- 8. Add triggers for updated_at
-- =====================================================
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_late_requests_updated_at ON late_requests;
CREATE TRIGGER update_late_requests_updated_at BEFORE UPDATE ON late_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Done!
-- =====================================================
SELECT 'Migration completed successfully!' as message;

