# Phase B — Tenant Scope Tagging

> Generated: 2026-05-16 (Phase B Step 1)
> Purpose: document which tables get `organization_id` and which stay global

## Tenant-scoped tables (will receive organization_id)

These tables hold data that belongs to a specific business unit (Anajak, iBear, etc.).

| Table | Reason |
|---|---|
| `employees` | One employee belongs to one org |
| `branches` | Each org has its own physical branches |
| `attendance_logs` | Attendance records are per-org |
| `attendance_anomalies` | Derived from attendance_logs → same scope |
| `leave_requests` | Leave is per-org HR policy |
| `leave_balances` | Quota governed by org policy |
| `ot_requests` | OT rules differ per org |
| `wfh_requests` | WFH policy is per-org |
| `late_requests` | Late tolerance rules per org |
| `field_work_requests` | Field work is per-org context |
| `salary_history` | Payroll is per-org |
| `announcements` | Announcements broadcast within org |
| `announcement_reads` | Derived from announcements → same scope |
| `system_settings` | Each org has independent settings (work hours, GPS radius, etc.) |
| `employment_history` | HR audit trail is per-org |
| `employee_badges` | Badge programs run per-org |
| `employee_points` | Points leaderboard is per-org |
| `point_transactions` | Points ledger is per-org |
| `kpi_periods` | KPI cycles defined per-org |
| `kpi_goals` | Goals are per-org, per-employee |
| `kpi_goal_progress` | Derived from kpi_goals → same scope |
| `kpi_evaluations` | Evaluations are per-org |
| `kpi_evaluation_items` | Derived from kpi_evaluations → same scope |
| `kpi_auto_metrics` | Auto-calculated per-org |

**Total: 24 tables**

## Global tables (no organization_id needed)

These tables are shared across all orgs (reference data or device-level).

| Table | Reason |
|---|---|
| `holidays` | Public holidays are national/shared; branch-specific filtering via `branch_id` already exists |
| `badge_definitions` | Master badge catalog is org-agnostic; per-org filtering handled at app layer |
| `kpi_templates` | Template library is shared across orgs; org-specific weighting handled via `kpi_period_templates` |
| `kpi_period_templates` | Junction table, inherits scope from `kpi_periods` (already tenant-scoped) — no direct `organization_id` needed |
| `push_subscriptions` | Device-level subscription; scoped via `employee_id` → `employees.organization_id` |

## Notes

- `branches` is tenant-scoped even though it doesn't directly hold employee data — each org has distinct physical locations
- `kpi_period_templates` is a junction table between `kpi_periods` (tenant-scoped) and `kpi_templates` (global) — tenant scope is inherited transitively through `period_id`
- `push_subscriptions` is scoped through the `employee_id` FK chain — adding direct `organization_id` would be redundant

## Step 2 backfill target

After Step 1 (nullable columns added), Step 2 will:
```sql
UPDATE <table> SET organization_id = '<anajak-org-uuid>' WHERE organization_id IS NULL;
```
All existing rows belong to Anajak (the only live org). Estimated rows per table and timing → see Step 2 runbook.
