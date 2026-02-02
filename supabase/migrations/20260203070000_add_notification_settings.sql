-- Add notification settings for all notification types
-- Default to "false" to save LINE quota

-- Request Notifications (Leave, WFH, Late, Field Work)
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES 
  ('enable_leave_notifications', 'false', 'แจ้งเตือนคำขอลางาน (คำขอใหม่ + อนุมัติ/ปฏิเสธ)')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO system_settings (setting_key, setting_value, description)
VALUES 
  ('enable_wfh_notifications', 'false', 'แจ้งเตือนคำขอ WFH (คำขอใหม่ + อนุมัติ/ปฏิเสธ)')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO system_settings (setting_key, setting_value, description)
VALUES 
  ('enable_late_notifications', 'false', 'แจ้งเตือนคำขอมาสาย (คำขอใหม่ + อนุมัติ/ปฏิเสธ)')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO system_settings (setting_key, setting_value, description)
VALUES 
  ('enable_fieldwork_notifications', 'false', 'แจ้งเตือนคำของานนอกสถานที่ (คำขอใหม่ + อนุมัติ/ปฏิเสธ)')
ON CONFLICT (setting_key) DO NOTHING;

-- Other Notifications
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES 
  ('enable_announcement_notifications', 'false', 'แจ้งเตือนประกาศใหม่')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO system_settings (setting_key, setting_value, description)
VALUES 
  ('enable_employee_registration_notifications', 'false', 'แจ้งเตือนพนักงานลงทะเบียนใหม่')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO system_settings (setting_key, setting_value, description)
VALUES 
  ('enable_anomaly_notifications', 'false', 'แจ้งเตือน Anomaly (เช็คเอาท์ก่อนเวลา, GPS ไม่ตรง ฯลฯ)')
ON CONFLICT (setting_key) DO NOTHING;
