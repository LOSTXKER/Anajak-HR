-- Add checkin/checkout time restriction settings
-- Run this in Supabase SQL Editor

INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('checkin_time_start', '06:00', 'เวลาเริ่มต้นที่อนุญาตให้เช็คอิน'),
  ('checkin_time_end', '12:00', 'เวลาสิ้นสุดที่อนุญาตให้เช็คอิน'),
  ('checkout_time_start', '15:00', 'เวลาเริ่มต้นที่อนุญาตให้เช็คเอาท์'),
  ('checkout_time_end', '22:00', 'เวลาสิ้นสุดที่อนุญาตให้เช็คเอาท์')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;

