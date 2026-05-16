-- =============================================================
-- Migration: cleanup duplicate SELECT policies on holidays table
-- Date: 2026-05-17
-- Reason: DB had 3 identical SELECT policies (qual=true, TO authenticated)
--   - holidays_read
--   - Allow read holidays
--   - All authenticated users can read holidays
--   All three allow any authenticated user to read all holidays with no condition.
--   Keeping: holidays_read (cleanest name)
--   Dropping: the other two
-- Verification: After apply, holidays should have exactly 2 policies:
--   1. holidays_read (SELECT, authenticated, qual=true)
--   2. Admins can manage holidays (ALL, authenticated, admin check)
-- =============================================================

BEGIN;

-- Verify before dropping (safety check — will error if policy doesn't exist)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'holidays'
      AND policyname = 'holidays_read'
  ) THEN
    RAISE EXCEPTION 'holidays_read policy not found — aborting cleanup to prevent data loss';
  END IF;
END $$;

-- Drop the two duplicate SELECT policies
DROP POLICY IF EXISTS "Allow read holidays" ON public.holidays;
DROP POLICY IF EXISTS "All authenticated users can read holidays" ON public.holidays;

COMMIT;
