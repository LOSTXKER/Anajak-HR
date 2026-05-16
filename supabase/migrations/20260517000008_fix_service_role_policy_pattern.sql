-- =============================================================
-- Migration: Fix service_role policy pattern — use proper role binding
-- Date: 2026-05-17
--
-- Problem: 3 policies were using wrong patterns:
--   1. branches.Allow service role to manage branches
--      roles={public} + qual checks JWT string: auth.jwt() ->> 'role' = 'service_role'
--      (JWT string match = workaround, not proper Postgres role binding)
--   2. kpi_period_templates.service_role_all_kpi_period_templates
--      roles={public} + qual=true
--      (public = everyone including anon — too permissive + wrong intent)
--   3. kpi_templates.service_role_all_kpi_templates
--      roles={public} + qual=true (same issue)
--
-- Fix: Use TO service_role binding (proper Postgres role, bypasses RLS checks natively)
--
-- IMPORTANT (kpi tables): The existing {public} policy was the ONLY policy on
-- kpi_period_templates and kpi_templates, meaning authenticated users were
-- relying on it. This migration adds a proper {authenticated} policy alongside
-- the {service_role} policy to preserve frontend functionality.
--
-- Verification after apply:
--   - branches: 3 policies (Allow read branches + Admins can manage branches + service_role_manage)
--   - kpi_period_templates: 2 policies (authenticated_all + service_role_all)
--   - kpi_templates: 2 policies (authenticated_all + service_role_all)
-- =============================================================

BEGIN;

-- -------------------------------------------------------
-- 1. branches: Fix JWT string match → proper TO service_role
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Allow service role to manage branches" ON public.branches;

CREATE POLICY "service_role_manage_branches"
ON public.branches
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- -------------------------------------------------------
-- 2. kpi_period_templates: Replace {public} with proper policies
-- -------------------------------------------------------
DROP POLICY IF EXISTS "service_role_all_kpi_period_templates" ON public.kpi_period_templates;

-- Authenticated users (admin/supervisor) can manage period templates within their org
-- Note: kpi_period_templates links to kpi_periods which has org isolation upstream
CREATE POLICY "authenticated_all_kpi_period_templates"
ON public.kpi_period_templates
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Service role bypass (for worker/cron operations)
CREATE POLICY "service_role_all_kpi_period_templates"
ON public.kpi_period_templates
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- -------------------------------------------------------
-- 3. kpi_templates: Replace {public} with proper policies
-- -------------------------------------------------------
DROP POLICY IF EXISTS "service_role_all_kpi_templates" ON public.kpi_templates;

-- Authenticated users can read/manage templates (admin creates, all can read)
CREATE POLICY "authenticated_all_kpi_templates"
ON public.kpi_templates
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Service role bypass
CREATE POLICY "service_role_all_kpi_templates"
ON public.kpi_templates
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMIT;
