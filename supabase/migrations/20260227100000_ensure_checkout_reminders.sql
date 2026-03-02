-- Ensure checkout reminder system DB objects exist
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT DO NOTHING

-- 1. Add reminder_count column to attendance_logs
ALTER TABLE attendance_logs 
ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;

-- 2. Create checkout_reminders table
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
CREATE INDEX IF NOT EXISTS idx_reminders_employee ON checkout_reminders(employee_id);

-- 3. RLS
ALTER TABLE checkout_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reminders_admin" ON checkout_reminders;
CREATE POLICY "reminders_admin" ON checkout_reminders FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('admin', 'supervisor')));

DROP POLICY IF EXISTS "reminders_service_role" ON checkout_reminders;
CREATE POLICY "reminders_service_role" ON checkout_reminders FOR ALL TO service_role USING (true);

-- 4. Seed reminder & auto-checkout settings (only if not already set)
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('auto_checkout_enabled', 'true', 'เปิด/ปิด Auto Checkout'),
  ('auto_checkout_time', '22:00', 'เวลาที่ระบบรัน Auto Checkout'),
  ('auto_checkout_skip_if_ot', 'true', 'ข้าม auto checkout ถ้ามี OT'),
  ('reminder_enabled', 'true', 'เปิด/ปิดการเตือนเช็คเอาท์'),
  ('reminder_first_minutes', '15', 'เตือนครั้งที่ 1 (นาทีหลังเลิกงาน)'),
  ('reminder_second_minutes', '30', 'เตือนครั้งที่ 2 (นาทีหลังเลิกงาน)'),
  ('reminder_third_minutes', '60', 'เตือนครั้งที่ 3 (นาทีหลังเลิกงาน)'),
  ('notify_admin_on_auto_checkout', 'true', 'แจ้ง Admin เมื่อ auto checkout')
ON CONFLICT (setting_key) DO NOTHING;
