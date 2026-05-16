-- =============================================================
-- Phase B ROLLBACK Script
-- Use ONLY if Step 3 (RLS swap + NOT NULL) fails or causes issues
-- DO NOT run if only Step 1 or Step 2 is applied — see sections below
-- =============================================================
-- Run via: Supabase Dashboard → SQL Editor → paste + run
-- Author: Vegapunk (Dev) — 2026-05-16
-- =============================================================

-- -------------------------------------------------------
-- ROLLBACK SECTION A: Undo Step 3 RLS policies + NOT NULL
-- Run this if Step 3 fails mid-way or causes auth issues
-- -------------------------------------------------------

BEGIN;

-- 1. Remove NOT NULL constraints (back to nullable)
ALTER TABLE public.employees            ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.branches             ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.attendance_logs      ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.attendance_anomalies ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.leave_requests       ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.leave_balances       ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.ot_requests          ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.wfh_requests         ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.late_requests        ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.field_work_requests  ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.salary_history       ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.announcements        ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.announcement_reads   ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.system_settings      ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.employment_history   ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.employee_badges      ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.employee_points      ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.point_transactions   ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.kpi_periods          ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.kpi_goals            ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.kpi_goal_progress    ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.kpi_evaluations      ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.kpi_evaluation_items ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.kpi_auto_metrics     ALTER COLUMN organization_id DROP NOT NULL;

-- 2. Restore system_settings unique constraint
ALTER TABLE public.system_settings DROP CONSTRAINT IF EXISTS system_settings_key_org_unique;
ALTER TABLE public.system_settings ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);

-- 3. Drop new Phase B RLS policies (organizations table)
DROP POLICY IF EXISTS "organizations_select" ON public.organizations;

-- 4. Drop new RLS policies on employees
DROP POLICY IF EXISTS "employees_select_own_org" ON public.employees;
DROP POLICY IF EXISTS "employees_update_own" ON public.employees;
DROP POLICY IF EXISTS "employees_update_admin" ON public.employees;
DROP POLICY IF EXISTS "employees_insert" ON public.employees;
DROP POLICY IF EXISTS "employees_delete_admin" ON public.employees;

-- 5. Drop new RLS policies on attendance_logs
DROP POLICY IF EXISTS "attendance_logs_select_own_org" ON public.attendance_logs;
DROP POLICY IF EXISTS "attendance_logs_insert_own_org" ON public.attendance_logs;
DROP POLICY IF EXISTS "attendance_logs_update_org" ON public.attendance_logs;
DROP POLICY IF EXISTS "attendance_logs_admin_all" ON public.attendance_logs;

-- 6. Drop new RLS on attendance_anomalies
DROP POLICY IF EXISTS "attendance_anomalies_insert_org" ON public.attendance_anomalies;
DROP POLICY IF EXISTS "attendance_anomalies_admin_org" ON public.attendance_anomalies;

-- 7. Drop new RLS on leave_requests
DROP POLICY IF EXISTS "leave_requests_select_org" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_insert_org" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_update_org" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_admin_all" ON public.leave_requests;

-- 8. Drop new RLS on leave_balances
DROP POLICY IF EXISTS "leave_balances_select_org" ON public.leave_balances;
DROP POLICY IF EXISTS "leave_balances_admin_org" ON public.leave_balances;

-- 9. Drop new RLS on ot_requests
DROP POLICY IF EXISTS "ot_requests_select_org" ON public.ot_requests;
DROP POLICY IF EXISTS "ot_requests_insert_org" ON public.ot_requests;
DROP POLICY IF EXISTS "ot_requests_update_org" ON public.ot_requests;
DROP POLICY IF EXISTS "ot_requests_admin_all" ON public.ot_requests;

-- 10. Drop new RLS on wfh_requests
DROP POLICY IF EXISTS "wfh_requests_select_org" ON public.wfh_requests;
DROP POLICY IF EXISTS "wfh_requests_insert_org" ON public.wfh_requests;
DROP POLICY IF EXISTS "wfh_requests_update_org" ON public.wfh_requests;
DROP POLICY IF EXISTS "wfh_requests_admin_all" ON public.wfh_requests;

