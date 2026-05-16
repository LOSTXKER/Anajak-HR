-- =============================================================
-- Phase B Step 3: Full RLS policy rewrite with org isolation
-- Status: APPLIED 2026-05-16 — all policies live in production DB
-- Pre-requisites (all satisfied):
--   1. Step 1 migration applied (organizations table + nullable org columns)
--   2. Step 2 backfill complete (all organization_id = Anajak UUID)
--   3. _organization_helpers.sql applied (current_user_org() etc.)
--   4. NOT NULL constraints added (separate statement below)
-- ATOMIC: wrapped in BEGIN/COMMIT — full rollback if any statement fails
-- NOTE: This file supersedes (archived): employees.sql, requests.sql,
--       system-settings.sql, multi-entity.sql (attendance/branches portion)
-- =============================================================

BEGIN;

-- -------------------------------------------------------
-- 0. Finalize NOT NULL constraints (run AFTER Step 2 backfill)
-- -------------------------------------------------------
-- system_settings: replace single-column unique with composite
ALTER TABLE public.system_settings DROP CONSTRAINT IF EXISTS system_settings_setting_key_key;
ALTER TABLE public.system_settings ADD CONSTRAINT system_settings_key_org_unique UNIQUE (setting_key, organization_id);

-- Add NOT NULL to all tenant tables
ALTER TABLE public.employees            ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.branches             ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.attendance_logs      ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.attendance_anomalies ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.leave_requests       ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.leave_balances       ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.ot_requests          ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.wfh_requests         ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.late_requests        ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.field_work_requests  ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.salary_history       ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.announcements        ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.announcement_reads   ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.system_settings      ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.employment_history   ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.employee_badges      ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.employee_points      ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.point_transactions   ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.kpi_periods          ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.kpi_goals            ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.kpi_goal_progress    ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.kpi_evaluations      ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.kpi_evaluation_items ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.kpi_auto_metrics     ALTER COLUMN organization_id SET NOT NULL;

-- -------------------------------------------------------
-- 1. organizations — admins read all orgs they belong to
-- -------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizations_select" ON public.organizations;
CREATE POLICY "organizations_select"
ON public.organizations FOR SELECT TO authenticated
USING (
  id = public.current_user_org()
  OR public.is_admin_in_org(id)
);

-- -------------------------------------------------------
-- 2. employees — org-scoped
-- -------------------------------------------------------
-- Drop existing policies
DO $$ DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'employees'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON employees', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "employees_select_own_org"
ON public.employees FOR SELECT TO authenticated
USING (
  organization_id = public.current_user_org()
  AND (
    id = auth.uid()
    OR public.is_supervisor_or_admin_in_org(organization_id)
  )
);

CREATE POLICY "employees_update_own"
ON public.employees FOR UPDATE TO authenticated
USING (id = auth.uid() AND organization_id = public.current_user_org())
WITH CHECK (id = auth.uid() AND organization_id = public.current_user_org());

CREATE POLICY "employees_update_admin"
ON public.employees FOR UPDATE TO authenticated
USING (public.is_admin_in_org(organization_id));

CREATE POLICY "employees_insert"
ON public.employees FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "employees_delete_admin"
ON public.employees FOR DELETE TO authenticated
USING (public.is_admin_in_org(organization_id));

-- -------------------------------------------------------
-- 3. attendance_logs — org-scoped
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Employee can read own attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Employee can insert own attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Employee can update own attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Admin can manage all attendance" ON attendance_logs;

CREATE POLICY "attendance_logs_select_own_org"
ON public.attendance_logs FOR SELECT TO authenticated
USING (
  organization_id = public.current_user_org()
  AND (
    employee_id = auth.uid()
    OR public.is_supervisor_or_admin_in_org(organization_id)
  )
);

CREATE POLICY "attendance_logs_insert_own_org"
ON public.attendance_logs FOR INSERT TO authenticated
WITH CHECK (
  employee_id = auth.uid()
  AND organization_id = public.current_user_org()
);

CREATE POLICY "attendance_logs_update_org"
ON public.attendance_logs FOR UPDATE TO authenticated
USING (
  organization_id = public.current_user_org()
  AND (
    employee_id = auth.uid()
    OR public.is_supervisor_or_admin_in_org(organization_id)
  )
);

