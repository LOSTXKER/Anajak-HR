-- Rollback script for Auto Check-in/Check-out features
-- This will remove ONLY unused tables, columns, and settings
-- KEEP: attendance_anomalies (still used by other features)

-- ==========================================
-- 1. Drop ONLY unused tables
-- ==========================================

-- checkout_reminders is no longer used (was for auto-checkout reminders)
DROP TABLE IF EXISTS checkout_reminders CASCADE;

-- ⚠️ DO NOT DROP attendance_anomalies - still used by:
--   - app/checkout/page.tsx (early checkout detection)
--   - app/admin/anomalies/page.tsx (admin anomaly review)
--   - app/admin/attendance/edit/[id]/page.tsx (edit audit)

-- ==========================================
-- 2. Remove ONLY auto-mode specific columns from attendance_logs
-- (Keep columns that might be useful for other features)
-- ==========================================

ALTER TABLE attendance_logs DROP COLUMN IF EXISTS auto_checkin;
ALTER TABLE attendance_logs DROP COLUMN IF EXISTS auto_checkout;
ALTER TABLE attendance_logs DROP COLUMN IF EXISTS auto_checkout_reason;
ALTER TABLE attendance_logs DROP COLUMN IF EXISTS reminder_count;

-- KEEP these columns (useful for attendance edit feature):
-- - edited_by
-- - edited_at  
-- - edit_reason
-- - original_clock_out

-- ==========================================
-- 3. Remove auto-mode system settings
-- ==========================================

DELETE FROM system_settings WHERE setting_key IN (
  -- Auto Check-in settings
  'auto_checkin_enabled',
  'auto_checkin_time',
  'auto_checkin_days',
  'auto_checkin_skip_if_holiday',
  'auto_checkin_notify_employee',
  'auto_checkin_notify_admin',
  
  -- Auto Check-out settings
  'auto_checkout_enabled',
  'auto_checkout_time',
  'auto_checkout_delay_hours',
  'auto_checkout_skip_if_ot',
  'auto_checkout_require_outside_radius',
  'notify_admin_on_auto_checkout',
  'reminder_enabled',
  'reminder_first_minutes',
  'reminder_second_minutes',
  'reminder_third_minutes'
);

-- ==========================================
-- 4. Drop unused indexes
-- ==========================================

DROP INDEX IF EXISTS idx_attendance_auto_checkin;

-- KEEP anomaly indexes (table still exists):
-- - idx_anomalies_date
-- - idx_anomalies_status
-- - idx_anomalies_employee

-- ==========================================
-- Done! Rollback completed
-- ==========================================

SELECT 'Rollback completed! attendance_anomalies table preserved.' as status;