-- 11. Drop new RLS on late_requests
DROP POLICY IF EXISTS "late_requests_select_org" ON public.late_requests;
DROP POLICY IF EXISTS "late_requests_insert_org" ON public.late_requests;
DROP POLICY IF EXISTS "late_requests_admin_all" ON public.late_requests;

-- 12. Drop new RLS on field_work_requests
DROP POLICY IF EXISTS "field_work_requests_select_org" ON public.field_work_requests;
DROP POLICY IF EXISTS "field_work_requests_insert_org" ON public.field_work_requests;
DROP POLICY IF EXISTS "field_work_requests_admin_all" ON public.field_work_requests;

-- 13. Drop new RLS on announcements
DROP POLICY IF EXISTS "announcements_select_org" ON public.announcements;
DROP POLICY IF EXISTS "announcements_admin_org" ON public.announcements;

-- 14. Drop new RLS on announcement_reads
DROP POLICY IF EXISTS "announcement_reads_select_org" ON public.announcement_reads;
DROP POLICY IF EXISTS "announcement_reads_insert_org" ON public.announcement_reads;

-- 15. Drop new RLS on system_settings
DROP POLICY IF EXISTS "settings_select_org" ON public.system_settings;
DROP POLICY IF EXISTS "settings_write_admin_org" ON public.system_settings;

-- 16. Drop new RLS on salary_history
DROP POLICY IF EXISTS "salary_history_select_org" ON public.salary_history;
DROP POLICY IF EXISTS "salary_history_write_admin_org" ON public.salary_history;

-- 17. Drop new RLS on employment_history
DROP POLICY IF EXISTS "employment_history_select_org" ON public.employment_history;
DROP POLICY IF EXISTS "employment_history_write_admin_org" ON public.employment_history;

-- 18. Drop new RLS on gamification tables
DROP POLICY IF EXISTS "employee_badges_select_org" ON public.employee_badges;
DROP POLICY IF EXISTS "employee_badges_write_admin_org" ON public.employee_badges;
DROP POLICY IF EXISTS "employee_points_select_org" ON public.employee_points;
DROP POLICY IF EXISTS "employee_points_write_admin_org" ON public.employee_points;
DROP POLICY IF EXISTS "point_transactions_select_org" ON public.point_transactions;
DROP POLICY IF EXISTS "point_transactions_write_admin_org" ON public.point_transactions;

-- 19. Drop new RLS on KPI tables
DROP POLICY IF EXISTS "kpi_periods_select_org" ON public.kpi_periods;
DROP POLICY IF EXISTS "kpi_periods_write_admin_org" ON public.kpi_periods;
DROP POLICY IF EXISTS "kpi_goals_select_org" ON public.kpi_goals;
DROP POLICY IF EXISTS "kpi_goals_insert_org" ON public.kpi_goals;
DROP POLICY IF EXISTS "kpi_goals_admin_org" ON public.kpi_goals;
DROP POLICY IF EXISTS "kpi_goal_progress_select_org" ON public.kpi_goal_progress;
DROP POLICY IF EXISTS "kpi_goal_progress_insert_org" ON public.kpi_goal_progress;
DROP POLICY IF EXISTS "kpi_evaluations_select_org" ON public.kpi_evaluations;
DROP POLICY IF EXISTS "kpi_evaluations_write_org" ON public.kpi_evaluations;
DROP POLICY IF EXISTS "kpi_eval_items_select_org" ON public.kpi_evaluation_items;
DROP POLICY IF EXISTS "kpi_eval_items_write_org" ON public.kpi_evaluation_items;
DROP POLICY IF EXISTS "kpi_auto_metrics_select_org" ON public.kpi_auto_metrics;
DROP POLICY IF EXISTS "kpi_auto_metrics_admin_org" ON public.kpi_auto_metrics;