CREATE POLICY "attendance_logs_admin_all"
ON public.attendance_logs FOR ALL TO authenticated
USING (public.is_admin_in_org(organization_id));

-- -------------------------------------------------------
-- 4. attendance_anomalies — org-scoped
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Employee can insert anomalies" ON attendance_anomalies;
DROP POLICY IF EXISTS "Admin can manage anomalies" ON attendance_anomalies;

CREATE POLICY "attendance_anomalies_insert_org"
ON public.attendance_anomalies FOR INSERT TO authenticated
WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "attendance_anomalies_admin_org"
ON public.attendance_anomalies FOR ALL TO authenticated
USING (
  organization_id = public.current_user_org()
  AND public.is_supervisor_or_admin_in_org(organization_id)
);

-- -------------------------------------------------------
-- 5. leave_requests — org-scoped
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Employee can read own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Employee can insert own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Employee can update own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Admin can manage all leave requests" ON leave_requests;

CREATE POLICY "leave_requests_select_org"
ON public.leave_requests FOR SELECT TO authenticated
USING (
  organization_id = public.current_user_org()
  AND (
    employee_id = auth.uid()
    OR public.is_supervisor_or_admin_in_org(organization_id)
  )
);

CREATE POLICY "leave_requests_insert_org"
ON public.leave_requests FOR INSERT TO authenticated
WITH CHECK (
  employee_id = auth.uid()
  AND organization_id = public.current_user_org()
);

CREATE POLICY "leave_requests_update_org"
ON public.leave_requests FOR UPDATE TO authenticated
USING (
  organization_id = public.current_user_org()
  AND (
    employee_id = auth.uid()
    OR public.is_supervisor_or_admin_in_org(organization_id)
  )
);

CREATE POLICY "leave_requests_admin_all"
ON public.leave_requests FOR ALL TO authenticated
USING (public.is_admin_in_org(organization_id));

-- -------------------------------------------------------
-- 6. leave_balances — org-scoped
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Employee can view own leave balance" ON leave_balances;
DROP POLICY IF EXISTS "Admin can manage leave balances" ON leave_balances;

CREATE POLICY "leave_balances_select_org"
ON public.leave_balances FOR SELECT TO authenticated
USING (
  organization_id = public.current_user_org()
  AND (
    employee_id = auth.uid()
    OR public.is_supervisor_or_admin_in_org(organization_id)
  )
);

CREATE POLICY "leave_balances_admin_org"
ON public.leave_balances FOR ALL TO authenticated
USING (public.is_admin_in_org(organization_id));

-- -------------------------------------------------------
-- 7. ot_requests — org-scoped
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Employee can read own OT requests" ON ot_requests;
DROP POLICY IF EXISTS "Employee can insert own OT requests" ON ot_requests;
DROP POLICY IF EXISTS "Employee can update own OT requests" ON ot_requests;
DROP POLICY IF EXISTS "Admin can manage all OT requests" ON ot_requests;

CREATE POLICY "ot_requests_select_org"
ON public.ot_requests FOR SELECT TO authenticated
USING (
  organization_id = public.current_user_org()
  AND (
    employee_id = auth.uid()
    OR public.is_supervisor_or_admin_in_org(organization_id)
  )
);

CREATE POLICY "ot_requests_insert_org"
ON public.ot_requests FOR INSERT TO authenticated
WITH CHECK (
  employee_id = auth.uid()
  AND organization_id = public.current_user_org()
);

CREATE POLICY "ot_requests_update_org"
ON public.ot_requests FOR UPDATE TO authenticated
USING (
  organization_id = public.current_user_org()
  AND (
    employee_id = auth.uid()
    OR public.is_supervisor_or_admin_in_org(organization_id)
  )
);

CREATE POLICY "ot_requests_admin_all"
ON public.ot_requests FOR ALL TO authenticated
USING (public.is_admin_in_org(organization_id));

-- -------------------------------------------------------
-- 8. wfh_requests — org-scoped
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Employee can view own WFH requests" ON wfh_requests;
DROP POLICY IF EXISTS "Employee can submit WFH requests" ON wfh_requests;
DROP POLICY IF EXISTS "Employee can update own WFH requests" ON wfh_requests;
DROP POLICY IF EXISTS "Admin can manage all WFH requests" ON wfh_requests;

