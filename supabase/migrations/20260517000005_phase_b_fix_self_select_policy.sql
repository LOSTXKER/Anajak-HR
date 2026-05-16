-- =============================================================
-- Phase B Fix: add employees_select_self policy
-- Applied: 2026-05-16 — fixes cross-org admin self-fetch PGRST116
--
-- Root cause:
--   employees_select_own_org uses:
--   USING ((organization_id = current_user_org()) AND (id = auth.uid() OR is_supervisor...))
--
--   When admin switches to iBear:
--     - current_user_org() = iBear UUID (correct — JWT fix working)
--     - admin's own record has organization_id = Anajak (home org)
--     - Anajak ≠ iBear → 0 rows → PGRST116 at auth-context.tsx:114
--
-- Fix:
--   Add separate policy that lets every user always see their own row,
--   regardless of which org is currently selected.
--
--   PostgreSQL RLS = OR logic across policies.
--   Pass any one policy → row is visible.
--   New policy: id = auth.uid() (strict — only own record, no org join)
--
-- Security:
--   This policy ONLY matches rows WHERE id = auth.uid().
--   It cannot expose other users' records.
--   Isolation between orgs is still enforced by employees_select_own_org
--   for all other rows (staff/employees list).
--
-- No destructive changes:
--   - No DROP of existing policies
--   - No DEFAULT / NOT NULL changes
--   - No schema changes
-- =============================================================

CREATE POLICY "employees_select_self" ON public.employees
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Verify policy count after apply (expected: 5 → 6 policies on employees)
-- SELECT COUNT(*) FROM pg_policies WHERE tablename = 'employees';
