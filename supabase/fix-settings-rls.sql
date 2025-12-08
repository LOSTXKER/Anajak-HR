-- แก้ไข RLS Policy สำหรับ system_settings เพื่อให้ service role เข้าถึงได้

-- Drop existing policies
DROP POLICY IF EXISTS "Only admins can view settings" ON system_settings;
DROP POLICY IF EXISTS "Only admins can update settings" ON system_settings;
DROP POLICY IF EXISTS "Only admins can insert settings" ON system_settings;
DROP POLICY IF EXISTS "Service role can read settings" ON system_settings;

-- Recreate policies
-- Only admins can view/edit settings (via web UI)
CREATE POLICY "Only admins can view settings"
  ON system_settings FOR SELECT
  USING (EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role = 'admin'));

CREATE POLICY "Only admins can update settings"
  ON system_settings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role = 'admin'));

CREATE POLICY "Only admins can insert settings"
  ON system_settings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role = 'admin'));

-- Allow service role to read settings (for API routes / backend)
-- Service role uses SUPABASE_SERVICE_ROLE_KEY and bypasses RLS by default
-- But we add this policy for completeness
CREATE POLICY "Service role can read settings"
  ON system_settings FOR SELECT
  USING (auth.jwt()->>'role' = 'service_role');

-- Also allow authenticated users to read specific notification-related settings
DROP POLICY IF EXISTS "Authenticated can read notification settings" ON system_settings;
CREATE POLICY "Authenticated can read notification settings"
  ON system_settings FOR SELECT
  USING (
    auth.role() = 'authenticated' AND 
    setting_key IN ('enable_notifications', 'line_channel_access_token', 'line_recipient_id', 'line_recipient_type')
  );

SELECT 'RLS Policies for system_settings updated!' as message;

