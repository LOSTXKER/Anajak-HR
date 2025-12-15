-- Rollback script for Auto Check-in/Check-out features
-- This will remove all tables, columns, and settings added by auto mode

-- ==========================================
-- 1. Drop tables if exist
-- ==========================================

DROP TABLE IF EXISTS checkout_reminders CASCADE;
DROP TABLE IF EXISTS attendance_anomalies CASCADE;

-- ==========================================
-- 2. Remove columns from attendance_logs
-- ==========================================

ALTER TABLE attendance_logs DROP COLUMN IF EXISTS auto_checkin;
ALTER TABLE attendance_logs DROP COLUMN IF EXISTS auto_checkout;
ALTER TABLE attendance_logs DROP COLUMN IF EXISTS auto_checkout_reason;
ALTER TABLE attendance_logs DROP COLUMN IF EXISTS edited_by;
ALTER TABLE attendance_logs DROP COLUMN IF EXISTS edited_at;
ALTER TABLE attendance_logs DROP COLUMN IF EXISTS edit_reason;
ALTER TABLE attendance_logs DROP COLUMN IF EXISTS original_clock_out;
ALTER TABLE attendance_logs DROP COLUMN IF EXISTS reminder_count;

-- ==========================================
-- 3. Drop indexes
-- ==========================================

DROP INDEX IF EXISTS idx_attendance_auto_checkin;
DROP INDEX IF EXISTS idx_anomalies_date;
DROP INDEX IF EXISTS idx_anomalies_status;
DROP INDEX IF EXISTS idx_anomalies_employee;

-- ==========================================
-- 4. Remove system settings
-- ==========================================

DELETE FROM system_settings WHERE setting_key IN (
  'auto_checkin_enabled',
  'auto_checkin_time',
  'auto_checkin_days',
  'auto_checkin_skip_if_holiday',
  'auto_checkin_notify_employee',
  'auto_checkin_notify_admin',
  'auto_checkout_enabled',
  'auto_checkout_time',
  'auto_checkout_delay_hours',
  'auto_checkout_skip_if_ot',
  'auto_checkout_require_outside_radius',
  'notify_admin_on_auto_checkout',
  'reminder_enabled',
  'reminder_first_minutes',
  'reminder_second_minutes',
  'reminder_third_minutes',
  'work_end_time'
);

-- ==========================================
-- Done! Rollback completed
-- ==========================================

SELECT 'Rollback completed successfully!' as status;
