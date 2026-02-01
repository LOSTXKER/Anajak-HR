-- ===========================================
-- Production Update Migration
-- รันใน Supabase Dashboard > SQL Editor
-- ===========================================

-- 1. Fix infinite recursion in employees RLS
-- -----------------------------------------

-- Create helper function (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.employees WHERE id = auth.uid()
$$;

-- Drop old problematic policies on employees
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'employees'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON employees', pol.policyname);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Create new non-recursive policies
CREATE POLICY "employees_select_own" ON employees FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "employees_select_admin" ON employees FOR SELECT TO authenticated
  USING (public.get_my_role() IN ('admin', 'supervisor'));

CREATE POLICY "employees_update_own" ON employees FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "employees_update_admin" ON employees FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin');

CREATE POLICY "employees_insert" ON employees FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "employees_delete_admin" ON employees FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');


-- 2. Create system_settings table (if not exists)
-- ------------------------------------------------

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Only admins can view settings" ON system_settings;
DROP POLICY IF EXISTS "Only admins can update settings" ON system_settings;
DROP POLICY IF EXISTS "Only admins can insert settings" ON system_settings;
DROP POLICY IF EXISTS "Service role can read settings" ON system_settings;

-- Create new policies using get_my_role()
CREATE POLICY "settings_select" ON system_settings FOR SELECT 
  USING (true);  -- Everyone can read settings

CREATE POLICY "settings_update_admin" ON system_settings FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin');

CREATE POLICY "settings_insert_admin" ON system_settings FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');

GRANT SELECT ON system_settings TO anon, authenticated;
GRANT UPDATE, INSERT ON system_settings TO authenticated;

-- Insert default settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('work_start_time', '09:00', 'เวลาเข้างานมาตรฐาน'),
  ('work_end_time', '18:00', 'เวลาเลิกงานมาตรฐาน'),
  ('late_threshold_minutes', '15', 'เกณฑ์มาสาย (นาที)'),
  ('require_photo', 'true', 'บังคับถ่ายรูปเมื่อเช็คอิน'),
  ('require_gps', 'true', 'บังคับเปิด GPS'),
  ('require_account_approval', 'true', 'บังคับอนุมัติบัญชีพนักงานก่อนใช้งาน'),
  ('enable_notifications', 'true', 'เปิดการแจ้งเตือน'),
  ('enable_holiday_notifications', 'true', 'เปิดการแจ้งเตือนวันหยุด'),
  ('holiday_notification_days_before', '1', 'แจ้งเตือนล่วงหน้ากี่วัน'),
  ('holiday_notification_time', '09:00', 'เวลาที่ส่งแจ้งเตือน'),
  ('enable_checkin_notifications', 'false', 'เปิดการแจ้งเตือนเมื่อพนักงานเช็คอิน'),
  ('enable_checkout_notifications', 'false', 'เปิดการแจ้งเตือนเมื่อพนักงานเช็คเอาท์'),
  ('auto_checkout_enabled', 'true', 'เปิดใช้งานระบบ Auto Check-out'),
  ('auto_checkout_delay_hours', '4', 'จำนวนชั่วโมงหลังเลิกงานก่อน Auto Check-out')
ON CONFLICT (setting_key) DO NOTHING;


-- 3. Create announcements table (if not exists)
-- ----------------------------------------------

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('general', 'hr', 'payroll', 'holiday', 'urgent')),
  target_type VARCHAR(20) DEFAULT 'all' CHECK (target_type IN ('all', 'branch', 'department', 'employee')),
  target_branch_id UUID REFERENCES branches(id),
  target_employee_ids TEXT[],
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  send_notification BOOLEAN DEFAULT true,
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(announcement_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(published, published_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_announcement_reads_employee ON announcement_reads(employee_id, read_at DESC);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- Announcements policies
CREATE POLICY "announcements_select_published" ON announcements FOR SELECT
  USING (published = true AND deleted_at IS NULL);

CREATE POLICY "announcements_select_admin" ON announcements FOR SELECT TO authenticated
  USING (public.get_my_role() IN ('admin', 'supervisor'));

CREATE POLICY "announcements_insert_admin" ON announcements FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'supervisor'));

CREATE POLICY "announcements_update_admin" ON announcements FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('admin', 'supervisor'));

CREATE POLICY "announcements_delete_admin" ON announcements FOR DELETE TO authenticated
  USING (public.get_my_role() IN ('admin', 'supervisor'));

-- Announcement reads policies
CREATE POLICY "announcement_reads_own" ON announcement_reads FOR SELECT TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "announcement_reads_insert" ON announcement_reads FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "announcement_reads_admin" ON announcement_reads FOR SELECT TO authenticated
  USING (public.get_my_role() IN ('admin', 'supervisor'));

GRANT SELECT ON announcements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON announcements TO authenticated;
GRANT ALL ON announcement_reads TO authenticated;


-- 4. Create triggers
-- ------------------

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION update_announcement_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_announcements_updated_at ON announcements;
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_announcement_updated_at();


-- Done!
-- ===========================================
