-- Fix infinite recursion in RLS policies for employees table
-- Run this in Supabase SQL Editor

-- Step 1: Drop ALL existing policies on employees table
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'employees'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON employees', pol.policyname);
    END LOOP;
END $$;

-- Step 2: Temporarily disable RLS
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;

-- Step 3: Re-enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple, non-recursive policies

-- Policy 1: Users can read their own data (using auth.uid() directly)
CREATE POLICY "employees_select_own"
ON employees FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Policy 2: Admins/Supervisors can read all employees
-- Using a security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.employees WHERE id = auth.uid()
$$;

CREATE POLICY "employees_select_admin"
ON employees FOR SELECT
TO authenticated
USING (
  public.get_my_role() IN ('admin', 'supervisor')
);

-- Policy 3: Users can update their own basic info
CREATE POLICY "employees_update_own"
ON employees FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy 4: Admins can update all employees
CREATE POLICY "employees_update_admin"
ON employees FOR UPDATE
TO authenticated
USING (public.get_my_role() = 'admin');

-- Policy 5: Allow insert for new registrations
CREATE POLICY "employees_insert"
ON employees FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Policy 6: Admins can delete employees
CREATE POLICY "employees_delete_admin"
ON employees FOR DELETE
TO authenticated
USING (public.get_my_role() = 'admin');

-- Verify policies
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'employees';

