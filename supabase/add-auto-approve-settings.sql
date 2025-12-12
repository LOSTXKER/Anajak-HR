-- Add Auto Approve settings
-- Run this in Supabase SQL Editor

-- Insert auto approve settings (default: disabled)
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES
  ('auto_approve_ot', 'false', 'อนุมัติคำขอ OT อัตโนมัติ'),
  ('auto_approve_leave', 'false', 'อนุมัติคำขอลางานอัตโนมัติ'),
  ('auto_approve_wfh', 'false', 'อนุมัติคำขอ WFH อัตโนมัติ'),
  ('auto_approve_late', 'false', 'อนุมัติคำขอมาสายอัตโนมัติ'),
  ('auto_approve_field_work', 'false', 'อนุมัติคำขอทำงานนอกสถานที่อัตโนมัติ')
ON CONFLICT (setting_key) DO UPDATE
  SET setting_value = EXCLUDED.setting_value,
      description = EXCLUDED.description;

-- Add system user ID for auto-approve (if not exists)
-- This will be used as approved_by when auto-approving
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM employees WHERE email = 'system@anajak.com'
  ) THEN
    INSERT INTO employees (
      email,
      name,
      phone,
      role,
      account_status,
      is_system_account
    ) VALUES (
      'system@anajak.com',
      'ระบบอัตโนมัติ',
      '0000000000',
      'admin',
      'approved',
      true
    );
  END IF;
END $$;

