-- Allow all authenticated users to read basic employee data.
-- This is needed for features like leaderboard, announcements, and request approvals.
-- The existing employees_select_own and employees_select_admin policies are kept as-is.
-- Adding a broader read policy so staff can see other employees' names.

CREATE POLICY "employees_select_authenticated" ON employees
    FOR SELECT TO authenticated USING (true);

-- The above policy is more permissive than employees_select_own and employees_select_admin.
-- We can optionally drop the narrower ones, but keeping them doesn't hurt (OR logic).