CREATE POLICY "wfh_requests_select_org"
ON public.wfh_requests FOR SELECT TO authenticated
USING (
  organization_id = public.current_user_org()
  AND (
    employee_id = auth.uid()
    OR public.is_supervisor_or_admin_in_org(organization_id)
  )
);

CREATE POLICY "wfh_requests_insert_org"
ON public.wfh_requests FOR INSERT TO authenticated
WITH CHECK (
  employee_id = auth.uid()
  AND organization_id = public.current_user_org()
);

CREATE POLICY "wfh_requests_update_org"
ON public.wfh_requests FOR UPDATE TO authenticated
USING (
  organization_id = public.current_user_org()
  AND (
    employee_id = auth.uid()
    OR public.is_supervisor_or_admin_in_org(organization_id)
  )
);

CREATE POLICY "wfh_requests_admin_all"
ON public.wfh_requests FOR ALL TO authenticated
USING (public.is_admin_in_org(organization_id));

-- -------------------------------------------------------
-- 9. late_requests — org-scoped
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Employee can view own late requests" ON late_requests;
DROP POLICY IF EXISTS "Employee can submit late requests" ON late_requests;
DROP POLICY IF EXISTS "Admin can manage all late requests" ON late_requests;

CREATE POLICY "late_requests_select_org"
ON public.late_requests FOR SELECT TO authenticated
USING (
  organization_id = public.current_user_org()
  AND (
    employee_id = auth.uid()
    OR public.is_supervisor_or_admin_in_org(organization_id)
  )
);

CREATE POLICY "late_requests_insert_org"
ON public.late_requests FOR INSERT TO authenticated
WITH CHECK (
  employee_id = auth.uid()
  AND organization_id = public.current_user_org()
);

CREATE POLICY "late_requests_admin_all"
ON public.late_requests FOR ALL TO authenticated
USING (public.is_admin_in_org(organization_id));

-- -------------------------------------------------------
-- 10. field_work_requests — org-scoped
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Employee can view own field work requests" ON field_work_requests;
DROP POLICY IF EXISTS "Employee can submit field work requests" ON field_work_requests;
DROP POLICY IF EXISTS "Admin can manage all field work requests" ON field_work_requests;

CREATE POLICY "field_work_requests_select_org"
ON public.field_work_requests FOR SELECT TO authenticated
USING (
  organization_id = public.current_user_org()
  AND (
    employee_id = auth.uid()
    OR public.is_supervisor_or_admin_in_org(organization_id)
  )
);

CREATE POLICY "field_work_requests_insert_org"
ON public.field_work_requests FOR INSERT TO authenticated
WITH CHECK (
  employee_id = auth.uid()
  AND organization_id = public.current_user_org()
);

CREATE POLICY "field_work_requests_admin_all"
ON public.field_work_requests FOR ALL TO authenticated
USING (public.is_admin_in_org(organization_id));

-- -------------------------------------------------------
-- 11. announcements — org-scoped
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Employees can view published announcements" ON announcements;
DROP POLICY IF EXISTS "Admin can manage announcements" ON announcements;

CREATE POLICY "announcements_select_org"
ON public.announcements FOR SELECT TO authenticated
USING (
  organization_id = public.current_user_org()
  AND (
    published = true
    OR public.is_supervisor_or_admin_in_org(organization_id)
  )
);

CREATE POLICY "announcements_admin_org"
ON public.announcements FOR ALL TO authenticated
USING (public.is_admin_in_org(organization_id));

-- -------------------------------------------------------
-- 12. announcement_reads — org-scoped
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Employees can view own announcement reads" ON announcement_reads;
DROP POLICY IF EXISTS "Employees can mark announcements as read" ON announcement_reads;
DROP POLICY IF EXISTS "Admin can view all reads" ON announcement_reads;

CREATE POLICY "announcement_reads_select_org"
ON public.announcement_reads FOR SELECT TO authenticated
USING (
  organization_id = public.current_user_org()
  AND (
    employee_id = auth.uid()
    OR public.is_supervisor_or_admin_in_org(organization_id)
  )
);