-- 20. Restore ORIGINAL RLS policies on key tables
--     (from supabase/rls/*.sql — pre-Phase-B)

-- employees (original)
CREATE POLICY IF NOT EXISTS "Employee can read own data"
ON public.employees FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY IF NOT EXISTS "Admin can read all employees"
ON public.employees FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e2
    WHERE e2.id = auth.uid() AND e2.role = 'admin'
  )
);

-- attendance_logs (original)
CREATE POLICY IF NOT EXISTS "Employee can read own attendance"
ON public.attendance_logs FOR SELECT TO authenticated
USING (employee_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Employee can insert own attendance"
ON public.attendance_logs FOR INSERT TO authenticated
WITH CHECK (employee_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Employee can update own attendance"
ON public.attendance_logs FOR UPDATE TO authenticated
USING (employee_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Admin can manage all attendance"
ON public.attendance_logs FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- leave_requests (original)
CREATE POLICY IF NOT EXISTS "Employee can read own leave requests"
ON public.leave_requests FOR SELECT TO authenticated
USING (employee_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Employee can insert own leave requests"
ON public.leave_requests FOR INSERT TO authenticated
WITH CHECK (employee_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Employee can update own leave requests"
ON public.leave_requests FOR UPDATE TO authenticated
USING (employee_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Admin can manage all leave requests"
ON public.leave_requests FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = auth.uid() AND role = 'admin'
  )
);

COMMIT;

-- -------------------------------------------------------
-- ROLLBACK SECTION B: Undo Step 2 backfill (set back to NULL)
-- Run ONLY if Step 2 caused issues AND Step 3 not yet applied
-- WARNING: This nullifies all organization_id — app still works
--          because columns are nullable after Section A above
-- -------------------------------------------------------
-- Uncomment if needed:
-- UPDATE public.employees            SET organization_id = NULL;
-- UPDATE public.branches             SET organization_id = NULL;
-- UPDATE public.attendance_logs      SET organization_id = NULL;
-- UPDATE public.attendance_anomalies SET organization_id = NULL;
-- UPDATE public.leave_requests       SET organization_id = NULL;
-- UPDATE public.leave_balances       SET organization_id = NULL;
-- UPDATE public.ot_requests          SET organization_id = NULL;
-- UPDATE public.wfh_requests         SET organization_id = NULL;
-- UPDATE public.late_requests        SET organization_id = NULL;
-- UPDATE public.field_work_requests  SET organization_id = NULL;
-- UPDATE public.salary_history       SET organization_id = NULL;
-- UPDATE public.announcements        SET organization_id = NULL;
-- UPDATE public.announcement_reads   SET organization_id = NULL;
-- UPDATE public.system_settings      SET organization_id = NULL;
-- UPDATE public.employment_history   SET organization_id = NULL;
-- UPDATE public.employee_badges      SET organization_id = NULL;
-- UPDATE public.employee_points      SET organization_id = NULL;
-- UPDATE public.point_transactions   SET organization_id = NULL;
-- UPDATE public.kpi_periods          SET organization_id = NULL;
-- UPDATE public.kpi_goals            SET organization_id = NULL;
-- UPDATE public.kpi_goal_progress    SET organization_id = NULL;
-- UPDATE public.kpi_evaluations      SET organization_id = NULL;
-- UPDATE public.kpi_evaluation_items SET organization_id = NULL;
-- UPDATE public.kpi_auto_metrics     SET organization_id = NULL;

-- -------------------------------------------------------
-- ROLLBACK SECTION C: Undo Step 1 (drop organization_id columns + table)
-- Run ONLY if Step 1 needs to be fully reverted
-- WARNING: This drops all organization_id columns and the organizations table
-- -------------------------------------------------------
-- Uncomment if needed:
-- ALTER TABLE public.employees            DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE public.branches             DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE public.attendance_logs      DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE public.attendance_anomalies DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE public.leave_requests       DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE public.leave_balances       DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE public.ot_requests          DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE public.wfh_requests         DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE public.late_requests        DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE public.field_work_requests  DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE public.salary_history       DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE public.announcements        DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE public.announcement_reads   DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE public.system_settings      DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE public.employment_history   DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE public.employee_badges      DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE public.employee_points      DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE public.point_transactions   DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE public.kpi_periods          DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE public.kpi_goals            DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE public.kpi_goal_progress    DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE public.kpi_evaluations      DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE public.kpi_evaluation_items DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE public.kpi_auto_metrics     DROP COLUMN IF EXISTS organization_id;
-- DROP TABLE IF EXISTS public.organizations;
-- DROP FUNCTION IF EXISTS public.current_user_org();
-- DROP FUNCTION IF EXISTS public.is_admin_in_org(uuid);
-- DROP FUNCTION IF EXISTS public.is_supervisor_or_admin_in_org(uuid);
