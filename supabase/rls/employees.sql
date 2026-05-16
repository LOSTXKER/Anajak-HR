-- =============================================================
-- RLS Policies: employees table
-- Source: fix-infinite-recursion.sql (reconciled Phase A 2026-05-16)
-- =============================================================

-- Helper function to avoid recursive policy lookups
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.employees WHERE id = auth.uid()
$$;

-- Drop all existing policies on employees (run this first if re-applying)
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'employees'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON employees', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Own data read
CREATE POLICY "employees_select_own"
ON employees FOR SELECT TO authenticated
USING (id = auth.uid());

-- Admin/Supervisor read all
CREATE POLICY "employees_select_admin"
ON employees FOR SELECT TO authenticated
USING (public.get_my_role() IN ('admin', 'supervisor'));

-- Own data update
CREATE POLICY "employees_update_own"
ON employees FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admin update all
CREATE POLICY "employees_update_admin"
ON employees FOR UPDATE TO authenticated
USING (public.get_my_role() = 'admin');

-- New employee registration
CREATE POLICY "employees_insert"
ON employees FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- Admin delete
CREATE POLICY "employees_delete_admin"
ON employees FOR DELETE TO authenticated
USING (public.get_my_role() = 'admin');
