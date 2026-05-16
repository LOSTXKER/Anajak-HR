-- =============================================================
-- Phase B Step 1: Organizations table + organization_id columns
-- Status: NOT APPLIED — apply on Sun 2026-05-18 (Step 2-3 window)
-- Safe to apply: all columns nullable, no existing query breaks
-- Estimated downtime: ~0 seconds (DDL on empty/small tables)
-- =============================================================

-- -------------------------------------------------------
-- 1. Create organizations table
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
  id         UUID        NOT NULL DEFAULT gen_random_uuid(),
  slug       VARCHAR(50) NOT NULL,
  name       VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT organizations_pkey PRIMARY KEY (id),
  CONSTRAINT organizations_slug_key UNIQUE (slug)
);

-- Index for slug lookups
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations (slug);

-- Enable RLS (policies applied in _phase_b_step3_rewrite.sql)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- 2. Seed 5 organizations (BestOS businesses)
-- Using fixed UUIDs so Step 2 backfill scripts can reference them
-- -------------------------------------------------------
INSERT INTO public.organizations (id, slug, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'anajak',  'Anajak'),
  ('00000000-0000-0000-0000-000000000002', 'ibear',   'iBear'),
  ('00000000-0000-0000-0000-000000000003', 'meecard', 'Meecard'),
  ('00000000-0000-0000-0000-000000000004', 'meelike', 'Meelike'),
  ('00000000-0000-0000-0000-000000000005', 'channel', 'Best Channel')
ON CONFLICT (slug) DO NOTHING;

-- -------------------------------------------------------
-- 3. Add organization_id column (NULLABLE) to all tenant tables
--    Order matters: employees first (others FK to it)
-- -------------------------------------------------------

-- employees
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS organization_id UUID NULL
    REFERENCES public.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_employees_org ON public.employees (organization_id);

-- branches
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS organization_id UUID NULL
    REFERENCES public.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_branches_org ON public.branches (organization_id);

-- attendance_logs
ALTER TABLE public.attendance_logs
  ADD COLUMN IF NOT EXISTS organization_id UUID NULL
    REFERENCES public.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_attendance_logs_org ON public.attendance_logs (organization_id);

-- attendance_anomalies
ALTER TABLE public.attendance_anomalies
  ADD COLUMN IF NOT EXISTS organization_id UUID NULL
    REFERENCES public.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_attendance_anomalies_org ON public.attendance_anomalies (organization_id);

-- leave_requests
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS organization_id UUID NULL
    REFERENCES public.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_leave_requests_org ON public.leave_requests (organization_id);

-- leave_balances
ALTER TABLE public.leave_balances
  ADD COLUMN IF NOT EXISTS organization_id UUID NULL
    REFERENCES public.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_leave_balances_org ON public.leave_balances (organization_id);

-- ot_requests
ALTER TABLE public.ot_requests
  ADD COLUMN IF NOT EXISTS organization_id UUID NULL
    REFERENCES public.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_ot_requests_org ON public.ot_requests (organization_id);

-- wfh_requests
ALTER TABLE public.wfh_requests
  ADD COLUMN IF NOT EXISTS organization_id UUID NULL
    REFERENCES public.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_wfh_requests_org ON public.wfh_requests (organization_id);

-- late_requests
ALTER TABLE public.late_requests
  ADD COLUMN IF NOT EXISTS organization_id UUID NULL
    REFERENCES public.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_late_requests_org ON public.late_requests (organization_id);

-- field_work_requests
ALTER TABLE public.field_work_requests
  ADD COLUMN IF NOT EXISTS organization_id UUID NULL
    REFERENCES public.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_field_work_requests_org ON public.field_work_requests (organization_id);

-- salary_history
ALTER TABLE public.salary_history
  ADD COLUMN IF NOT EXISTS organization_id UUID NULL
    REFERENCES public.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_salary_history_org ON public.salary_history (organization_id);

-- announcements
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS organization_id UUID NULL
    REFERENCES public.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_announcements_org ON public.announcements (organization_id);

-- announcement_reads
ALTER TABLE public.announcement_reads
  ADD COLUMN IF NOT EXISTS organization_id UUID NULL
    REFERENCES public.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_announcement_reads_org ON public.announcement_reads (organization_id);

-- system_settings: note current unique constraint on setting_key
-- Step 3 will DROP the old unique constraint and add (setting_key, organization_id) composite
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS organization_id UUID NULL
    REFERENCES public.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_system_settings_org ON public.system_settings (organization_id);

-- employment_history
ALTER TABLE public.employment_history
  ADD COLUMN IF NOT EXISTS organization_id UUID NULL
    REFERENCES public.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_employment_history_org ON public.employment_history (organization_id);

-- employee_badges
ALTER TABLE public.employee_badges
  ADD COLUMN IF NOT EXISTS organization_id UUID NULL
    REFERENCES public.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_employee_badges_org ON public.employee_badges (organization_id);

-- employee_points
ALTER TABLE public.employee_points
  ADD COLUMN IF NOT EXISTS organization_id UUID NULL
    REFERENCES public.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_employee_points_org ON public.employee_points (organization_id);

-- point_transactions
ALTER TABLE public.point_transactions
  ADD COLUMN IF NOT EXISTS organization_id UUID NULL
    REFERENCES public.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_point_transactions_org ON public.point_transactions (organization_id);

-- kpi_periods
ALTER TABLE public.kpi_periods
  ADD COLUMN IF NOT EXISTS organization_id UUID NULL
    REFERENCES public.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_kpi_periods_org ON public.kpi_periods (organization_id);

-- kpi_goals
ALTER TABLE public.kpi_goals
  ADD COLUMN IF NOT EXISTS organization_id UUID NULL
    REFERENCES public.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_kpi_goals_org ON public.kpi_goals (organization_id);

-- kpi_goal_progress
ALTER TABLE public.kpi_goal_progress
  ADD COLUMN IF NOT EXISTS organization_id UUID NULL
    REFERENCES public.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_kpi_goal_progress_org ON public.kpi_goal_progress (organization_id);

-- kpi_evaluations
ALTER TABLE public.kpi_evaluations
  ADD COLUMN IF NOT EXISTS organization_id UUID NULL
    REFERENCES public.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_kpi_evaluations_org ON public.kpi_evaluations (organization_id);

-- kpi_evaluation_items
ALTER TABLE public.kpi_evaluation_items
  ADD COLUMN IF NOT EXISTS organization_id UUID NULL
    REFERENCES public.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_kpi_eval_items_org ON public.kpi_evaluation_items (organization_id);

-- kpi_auto_metrics
ALTER TABLE public.kpi_auto_metrics
  ADD COLUMN IF NOT EXISTS organization_id UUID NULL
    REFERENCES public.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_kpi_auto_metrics_org ON public.kpi_auto_metrics (organization_id);

-- -------------------------------------------------------
-- END of Step 1 migration
-- Next: Step 2 = backfill all organization_id = Anajak UUID
--       Step 3 = NOT NULL constraints + RLS policy swap
-- -------------------------------------------------------
