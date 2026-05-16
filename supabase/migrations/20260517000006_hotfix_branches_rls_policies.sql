-- =============================================================
-- Hotfix: Add missing RLS policies for branches table
-- Applied: 2026-05-16
--
-- Root cause:
--   branches table had only one policy:
--   "Allow service role to manage branches" (FOR ALL, service_role only)
--
--   The policies defined in rls/multi-entity.sql
--   ("Allow read branches" + "Admins can manage branches")
--   were NEVER applied to production DB — only existed as local files.
--
--   Symptom: authenticated users (including admin) got 0 rows when
--   querying branches, despite data existing in the table.
--
-- Fix:
--   Add two policies matching rls/multi-entity.sql definitions.
--   Reversible: DROP POLICY to rollback.
--
-- Rollback:
--   DROP POLICY "Allow read branches" ON branches;
--   DROP POLICY "Admins can manage branches" ON branches;
-- =============================================================

-- Allow all authenticated users to read branches
CREATE POLICY "Allow read branches" ON branches
  FOR SELECT TO authenticated
  USING (true);

-- Allow admin employees to insert/update/delete branches
CREATE POLICY "Admins can manage branches" ON branches
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role = 'admin')
  );
