-- =============================================================
-- Migration: Fix settings keys, request table columns, and
--            create field_work_requests table
-- Run in: Supabase Dashboard > SQL Editor
-- =============================================================


-- ============================================================
-- 1. FIX system_settings: rename keys & add missing settings
-- ============================================================

-- 1a. Add ot_rate_workday from ot_rate_normal (if normal exists, copy its value)
INSERT INTO system_settings (setting_key, setting_value, description)
SELECT 'ot_rate_workday', setting_value, 'อัตรา OT วันทำงานปกติ (ตัวคูณ)'
FROM system_settings WHERE setting_key = 'ot_rate_normal'
ON CONFLICT (setting_key) DO NOTHING;

-- If ot_rate_normal never existed, insert default
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('ot_rate_workday', '1.5', 'อัตรา OT วันทำงานปกติ (ตัวคูณ)')
ON CONFLICT (setting_key) DO NOTHING;

-- Update ot_rate_weekend & ot_rate_holiday to proper keys (already correct key names, just ensure they exist)
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('ot_rate_weekend', '1.5', 'อัตรา OT วันหยุดสุดสัปดาห์ (ตัวคูณ)'),
  ('ot_rate_holiday', '2',   'อัตรา OT วันหยุดนักขัตฤกษ์ (ตัวคูณ)')
ON CONFLICT (setting_key) DO NOTHING;

-- 1b. Add work_hours_per_day, copying from hours_per_day if it exists
INSERT INTO system_settings (setting_key, setting_value, description)
SELECT 'work_hours_per_day', setting_value, 'ชั่วโมงทำงานต่อวัน'
FROM system_settings WHERE setting_key = 'hours_per_day'
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('work_hours_per_day', '8', 'ชั่วโมงทำงานต่อวัน')
ON CONFLICT (setting_key) DO NOTHING;

-- 1c. Add all other missing settings with sensible defaults
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('days_per_month',           '26',    'วันทำงานต่อเดือน (สำหรับคำนวณเงิน)'),
  ('late_penalty_per_minute',  '0',     'ค่าปรับต่อนาทีที่สาย (บาท)'),
  ('ot_require_approval',      'true',  'OT ต้องได้รับการอนุมัติก่อน'),
  ('ot_auto_approve',          'false', 'อนุมัติ OT อัตโนมัติ'),
  ('ot_min_hours',             '1',     'ชั่วโมง OT ขั้นต่ำ'),
  ('ot_max_hours',             '8',     'ชั่วโมง OT สูงสุดต่อวัน'),
  ('ot_require_before_photo',  'true',  'บังคับถ่ายรูปก่อนเริ่ม OT'),
  ('ot_require_after_photo',   'true',  'บังคับถ่ายรูปหลังจบ OT'),
  ('max_ot_per_day',           '4',     'ชั่วโมง OT สูงสุดต่อวัน (ตามกฎหมาย)'),
  ('max_ot_per_week',          '20',    'ชั่วโมง OT สูงสุดต่อสัปดาห์'),
  ('max_ot_per_month',         '60',    'ชั่วโมง OT สูงสุดต่อเดือน'),
  ('working_days',             '1,2,3,4,5', 'วันทำงาน (1=จันทร์ ... 7=อาทิตย์)')
ON CONFLICT (setting_key) DO NOTHING;


-- ============================================================
-- 2. FIX ot_requests: status constraint + cancel columns
-- ============================================================

-- 2a. Drop old status constraint and recreate with 'cancelled'
ALTER TABLE ot_requests
  DROP CONSTRAINT IF EXISTS ot_requests_status_check;

ALTER TABLE ot_requests
  ADD CONSTRAINT ot_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled'));

-- 2b. Add cancel & admin columns
ALTER TABLE ot_requests
  ADD COLUMN IF NOT EXISTS cancelled_by    UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS cancelled_at    TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cancel_reason   TEXT,
  ADD COLUMN IF NOT EXISTS approved_at     TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS admin_note      TEXT;


-- ============================================================
-- 3. FIX leave_requests: status constraint + cancel columns
-- ============================================================

ALTER TABLE leave_requests
  DROP CONSTRAINT IF EXISTS leave_requests_status_check;

ALTER TABLE leave_requests
  ADD CONSTRAINT leave_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));

ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS cancelled_by  UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS cancelled_at  TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS approved_at   TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS admin_note    TEXT;


-- ============================================================
-- 4. FIX wfh_requests: status constraint + cancel columns
-- ============================================================

ALTER TABLE wfh_requests
  DROP CONSTRAINT IF EXISTS wfh_requests_status_check;

ALTER TABLE wfh_requests
  ADD CONSTRAINT wfh_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));

ALTER TABLE wfh_requests
  ADD COLUMN IF NOT EXISTS cancelled_by  UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS cancelled_at  TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS approved_at   TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS admin_note    TEXT;


-- ============================================================
-- 5. FIX late_requests: cancel columns + approved_at
-- ============================================================

ALTER TABLE late_requests
  ADD COLUMN IF NOT EXISTS cancelled_by  UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS cancelled_at  TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS approved_at   TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS admin_note    TEXT;


-- ============================================================
-- 6. CREATE field_work_requests (if not exists)
-- ============================================================

CREATE TABLE IF NOT EXISTS field_work_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id   UUID REFERENCES employees(id) NOT NULL,
  date          DATE NOT NULL,
  is_half_day   BOOLEAN DEFAULT FALSE,
  location      TEXT NOT NULL,
  reason        TEXT,
  status        VARCHAR(20) DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by   UUID REFERENCES employees(id),
  approved_at   TIMESTAMP WITH TIME ZONE,
  cancelled_by  UUID REFERENCES employees(id),
  cancelled_at  TIMESTAMP WITH TIME ZONE,
  cancel_reason TEXT,
  admin_note    TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_work_employee ON field_work_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_field_work_date     ON field_work_requests(date);
CREATE INDEX IF NOT EXISTS idx_field_work_status   ON field_work_requests(status);

-- Trigger
DROP TRIGGER IF EXISTS update_field_work_updated_at ON field_work_requests;
CREATE TRIGGER update_field_work_updated_at
  BEFORE UPDATE ON field_work_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE field_work_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "field_work_select_own"    ON field_work_requests;
DROP POLICY IF EXISTS "field_work_insert_own"    ON field_work_requests;
DROP POLICY IF EXISTS "field_work_update_admin"  ON field_work_requests;
DROP POLICY IF EXISTS "field_work_select_admin"  ON field_work_requests;

CREATE POLICY "field_work_select_own" ON field_work_requests
  FOR SELECT TO authenticated
  USING (employee_id = auth.uid()
    OR public.get_my_role() IN ('admin', 'supervisor'));

CREATE POLICY "field_work_insert_own" ON field_work_requests
  FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid()
    OR public.get_my_role() IN ('admin', 'supervisor'));

CREATE POLICY "field_work_update_admin" ON field_work_requests
  FOR UPDATE TO authenticated
  USING (employee_id = auth.uid()
    OR public.get_my_role() IN ('admin', 'supervisor'));

GRANT ALL ON field_work_requests TO authenticated;


-- ============================================================
-- 7. Add approved_at column to ot_requests (if missing)
--    (some rows may have been approved before this column existed)
-- ============================================================

-- Backfill approved_at from updated_at for already-approved OT records
UPDATE ot_requests
SET approved_at = updated_at
WHERE approved_at IS NULL
  AND approved_by IS NOT NULL
  AND status IN ('approved', 'completed');


-- ============================================================
-- Done!
-- ============================================================
SELECT 'Migration 20260226000000 completed successfully!' AS message;
