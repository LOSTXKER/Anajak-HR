-- =============================================================
-- RLS Policies: holidays
-- Status: APPLIED 2026-05-16 — policies live in production DB
-- Source: fix-holidays-rls.sql (reconciled Phase A 2026-05-16)
-- Note: multi-entity.sql (archived) had duplicate holidays section — this file is canonical
-- DB state (2026-05-16): has 3 duplicate SELECT policies — will be cleaned by migration 20260517000007
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
