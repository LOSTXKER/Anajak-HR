-- =============================================================
-- RLS Policies: system_settings
-- Source: fix-settings-rls.sql + fix-rls-security.sql
--         (reconciled Phase A 2026-05-16)
-- =============================================================

DROP POLICY IF EXISTS "Only admins can view settings" ON system_settings;
DROP POLICY IF EXISTS "Only admins can update settings" ON system_settings;
DROP POLICY IF EXISTS "Only admins can insert settings" ON system_settings;
DROP POLICY IF EXISTS "Service role can read settings" ON system_settings;
DROP POLICY IF EXISTS "Authenticated can read work settings" ON system_settings;
DROP POLICY IF EXISTS "settings_select_filtered" ON system_settings;

-- Non-admins get filtered view (no sensitive keys like LINE token)
-- Requires get_my_role() from supabase/rls/employees.sql
CREATE POLICY "settings_select_filtered"
ON system_settings FOR SELECT TO authenticated
USING (
  public.get_my_role() IN ('admin', 'supervisor')
  OR
  setting_key NOT IN (
    'line_channel_access_token',
    'line_recipient_id',
    'line_recipient_type',
    'vapid_public_key',
    'vapid_private_key'
  )
);

CREATE POLICY "Only admins can update settings"
ON system_settings FOR UPDATE
USING (EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role = 'admin'));

CREATE POLICY "Only admins can insert settings"
ON system_settings FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role = 'admin'));

CREATE POLICY "Only admins can delete settings"
ON system_settings FOR DELETE
USING (EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role = 'admin'));