CREATE POLICY "announcement_reads_insert_org"
ON public.announcement_reads FOR INSERT TO authenticated
WITH CHECK (
  employee_id = auth.uid()
  AND organization_id = public.current_user_org()
);

-- -------------------------------------------------------
-- 13. system_settings — org-scoped
-- -------------------------------------------------------
DROP POLICY IF EXISTS "settings_select_filtered" ON system_settings;
DROP POLICY IF EXISTS "Only admins can update settings" ON system_settings;
DROP POLICY IF EXISTS "Only admins can insert settings" ON system_settings;
DROP POLICY IF EXISTS "Only admins can delete settings" ON system_settings;

CREATE POLICY "settings_select_org"
ON public.system_settings FOR SELECT TO authenticated
USING (
  organization_id = public.current_user_org()
  AND (
    public.is_supervisor_or_admin_in_org(organization_id)
    OR setting_key NOT IN (
      'line_channel_access_token',
      'line_recipient_id',
      'line_recipient_type',
      'vapid_public_key',
      'vapid_private_key'
    )
  )
);

CREATE POLICY "settings_write_admin_org"
ON public.system_settings FOR ALL TO authenticated
USING (public.is_admin_in_org(organization_id));

-- -------------------------------------------------------
-- 14. salary_history — org-scoped (admin only)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Admin can view salary history" ON salary_history;
DROP POLICY IF EXISTS "Admin can manage salary history" ON salary_history;

CREATE POLICY "salary_history_select_org"
ON public.salary_history FOR SELECT TO authenticated
USING (
  organization_id = public.current_user_org()
  AND public.is_admin_in_org(organization_id)
);

CREATE POLICY "salary_history_write_admin_org"
ON public.salary_history FOR ALL TO authenticated
USING (public.is_admin_in_org(organization_id));

-- -------------------------------------------------------
-- 15. employment_history — org-scoped
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Admin can manage employment history" ON employment_history;

CREATE POLICY "employment_history_select_org"
ON public.employment_history FOR SELECT TO authenticated
USING (
  organization_id = public.current_user_org()
  AND (
    employee_id = auth.uid()
    OR public.is_admin_in_org(organization_id)
  )
);

CREATE POLICY "employment_history_write_admin_org"
ON public.employment_history FOR ALL TO authenticated
USING (public.is_admin_in_org(organization_id));

-- -------------------------------------------------------
-- 16. Gamification tables — org-scoped
-- -------------------------------------------------------
-- employee_badges
DROP POLICY IF EXISTS "Employees can view badges" ON employee_badges;
DROP POLICY IF EXISTS "System can award badges" ON employee_badges;

CREATE POLICY "employee_badges_select_org"
ON public.employee_badges FOR SELECT TO authenticated
USING (organization_id = public.current_user_org());

CREATE POLICY "employee_badges_write_admin_org"
ON public.employee_badges FOR ALL TO authenticated
USING (public.is_admin_in_org(organization_id));

-- employee_points
DROP POLICY IF EXISTS "Employees can view points" ON employee_points;
DROP POLICY IF EXISTS "System can update points" ON employee_points;

CREATE POLICY "employee_points_select_org"
ON public.employee_points FOR SELECT TO authenticated
USING (organization_id = public.current_user_org());

CREATE POLICY "employee_points_write_admin_org"
ON public.employee_points FOR ALL TO authenticated
USING (public.is_admin_in_org(organization_id));

-- point_transactions
DROP POLICY IF EXISTS "Employees can view own transactions" ON point_transactions;
DROP POLICY IF EXISTS "System can insert transactions" ON point_transactions;

CREATE POLICY "point_transactions_select_org"
ON public.point_transactions FOR SELECT TO authenticated
USING (
  organization_id = public.current_user_org()
  AND (
    employee_id = auth.uid()
    OR public.is_admin_in_org(organization_id)
  )
);

CREATE POLICY "point_transactions_write_admin_org"
ON public.point_transactions FOR ALL TO authenticated
USING (public.is_admin_in_org(organization_id));

