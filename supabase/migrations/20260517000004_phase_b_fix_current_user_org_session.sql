-- =============================================================
-- Phase B Fix: current_user_org() reads JWT app_metadata first
-- Applied: 2026-05-17 — fixes multi-tenant isolation bug where
-- OrgSwitcher cookie was ignored by Postgres RLS function.
--
-- Root cause: previous current_user_org() always returned
-- employees.organization_id (home org), never reading selected org.
--
-- Fix: read auth.jwt() -> 'app_metadata' ->> 'selected_org_id' first.
-- This is set by /api/auth/switch-org via Supabase service-role admin API.
-- JWT is refreshed client-side before reload, so RLS sees new value.
--
-- Fallback: if no selected_org_id in JWT (first login, no switch ever),
-- fall back to employees.organization_id (home org, backward compat).
--
-- Security: /api/auth/switch-org validates:
--   1. caller is authenticated
--   2. caller is admin (role = 'admin')
--   3. target org_id is in known list
-- Non-admin users cannot switch orgs → their JWT never gets selected_org_id
-- set by this mechanism, so they always see home org only.
-- =============================================================

CREATE OR REPLACE FUNCTION public.current_user_org()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_selected_org uuid;
  v_home_org     uuid;
BEGIN
  -- 1. Try selected org from JWT app_metadata (set by admin org switch)
  BEGIN
    v_selected_org := NULLIF(
      (auth.jwt() -> 'app_metadata' ->> 'selected_org_id'),
      ''
    )::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_selected_org := NULL;
  END;

  IF v_selected_org IS NOT NULL THEN
    RETURN v_selected_org;
  END IF;

  -- 2. Fallback: home org from employees table
  SELECT organization_id
    INTO v_home_org
    FROM public.employees
   WHERE id = auth.uid()
   LIMIT 1;

  RETURN v_home_org;
END;
$$;

-- Re-grant execute (function replaced, grants may be reset)
GRANT EXECUTE ON FUNCTION public.current_user_org() TO authenticated;

-- ---------------------------------------------------------------
-- NOTE: is_admin_in_org() and is_supervisor_or_admin_in_org()
-- are unchanged — they still check employees.organization_id which
-- is the home org. This is intentional: an admin switching to iBear
-- is "viewing as iBear" but their admin permission is still checked
-- against their actual home org record.
--
-- If cross-org admin actions are needed in future, revisit this.
-- ---------------------------------------------------------------
