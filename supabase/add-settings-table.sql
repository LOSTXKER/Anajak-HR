-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Only admins can view settings" ON system_settings;
DROP POLICY IF EXISTS "Only admins can update settings" ON system_settings;
DROP POLICY IF EXISTS "Only admins can insert settings" ON system_settings;
DROP POLICY IF EXISTS "Service role can read settings" ON system_settings;

-- Only admins can view/edit settings (via web UI)
CREATE POLICY "Only admins can view settings"
  ON system_settings FOR SELECT
  USING (EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role = 'admin'));

CREATE POLICY "Only admins can update settings"
  ON system_settings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role = 'admin'));

CREATE POLICY "Only admins can insert settings"
  ON system_settings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role = 'admin'));

-- Allow service role to read settings (for API routes)
CREATE POLICY "Service role can read settings"
  ON system_settings FOR SELECT
  USING (auth.jwt()->>'role' = 'service_role');

-- Insert default settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('work_start_time', '09:00', 'เวลาเข้างานมาตรฐาน'),
  ('work_end_time', '18:00', 'เวลาเลิกงานมาตรฐาน'),
  ('late_threshold_minutes', '15', 'เกณฑ์มาสาย (นาที)'),
  ('require_photo', 'true', 'บังคับถ่ายรูปเมื่อเช็คอิน'),
  ('require_gps', 'true', 'บังคับเปิด GPS'),
  ('require_account_approval', 'true', 'บังคับอนุมัติบัญชีพนักงานก่อนใช้งาน'),
  ('enable_notifications', 'true', 'เปิดการแจ้งเตือน'),
  ('line_channel_access_token', '', 'LINE Channel Access Token'),
  ('line_recipient_id', '', 'LINE User ID หรือ Group ID'),
  ('line_recipient_type', 'group', 'ประเภทผู้รับ (user หรือ group)'),
  ('line_msg_ot_approved', '🎉 คำขอ OT ได้รับอนุมัติแล้ว

👤 พนักงาน: {employeeName}
📅 วันที่: {date}
⏰ เวลา: {startTime} - {endTime}
✅ สถานะ: อนุมัติแล้ว

สามารถทำงาน OT ได้ตามเวลาที่ขออนุมัติ', 'ข้อความ OT อนุมัติ'),
  ('line_msg_ot_rejected', '❌ คำขอ OT ถูกปฏิเสธ

👤 พนักงาน: {employeeName}
📅 วันที่: {date}
⏰ เวลา: {startTime} - {endTime}
❌ สถานะ: ปฏิเสธ

กรุณาติดต่อหัวหน้างานเพื่อสอบถามเหตุผล', 'ข้อความ OT ปฏิเสธ'),
  ('line_msg_leave_approved', '🎉 คำขอลาได้รับอนุมัติแล้ว

👤 พนักงาน: {employeeName}
📝 ประเภท: {leaveType}
📅 วันที่: {dateRange}
✅ สถานะ: อนุมัติแล้ว

ขอให้พักผ่อนให้เต็มที่', 'ข้อความลาอนุมัติ'),
  ('line_msg_leave_rejected', '❌ คำขอลาถูกปฏิเสธ

👤 พนักงาน: {employeeName}
📝 ประเภท: {leaveType}
📅 วันที่: {dateRange}
❌ สถานะ: ปฏิเสธ

กรุณาติดต่อหัวหน้างานเพื่อสอบถามเหตุผล', 'ข้อความลาปฏิเสธ'),
  ('line_msg_wfh_approved', '🏠 คำขอ WFH ได้รับอนุมัติแล้ว

👤 พนักงาน: {employeeName}
📅 วันที่: {date}
✅ สถานะ: อนุมัติแล้ว

อย่าลืมเช็คอิน-เช็คเอาท์ตามปกติ (ไม่ต้องเปิด GPS)', 'ข้อความ WFH อนุมัติ'),
  ('line_msg_wfh_rejected', '❌ คำขอ WFH ถูกปฏิเสธ

👤 พนักงาน: {employeeName}
📅 วันที่: {date}
❌ สถานะ: ปฏิเสธ

กรุณาติดต่อหัวหน้างานเพื่อสอบถามเหตุผล', 'ข้อความ WFH ปฏิเสธ'),
  ('line_msg_holiday_reminder', '🎉 แจ้งเตือนวันหยุด

📅 {holidayName}
📆 วันที่: {date}
🏖️ ประเภท: {type}

{message}', 'Template ข้อความแจ้งเตือนวันหยุด'),
  ('line_msg_holiday_today', '🎊 วันนี้เป็นวันหยุด!

📅 {holidayName}
🏖️ ประเภท: {type}

ขอให้มีความสุขกับวันหยุด! 😊', 'Template ข้อความวันหยุด (วันนี้)'),
  ('line_msg_checkin', '✅ เช็คอินเข้างาน

👤 พนักงาน: {employeeName}
⏰ เวลา: {time}
📍 สถานที่: {location}
{lateStatus}', 'Template ข้อความเช็คอิน'),
  ('line_msg_checkout', '✅ เช็คเอาท์ออกงาน

👤 พนักงาน: {employeeName}
⏰ เวลา: {time}
⏱️ ทำงาน: {totalHours} ชั่วโมง
📍 สถานที่: {location}', 'Template ข้อความเช็คเอาท์')
ON CONFLICT (setting_key) DO NOTHING;

-- Holiday Notification Settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('enable_holiday_notifications', 'true', 'เปิดการแจ้งเตือนวันหยุด'),
  ('holiday_notification_days_before', '1', 'แจ้งเตือนล่วงหน้ากี่วัน'),
  ('holiday_notification_time', '09:00', 'เวลาที่ส่งแจ้งเตือน')
ON CONFLICT (setting_key) DO NOTHING;

-- Check-in/Check-out Notification Settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('enable_checkin_notifications', 'false', 'เปิดการแจ้งเตือนเมื่อพนักงานเช็คอิน'),
  ('enable_checkout_notifications', 'false', 'เปิดการแจ้งเตือนเมื่อพนักงานเช็คเอาท์')
ON CONFLICT (setting_key) DO NOTHING;

-- Auto Check-out Settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('auto_checkout_enabled', 'true', 'เปิดใช้งานระบบ Auto Check-out'),
  ('auto_checkout_delay_hours', '4', 'จำนวนชั่วโมงหลังเลิกงานก่อน Auto Check-out'),
  ('auto_checkout_require_outside_radius', 'true', 'ต้องอยู่นอกรัศมีก่อน Auto Check-out'),
  ('auto_checkout_skip_if_ot', 'true', 'ไม่ Auto Check-out ถ้ามี OT ที่อนุมัติแล้ว'),
  ('auto_checkout_time', '18:00', 'เวลาเช็คเอาท์เมื่อ Auto Check-out (ใช้เวลาเลิกงานปกติ)'),
  ('reminder_enabled', 'true', 'เปิดใช้งานระบบเตือนความจำ'),
  ('reminder_first_minutes', '15', 'เตือนครั้งแรกหลังเลิกงาน (นาที)'),
  ('reminder_second_minutes', '60', 'เตือนครั้งที่สองหลังเลิกงาน (นาที)'),
  ('reminder_third_minutes', '180', 'เตือนครั้งที่สามหลังเลิกงาน (นาที)'),
  ('notify_admin_on_auto_checkout', 'true', 'แจ้งเตือน Admin เมื่อมี Auto Check-out')
ON CONFLICT (setting_key) DO NOTHING;

-- Create trigger for updated_at (drop if exists first)
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

