-- ===========================================
-- Fix RLS Security Issues
-- รันใน Supabase Dashboard > SQL Editor
-- ===========================================

-- 1. Fix system_settings RLS - filter sensitive settings for non-admins
-- ----------------------------------------------------------------

-- Drop existing select policies on system_settings
DROP POLICY IF EXISTS "settings_select" ON system_settings;
DROP POLICY IF EXISTS "Authenticated can read work settings" ON system_settings;
DROP POLICY IF EXISTS "Service role can read settings" ON system_settings;

-- Create new policy that filters sensitive settings for non-admins
-- Sensitive settings: line_channel_access_token, line_recipient_id, etc.
CREATE POLICY "settings_select_filtered" ON system_settings FOR SELECT TO authenticated
  USING (
    -- Admins can see everything
    public.get_my_role() IN ('admin', 'supervisor')
    OR
    -- Non-admins can see non-sensitive settings only
    setting_key NOT IN (
      'line_channel_access_token',
      'line_recipient_id',
      'line_recipient_type',
      'vapid_public_key',
      'vapid_private_key'
    )
  );

-- Allow anon to read only non-sensitive settings (for pre-login pages)
CREATE POLICY "settings_select_anon" ON system_settings FOR SELECT TO anon
  USING (
    setting_key NOT IN (
      'line_channel_access_token',
      'line_recipient_id',
      'line_recipient_type',
      'vapid_public_key',
      'vapid_private_key'
    )
  );


-- 2. Fix employees RLS - restrict access to own data + admin/supervisor
-- ----------------------------------------------------------------

-- Drop existing select policies on employees
DROP POLICY IF EXISTS "Authenticated users can read employees" ON employees;
DROP POLICY IF EXISTS "employees_select_own" ON employees;
DROP POLICY IF EXISTS "employees_select_admin" ON employees;

-- Create new policies for employees table
-- Users can see their own full data
CREATE POLICY "employees_select_own" ON employees FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Admins and supervisors can see all employees
CREATE POLICY "employees_select_admin" ON employees FOR SELECT TO authenticated
  USING (public.get_my_role() IN ('admin', 'supervisor'));

-- Regular employees can see basic info of other employees (name, email for collaboration)
-- But not sensitive data like salary, phone, etc.
-- This is handled via separate views or API filtering instead


-- 3. Add index for performance
-- ----------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);


-- Done!
-- ===========================================
-- NOTE: After running this, non-admin users will only see:
-- 1. Their own employee record (full access)
-- 2. Non-sensitive system settings
-- 
-- Admins/Supervisors can see:
-- 1. All employee records
-- 2. All system settings including sensitive ones
-- ===========================================
