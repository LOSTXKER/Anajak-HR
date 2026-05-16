-- =============================================================
-- RLS Policies: holidays
-- Source: fix-holidays-rls.sql (reconciled Phase A 2026-05-16)
-- Note: Also covered in multi-entity.sql — use either, not both
-- =============================================================

DROP POLICY IF EXISTS "Allow anyone to read holidays" ON holidays;
DROP POLICY IF EXISTS "Allow service role to manage holidays" ON holidays;
DROP POLICY IF EXISTS "Anyone can view holidays" ON holidays;
DROP POLICY IF EXISTS "Admins can manage holidays" ON holidays;
DROP POLICY IF EXISTS "All authenticated users can read holidays" ON holidays;

CREATE POLICY "All authenticated users can read holidays"
ON holidays FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage holidays"
ON holidays FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.id::text = auth.uid()::text
    AND employees.role = 'admin'
  )
);
