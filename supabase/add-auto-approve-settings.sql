-- Add Auto Approve settings
-- Run this in Supabase SQL Editor

-- Insert auto approve settings (default: disabled)
INSERT INTO system_settings (setting_key, setting_value, description, category)
VALUES
  ('auto_approve_ot', 'false', 'อนุมัติคำขอ OT อัตโนมัติ', 'auto_approve'),
  ('auto_approve_leave', 'false', 'อนุมัติคำขอลางานอัตโนมัติ', 'auto_approve'),
  ('auto_approve_wfh', 'false', 'อนุมัติคำขอ WFH อัตโนมัติ', 'auto_approve'),
  ('auto_approve_late', 'false', 'อนุมัติคำขอมาสายอัตโนมัติ', 'auto_approve'),
  ('auto_approve_field_work', 'false', 'อนุมัติคำขอทำงานนอกสถานที่อัตโนมัติ', 'auto_approve')
ON CONFLICT (setting_key) DO UPDATE
  SET setting_value = EXCLUDED.setting_value,
      description = EXCLUDED.description,
      category = EXCLUDED.category;

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
      role,
      is_system_account
    ) VALUES (
      'system@anajak.com',
      'ระบบอัตโนมัติ',
      'admin',
      true
    );
  END IF;
END $$;

COMMENT ON COLUMN system_settings.category IS 'Category of the setting (e.g., auto_approve, notifications, general)';