-- -------------------------------------------------------
-- 17. KPI tables — org-scoped
-- -------------------------------------------------------
-- kpi_periods
DROP POLICY IF EXISTS "Admin can manage KPI periods" ON kpi_periods;
DROP POLICY IF EXISTS "Employees can view KPI periods" ON kpi_periods;

CREATE POLICY "kpi_periods_select_org"
ON public.kpi_periods FOR SELECT TO authenticated
USING (organization_id = public.current_user_org());

CREATE POLICY "kpi_periods_write_admin_org"
ON public.kpi_periods FOR ALL TO authenticated
USING (public.is_admin_in_org(organization_id));

-- kpi_goals
DROP POLICY IF EXISTS "Employees can manage own goals" ON kpi_goals;
DROP POLICY IF EXISTS "Admin can manage all goals" ON kpi_goals;

CREATE POLICY "kpi_goals_select_org"
ON public.kpi_goals FOR SELECT TO authenticated
USING (
  organization_id = public.current_user_org()
  AND (
    employee_id = auth.uid()
    OR public.is_supervisor_or_admin_in_org(organization_id)
  )
);

CREATE POLICY "kpi_goals_insert_org"
ON public.kpi_goals FOR INSERT TO authenticated
WITH CHECK (
  employee_id = auth.uid()
  AND organization_id = public.current_user_org()
);

CREATE POLICY "kpi_goals_admin_org"
ON public.kpi_goals FOR ALL TO authenticated
USING (public.is_admin_in_org(organization_id));

-- kpi_goal_progress
DROP POLICY IF EXISTS "Employees can view own progress" ON kpi_goal_progress;
DROP POLICY IF EXISTS "Employees can add progress" ON kpi_goal_progress;

CREATE POLICY "kpi_goal_progress_select_org"
ON public.kpi_goal_progress FOR SELECT TO authenticated
USING (organization_id = public.current_user_org());

CREATE POLICY "kpi_goal_progress_insert_org"
ON public.kpi_goal_progress FOR INSERT TO authenticated
WITH CHECK (organization_id = public.current_user_org());

-- kpi_evaluations
DROP POLICY IF EXISTS "Employees can view own evaluations" ON kpi_evaluations;
DROP POLICY IF EXISTS "Admin can manage evaluations" ON kpi_evaluations;

CREATE POLICY "kpi_evaluations_select_org"
ON public.kpi_evaluations FOR SELECT TO authenticated
USING (
  organization_id = public.current_user_org()
  AND (
    employee_id = auth.uid()
    OR evaluator_id = auth.uid()
    OR public.is_admin_in_org(organization_id)
  )
);

CREATE POLICY "kpi_evaluations_write_org"
ON public.kpi_evaluations FOR ALL TO authenticated
USING (
  organization_id = public.current_user_org()
  AND (
    evaluator_id = auth.uid()
    OR public.is_admin_in_org(organization_id)
  )
);

-- kpi_evaluation_items
DROP POLICY IF EXISTS "Evaluators can manage items" ON kpi_evaluation_items;

CREATE POLICY "kpi_eval_items_select_org"
ON public.kpi_evaluation_items FOR SELECT TO authenticated
USING (organization_id = public.current_user_org());

CREATE POLICY "kpi_eval_items_write_org"
ON public.kpi_evaluation_items FOR ALL TO authenticated
USING (organization_id = public.current_user_org());

-- kpi_auto_metrics
DROP POLICY IF EXISTS "Employees can view own metrics" ON kpi_auto_metrics;
DROP POLICY IF EXISTS "Admin can manage metrics" ON kpi_auto_metrics;

CREATE POLICY "kpi_auto_metrics_select_org"
ON public.kpi_auto_metrics FOR SELECT TO authenticated
USING (
  organization_id = public.current_user_org()
  AND (
    employee_id = auth.uid()
    OR public.is_supervisor_or_admin_in_org(organization_id)
  )
);

CREATE POLICY "kpi_auto_metrics_admin_org"
ON public.kpi_auto_metrics FOR ALL TO authenticated
USING (public.is_admin_in_org(organization_id));

-- =============================================================
-- END of Phase B Step 3 RLS rewrite
-- Run order: _organization_helpers.sql → this file
-- =============================================================

COMMIT;
