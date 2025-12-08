-- เพิ่ม settings สำหรับการแจ้งเตือนวันหยุด
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('enable_holiday_notifications', 'true', 'เปิดการแจ้งเตือนวันหยุด'),
  ('holiday_notification_days_before', '1', 'แจ้งเตือนล่วงหน้ากี่วัน (default: 1 วันก่อน)'),
  ('holiday_notification_time', '09:00', 'เวลาที่ส่งแจ้งเตือน (HH:mm)'),
  ('line_msg_holiday_reminder', '🎉 แจ้งเตือนวันหยุด

📅 {holidayName}
📆 วันที่: {date}
🏖️ ประเภท: {type}

{message}', 'Template ข้อความแจ้งเตือนวันหยุด'),
  ('line_msg_holiday_today', '🎊 วันนี้เป็นวันหยุด!

📅 {holidayName}
🏖️ ประเภท: {type}

ขอให้มีความสุขกับวันหยุด! 😊', 'Template ข้อความวันหยุด (วันนี้)')
ON CONFLICT (setting_key) DO NOTHING;

SELECT 'Holiday notification settings added!' as message;

