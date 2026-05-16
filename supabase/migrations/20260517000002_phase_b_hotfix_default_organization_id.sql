-- Hotfix: Add DEFAULT to all 24 tenant tables
-- Allows production main code (without organizationId in Prisma model) to INSERT successfully
-- Applied: 2026-05-17 emergency patch after Phase B migration left NOT NULL without DEFAULT

ALTER TABLE public.employees            ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.branches             ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.attendance_logs      ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.attendance_anomalies ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.leave_requests       ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.leave_balances       ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.ot_requests          ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.wfh_requests         ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.late_requests        ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.field_work_requests  ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.salary_history       ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.announcements        ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.announcement_reads   ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.system_settings      ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.employment_history   ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.employee_badges      ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.employee_points      ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.point_transactions   ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.kpi_periods          ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.kpi_goals            ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.kpi_goal_progress    ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.kpi_evaluations      ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.kpi_evaluation_items ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.kpi_auto_metrics     ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
