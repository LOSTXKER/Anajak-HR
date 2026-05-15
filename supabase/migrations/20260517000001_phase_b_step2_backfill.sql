-- =============================================================
-- Phase B Step 2: Backfill organization_id = Anajak UUID
-- Status: NOT APPLIED — apply after Step 1 (organizations table + columns)
-- Anajak UUID: 00000000-0000-0000-0000-000000000001
-- Safe: all columns nullable (Step 1), app unaffected during backfill
-- =============================================================

BEGIN;

-- 1. employees
UPDATE public.employees
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 2. branches
UPDATE public.branches
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 3. attendance_logs
UPDATE public.attendance_logs
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 4. attendance_anomalies
UPDATE public.attendance_anomalies
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 5. leave_requests
UPDATE public.leave_requests
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 6. leave_balances
UPDATE public.leave_balances
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 7. ot_requests
UPDATE public.ot_requests
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 8. wfh_requests
UPDATE public.wfh_requests
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 9. late_requests
UPDATE public.late_requests
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 10. field_work_requests
UPDATE public.field_work_requests
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 11. salary_history
UPDATE public.salary_history
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 12. announcements
UPDATE public.announcements
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 13. announcement_reads
UPDATE public.announcement_reads
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 14. system_settings
UPDATE public.system_settings
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 15. employment_history
UPDATE public.employment_history
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 16. employee_badges
UPDATE public.employee_badges
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 17. employee_points
UPDATE public.employee_points
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 18. point_transactions
UPDATE public.point_transactions
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 19. kpi_periods
UPDATE public.kpi_periods
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 20. kpi_goals
UPDATE public.kpi_goals
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 21. kpi_goal_progress
UPDATE public.kpi_goal_progress
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 22. kpi_evaluations
UPDATE public.kpi_evaluations
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 23. kpi_evaluation_items
UPDATE public.kpi_evaluation_items
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 24. kpi_auto_metrics
UPDATE public.kpi_auto_metrics
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

COMMIT;

-- =============================================================
-- Verify after apply:
-- SELECT
--   'employees' AS tbl, COUNT(*) FILTER (WHERE organization_id IS NULL) AS null_count FROM public.employees
-- UNION ALL SELECT 'branches', COUNT(*) FILTER (WHERE organization_id IS NULL) FROM public.branches
-- UNION ALL SELECT 'attendance_logs', COUNT(*) FILTER (WHERE organization_id IS NULL) FROM public.attendance_logs
-- UNION ALL SELECT 'attendance_anomalies', COUNT(*) FILTER (WHERE organization_id IS NULL) FROM public.attendance_anomalies
-- UNION ALL SELECT 'leave_requests', COUNT(*) FILTER (WHERE organization_id IS NULL) FROM public.leave_requests
-- UNION ALL SELECT 'leave_balances', COUNT(*) FILTER (WHERE organization_id IS NULL) FROM public.leave_balances
-- UNION ALL SELECT 'ot_requests', COUNT(*) FILTER (WHERE organization_id IS NULL) FROM public.ot_requests
-- UNION ALL SELECT 'wfh_requests', COUNT(*) FILTER (WHERE organization_id IS NULL) FROM public.wfh_requests
-- UNION ALL SELECT 'late_requests', COUNT(*) FILTER (WHERE organization_id IS NULL) FROM public.late_requests
-- UNION ALL SELECT 'field_work_requests', COUNT(*) FILTER (WHERE organization_id IS NULL) FROM public.field_work_requests
-- UNION ALL SELECT 'salary_history', COUNT(*) FILTER (WHERE organization_id IS NULL) FROM public.salary_history
-- UNION ALL SELECT 'announcements', COUNT(*) FILTER (WHERE organization_id IS NULL) FROM public.announcements
-- UNION ALL SELECT 'announcement_reads', COUNT(*) FILTER (WHERE organization_id IS NULL) FROM public.announcement_reads
-- UNION ALL SELECT 'system_settings', COUNT(*) FILTER (WHERE organization_id IS NULL) FROM public.system_settings
-- UNION ALL SELECT 'employment_history', COUNT(*) FILTER (WHERE organization_id IS NULL) FROM public.employment_history
-- UNION ALL SELECT 'employee_badges', COUNT(*) FILTER (WHERE organization_id IS NULL) FROM public.employee_badges
-- UNION ALL SELECT 'employee_points', COUNT(*) FILTER (WHERE organization_id IS NULL) FROM public.employee_points
-- UNION ALL SELECT 'point_transactions', COUNT(*) FILTER (WHERE organization_id IS NULL) FROM public.point_transactions
-- UNION ALL SELECT 'kpi_periods', COUNT(*) FILTER (WHERE organization_id IS NULL) FROM public.kpi_periods
-- UNION ALL SELECT 'kpi_goals', COUNT(*) FILTER (WHERE organization_id IS NULL) FROM public.kpi_goals
-- UNION ALL SELECT 'kpi_goal_progress', COUNT(*) FILTER (WHERE organization_id IS NULL) FROM public.kpi_goal_progress
-- UNION ALL SELECT 'kpi_evaluations', COUNT(*) FILTER (WHERE organization_id IS NULL) FROM public.kpi_evaluations
-- UNION ALL SELECT 'kpi_evaluation_items', COUNT(*) FILTER (WHERE organization_id IS NULL) FROM public.kpi_evaluation_items
-- UNION ALL SELECT 'kpi_auto_metrics', COUNT(*) FILTER (WHERE organization_id IS NULL) FROM public.kpi_auto_metrics;
-- Expected: all null_count = 0
-- =============================================================
