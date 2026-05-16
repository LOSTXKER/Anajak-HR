-- =============================================================
-- RLS Helper Functions: Organization-aware helpers
-- Phase B Step 1 — write only, NOT APPLIED until Step 3
-- =============================================================

-- -------------------------------------------------------
-- current_user_org()
-- Returns organization_id of the currently authenticated user.
-- Strategy: read employees.organization_id for auth.uid()
--           (post-Step-2 backfill this will always return Anajak UUID
--            for existing users; new users must have org set at registration)
-- Used by: all tenant-table RLS policies in _phase_b_step3_rewrite.sql
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_org()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id
  FROM public.employees
  WHERE id = auth.uid()
  LIMIT 1
$$;

-- Grant execute to authenticated role
GRANT EXECUTE ON FUNCTION public.current_user_org() TO authenticated;

-- -------------------------------------------------------
-- is_admin_in_org(org_id uuid)
-- Returns true if current user is admin AND belongs to org_id.
-- Used by policies that allow admin-level writes.
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin_in_org(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees
    WHERE id = auth.uid()
      AND role = 'admin'
      AND organization_id = org_id
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_in_org(uuid) TO authenticated;

-- -------------------------------------------------------
-- is_supervisor_or_admin_in_org(org_id uuid)
-- Returns true if current user is supervisor or admin in org_id.
-- Used by policies that allow supervisor-level reads.
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_supervisor_or_admin_in_org(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees
    WHERE id = auth.uid()
      AND role IN ('admin', 'supervisor')
      AND organization_id = org_id
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_supervisor_or_admin_in_org(uuid) TO authenticated;

-- -------------------------------------------------------
-- NOTE: These functions depend on employees.organization_id
-- being populated (Step 2 backfill). During Step 1 the column
-- is nullable — current_user_org() may return NULL for existing users.
-- The app falls back to cookie-based org selection during this window.
-- -------------------------------------------------------
