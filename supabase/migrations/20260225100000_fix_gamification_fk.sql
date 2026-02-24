-- Fix missing FK constraints on gamification tables
-- This allows PostgREST to detect relationships for join queries

-- employee_points -> employees
ALTER TABLE employee_points
  ADD CONSTRAINT employee_points_employee_id_fkey
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

-- employee_badges -> employees
ALTER TABLE employee_badges
  ADD CONSTRAINT employee_badges_employee_id_fkey
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

-- employee_badges -> badge_definitions
ALTER TABLE employee_badges
  ADD CONSTRAINT employee_badges_badge_id_fkey
  FOREIGN KEY (badge_id) REFERENCES badge_definitions(id) ON DELETE CASCADE;

-- point_transactions -> employees
ALTER TABLE point_transactions
  ADD CONSTRAINT point_transactions_employee_id_fkey
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
