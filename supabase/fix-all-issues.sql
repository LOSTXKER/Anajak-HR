-- Fix all database issues
-- Run this in Supabase SQL Editor

-- 1. Add missing columns to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS base_salary DECIMAL(12,2) DEFAULT 0;

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'pending';

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS line_user_id VARCHAR(255);

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS commission DECIMAL(10, 2) DEFAULT 0;

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS is_system_account BOOLEAN DEFAULT FALSE;

-- 2. DISABLE RLS temporarily to fix policies
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;

-- 3. Drop ALL existing policies on employees
DROP POLICY IF EXISTS "Employees can view their own data" ON employees;
DROP POLICY IF EXISTS "All authenticated users can read employees" ON employees;
DROP POLICY IF EXISTS "Allow users to read their own employee data" ON employees;
DROP POLICY IF EXISTS "Users can read own employee data" ON employees;
DROP POLICY IF EXISTS "Admins can read all employees" ON employees;
DROP POLICY IF EXISTS "Admins can update employees" ON employees;
DROP POLICY IF EXISTS "Employee read access" ON employees;
DROP POLICY IF EXISTS "Admin update access" ON employees;
DROP POLICY IF EXISTS "Service role can insert employees" ON employees;

-- 4. Re-enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- 5. Create simple policy - allow all authenticated users to read all employees
-- This is simpler and avoids recursion
CREATE POLICY "Authenticated users can read employees"
  ON employees FOR SELECT
  TO authenticated
  USING (true);

-- 6. Allow authenticated users to update their own data
CREATE POLICY "Users can update own data"
  ON employees FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text);

-- 7. Create system_settings table if not exists
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

-- 3. Fix RLS policies for system_settings
DROP POLICY IF EXISTS "Only admins can view settings" ON system_settings;
DROP POLICY IF EXISTS "Only admins can update settings" ON system_settings;
DROP POLICY IF EXISTS "Only admins can insert settings" ON system_settings;
DROP POLICY IF EXISTS "Only admins can delete settings" ON system_settings;
DROP POLICY IF EXISTS "Service role can read settings" ON system_settings;
DROP POLICY IF EXISTS "Authenticated can read notification settings" ON system_settings;
DROP POLICY IF EXISTS "Authenticated can read work settings" ON system_settings;

-- Allow all authenticated users to read settings
CREATE POLICY "Authenticated can read work settings"
  ON system_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can modify settings
CREATE POLICY "Only admins can update settings"
  ON system_settings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role = 'admin'));

CREATE POLICY "Only admins can insert settings"
  ON system_settings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role = 'admin'));

CREATE POLICY "Only admins can delete settings"
  ON system_settings FOR DELETE
  USING (EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role = 'admin'));

-- 4. Insert default settings if not exists
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('work_start_time', '09:00', 'เวลาเข้างานมาตรฐาน'),
  ('work_end_time', '18:00', 'เวลาเลิกงานมาตรฐาน'),
  ('late_threshold_minutes', '15', 'เกณฑ์มาสาย (นาที)'),
  ('hours_per_day', '8', 'จำนวนชั่วโมงทำงานต่อวัน'),
  ('days_per_month', '26', 'จำนวนวันทำงานต่อเดือน'),
  ('checkin_time_start', '06:00', 'เวลาเริ่มต้นที่อนุญาตให้เช็คอิน'),
  ('checkin_time_end', '12:00', 'เวลาสิ้นสุดที่อนุญาตให้เช็คอิน'),
  ('checkout_time_start', '15:00', 'เวลาเริ่มต้นที่อนุญาตให้เช็คเอาท์'),
  ('checkout_time_end', '22:00', 'เวลาสิ้นสุดที่อนุญาตให้เช็คเอาท์'),
  ('require_photo', 'true', 'บังคับถ่ายรูปเมื่อเช็คอิน'),
  ('require_gps', 'true', 'บังคับเปิด GPS'),
  ('require_account_approval', 'true', 'บังคับอนุมัติบัญชีพนักงานก่อนใช้งาน'),
  ('enable_notifications', 'true', 'เปิดการแจ้งเตือน'),
  ('enable_checkin_notifications', 'true', 'เปิดการแจ้งเตือนเช็คอิน'),
  ('enable_checkout_notifications', 'true', 'เปิดการแจ้งเตือนเช็คเอาท์'),
  ('auto_checkout_enabled', 'true', 'เปิดระบบ auto check-out'),
  ('auto_checkout_delay_hours', '4', 'จำนวนชั่วโมงที่รอก่อนทำ auto check-out'),
  ('auto_checkout_time', '18:00', 'เวลาที่จะบันทึกเป็น clock_out_time'),
  ('reminder_enabled', 'true', 'เปิดการแจ้งเตือนก่อน auto check-out'),
  ('reminder_first_minutes', '15', 'แจ้งเตือนครั้งที่ 1 (นาทีหลังเลิกงาน)'),
  ('reminder_second_minutes', '60', 'แจ้งเตือนครั้งที่ 2 (นาทีหลังเลิกงาน)'),
  ('reminder_third_minutes', '180', 'แจ้งเตือนครั้งที่ 3 (นาทีหลังเลิกงาน)'),
  ('notify_admin_on_auto_checkout', 'true', 'แจ้งเตือน Admin เมื่อมี auto check-out'),
  ('late_deduction_per_minute', '0', 'หักเงินต่อนาทีที่มาสาย (บาท)'),
  ('working_days', '1,2,3,4,5', 'วันทำงาน (0=อาทิตย์, 6=เสาร์)'),
  ('line_channel_access_token', '', 'LINE Channel Access Token'),
  ('line_recipient_id', '', 'LINE User ID หรือ Group ID'),
  ('line_recipient_type', 'group', 'ประเภทผู้รับ (user หรือ group)')
ON CONFLICT (setting_key) DO NOTHING;

SELECT 'All database issues fixed!' as message;
