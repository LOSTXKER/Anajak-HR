-- =============================================================
-- RLS Policies: system_settings — LOCAL DEV ONLY (permissive)
-- Source: fix-settings-rls-local.sql (reconciled Phase A 2026-05-16)
-- WARNING: ห้ามรันใน production — ไม่มีการ restrict ใดๆ
-- =============================================================

DROP POLICY IF EXISTS "Only admins can view settings" ON system_settings;
DROP POLICY IF EXISTS "Only admins can update settings" ON system_settings;
DROP POLICY IF EXISTS "Only admins can insert settings" ON system_settings;
DROP POLICY IF EXISTS "Service role can read settings" ON system_settings;
DROP POLICY IF EXISTS "settings_select_filtered" ON system_settings;

CREATE POLICY "allow_read_settings" ON system_settings FOR SELECT USING (true);
CREATE POLICY "allow_update_settings" ON system_settings FOR UPDATE USING (true);
CREATE POLICY "allow_insert_settings" ON system_settings FOR INSERT WITH CHECK (true);

GRANT SELECT, UPDATE, INSERT ON system_settings TO anon, authenticated;
