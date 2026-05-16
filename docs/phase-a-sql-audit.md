# Phase A — SQL Audit

**Date**: 2026-05-16
**Auditor**: Vegapunk (Dev)
**Branch**: refactor/2026-05

---

## Goal

1 source of truth = Prisma. `supabase/` เหลือเฉพาะ:
- **RLS/Trigger/Function** ที่ Prisma express ไม่ได้ → `supabase/rls/`
- **Prisma migrations** ที่มี timestamp → `supabase/migrations/` (เดิม)
- **Extensions/functions** ซับซ้อน (atomic functions, materialized views) → `supabase/extensions/`

---

## Summary

| Category | Count | Action |
|---|---|---|
| A — schema-change (ALTER/CREATE TABLE) | 20 | DELETE (Prisma คือ source truth แล้ว) |
| B — rls-or-function (POLICY/FUNCTION/TRIGGER) | 7 | MOVE → `supabase/rls/` |
| C — one-off-fix (data patch, setting seed) | 6 | DELETE (รันไปแล้ว) |
| D — unclear | 0 | — |
| migrations/ timestamped | 27 | KEEP (Prisma migration history) |
| migrations/ non-timestamped | 6 | KEEP (RLS+functions ที่ใช้งานจริง) |
| snippets/ | 1 | DELETE (manual data patch รันครั้งเดียว) |
| schema.sql / seed.sql | 2 | KEEP in `supabase/` (reference + seed) |

**Root-level files ที่จะ reorganize/delete: 33 ไฟล์**

---

## Root-level `supabase/*.sql` — Detailed Classification

### Category A: schema-change → DELETE
*(field ทั้งหมดมีใน Prisma schema.prisma แล้ว — verified)*

| File | Tables Affected | Prisma Verified |
|---|---|---|
| `add-account-status.sql` | employees (account_status, approved_by, approved_at, rejection_reason) | ✅ ครบ |
| `add-approved-at-column.sql` | leave/wfh/late/field_work_requests (approved_at) | ✅ ครบ |
| `add-auto-checkout.sql` | attendance_logs (auto_checkout, edited_by…), checkout_reminders, attendance_anomalies | ✅ ครบ |
| `add-base-salary.sql` | employees (base_salary) | ✅ ครบ |
| `add-cancel-functionality.sql` | ot/leave/wfh/late/field_work_requests (cancelled_by, cancelled_at, cancel_reason) | ✅ ครบ |
| `add-cancelled-status.sql` | ot/leave/wfh_requests (constraint) | ✅ ครบ (redundant กับ add-cancel-functionality) |
| `add-employee-payroll-fields.sql` | employees (commission, is_system_account) | ✅ ครบ |
| `add-employee-soft-delete.sql` | employees (deleted_at, deleted_by) | ✅ ครบ |
| `add-field-work-requests.sql` | CREATE TABLE field_work_requests | ✅ ครบ |
| `add-late-minutes.sql` | attendance_logs (late_minutes) | ✅ ครบ |
| `add-late-requests.sql` | CREATE TABLE late_requests | ✅ ครบ |
| `add-line-user-id.sql` | employees (line_user_id) | ✅ ครบ |
| `add-ot-gps-columns.sql` | ot_requests (start/end_gps_lat/lng) | ✅ ครบ |
| `add-announcements-local.sql` | CREATE TABLE announcements, announcement_reads | ✅ ครบ |
| `fix-all-issues.sql` | employees (multi-col ADD), system_settings CREATE | ✅ ครบ (mixed A+B) |
| `fix-attendance-update-rls.sql` | attendance_logs (ADD COLUMN edit_reason…) + attendance_anomalies CREATE | ✅ ครบ (mixed A+B) |
| `fix-ot-approved-at.sql` | ot_requests (approved_at) | ✅ ครบ |
| `add-settings-table.sql` | CREATE TABLE system_settings + default settings INSERT | ✅ ครบ (table exists) |

### Category B: rls-or-function → MOVE to `supabase/rls/`

| File | Entity | Dest |
|---|---|---|
| `fix-admin-rls.sql` | employees, attendance_logs, ot/leave/wfh_requests, branches, holidays | → `supabase/rls/multi-entity.sql` |
| `fix-cancel-rls.sql` | ot_requests, leave_requests (UPDATE policy) | → `supabase/rls/requests.sql` |
| `fix-holidays-rls.sql` | holidays | → `supabase/rls/holidays.sql` |
| `fix-infinite-recursion.sql` | employees (+ CREATE FUNCTION get_my_role) | → `supabase/rls/employees.sql` |
| `fix-leave-wfh-rls.sql` | leave_requests, wfh_requests, holidays, branches | → `supabase/rls/requests.sql` (merge) |
| `fix-rls-policies.sql` | ALL tables (comprehensive current policy set) | → `supabase/rls/multi-entity.sql` (merge) |
| `fix-rls.sql` | employees, attendance_logs, ot_requests, branches, holidays | → `supabase/rls/multi-entity.sql` (merge) |
| `fix-settings-rls.sql` | system_settings | → `supabase/rls/system-settings.sql` |
| `fix-settings-rls-local.sql` | system_settings (local dev — permissive) | → `supabase/rls/system-settings-local-dev.sql` |
| `setup-storage.sql` | storage.objects (storage policies) | → `supabase/rls/storage.sql` |

### Category C: one-off-fix → DELETE
*(data seeds + manual patches ที่รันไปแล้ว)*

| File | เนื้อหา | Reason |
|---|---|---|
| `add-auto-approve-settings.sql` | INSERT system_settings (auto_approve_*) | Seed data รันไปแล้ว — ดูใน add-settings-table |
| `add-checkin-checkout-notification-settings.sql` | INSERT system_settings | Seed data รันไปแล้ว |
| `add-checkin-checkout-time-restrictions.sql` | INSERT system_settings | Seed data รันไปแล้ว |
| `add-holiday-notification-settings.sql` | INSERT system_settings | Seed data รันไปแล้ว |
| `add-payroll-settings.sql` | INSERT system_settings (payroll rates) | Seed data รันไปแล้ว |
| `add-require-approval-setting.sql` | INSERT system_settings single row | Seed data รันไปแล้ว |
| `add-working-days-settings.sql` | INSERT system_settings (working_days, ot_rate_*) | Seed data รันไปแล้ว |
| `rollback-auto-mode.sql` | DROP TABLE checkout_reminders + DELETE settings | Rollback script (รันไปแล้ว) |
| `snippets/Untitled query 494.sql` | UPDATE employees SET account_status+role ด้วย UUID specific | Manual one-off รันไปแล้ว |

### Keep in root `supabase/`

| File | Reason |
|---|---|
| `schema.sql` | Full schema reference (human-readable snapshot — ไม่ใช่ run) |
| `seed.sql` | Dev seed data |
| `seed-holidays-2569.sql` | Holiday data seed (idempotent) |

---

## `supabase/migrations/` Status

### Timestamped (Prisma migrations — KEEP all)

| File | Content |
|---|---|
| `20260202055255_initial_schema.sql` | Initial tables |
| `20260202060000_production_update.sql` | Production patch |
| `20260203055818_add_employee_soft_delete.sql` | Soft delete |
| `20260203060000_fix_auto_checkout_time.sql` | Auto checkout time fix |
| `20260203070000_add_notification_settings.sql` | Notification settings |
| `20260219000000_backfill_wfh_attendance.sql` | WFH backfill |
| `20260219010000_fix_leave_days_calculation.sql` | Leave days fix |
| `20260221000000_add_salary_history.sql` | Salary history |
| `20260224000000_add_gamification.sql` | Gamification |
| `20260224100000_add_increment_points_rpc.sql` | Points RPC |
| `20260224110000_add_missing_indexes.sql` | Indexes |
| `20260224120000_fix_employees_rls_for_leaderboard.sql` | Leaderboard RLS |
| `20260225000000_add_kpi_system.sql` | KPI system |
| `20260225000001_fix_kpi_grants.sql` | KPI grants |
| `20260225100000_fix_gamification_fk.sql` | Gamification FK |
| `20260225200000_rebalance_gamification.sql` | Rebalance points |
| `20260225300000_add_quarterly_rank.sql` | Quarterly rank |
| `20260226000000_fix_settings_and_request_tables.sql` | Settings + request tables |
| `20260226010000_fix_gamification_rpc.sql` | Gamification RPC fix |
| `20260226020000_badges_no_points.sql` | Badge no-points |
| `20260226030000_remove_badge_points_and_recalc.sql` | Remove badge points |
| `20260227000000_fix_atomic_checkout_checkin_columns.sql` | Atomic checkout |
| `20260227100000_ensure_checkout_reminders.sql` | Checkout reminders |
| `20260329000000_add_work_arrangement.sql` | Work arrangement |
| `20260401000000_add_employment_status.sql` | Employment status |
| `20260401100000_add_employment_history_update_delete_policies.sql` | Employment history RLS |
| `20260401200000_fix_leave_balance_trigger_security.sql` | Leave balance trigger SECURITY DEFINER |

### Non-timestamped in migrations/ (KEEP — active functions/RLS)

| File | Content | Category |
|---|---|---|
| `add-atomic-functions.sql` | CREATE FUNCTION atomic_checkin/checkout | B — functions (keep in migrations/extensions) |
| `add-leave-quota.sql` | CREATE TABLE leave_balances + FUNCTION/TRIGGER update_leave_balance | B — function+trigger |
| `add-missing-fields.sql` | ADD COLUMN + CREATE TABLE (multiple) | A — schema (superseded by timestamped, but keep for reference) |
| `create_push_subscriptions.sql` | CREATE TABLE push_subscriptions + RLS | A+B |
| `fix-late-minutes-calculation.sql` | DO $$ ... recalculate late_minutes | C — one-off data fix |
| `fix-rls-security.sql` | POLICY using get_my_role() | B — RLS |

---

## Prisma Schema Reconcile

**Status**: Prisma schema ครอบคลุม DB จริงทุก table แล้ว — ไม่มี field ที่ missing

**Fields ที่มาจาก SQL patches (เพิ่ม comment trace)**:

| Model | Field | Source Patch |
|---|---|---|
| `employees` | `account_status`, `approved_by`, `approved_at`, `rejection_reason` | add-account-status.sql (pre-migration era) |
| `employees` | `base_salary`, `commission`, `is_system_account` | add-base-salary.sql + add-employee-payroll-fields.sql |
| `employees` | `line_user_id` | add-line-user-id.sql |
| `employees` | `deleted_at`, `deleted_by` | add-employee-soft-delete.sql → 20260203055818 |
| `attendance_logs` | `late_minutes`, `edit_reason`, `edited_by`, `edited_at`, `original_clock_out`, `auto_checkout`, `auto_checkout_reason`, `reminder_count` | add-auto-checkout.sql + add-late-minutes.sql |
| `ot_requests` | `approved_at`, `start/end_gps_lat/lng`, `cancelled_*` | fix-ot-approved-at.sql + add-ot-gps-columns.sql + add-cancel-functionality.sql |
| `leave/wfh/late/field_work_requests` | `approved_at`, `cancelled_*` | add-approved-at-column.sql + add-cancel-functionality.sql |

---

## Migration Strategy for Phase B

**Prisma version**: 7.3.0 → ใช้ `prisma db push` แทน `migrate dev` เพราะ:
- Prisma 7.x มีปัญหากับ Transaction Pooler (port 6543) ของ Supabase
- `db push` ไม่สร้าง migration history file แต่ sync schema ตรงสู่ DB
- ถ้าต้องการ history → ใช้ `prisma migrate deploy` ผ่าน Direct connection (port 5432) ไม่ใช่ pooler

**Phase B plan**:
1. ตั้ง `DATABASE_URL` ให้ชี้ Direct connection (port 5432)
2. `npx prisma db push --accept-data-loss` (หรือ `migrate deploy` ถ้ามี history)
3. Verify ด้วย `prisma validate` + manual spot check บน Supabase dashboard

---

## Worker Rename

`worker/index.js` = source code ของ push notification service worker (push + notificationclick handlers)

**สถานะ**: `public/sw.js` และ `public/sw-push.js` ที่มีอยู่แล้วเป็น generated output จาก next-pwa — ไม่ใช่ source
**Action**: rename `worker/index.js` → `worker/service-worker.js` (ไม่ย้ายไป public/ เพราะ next-pwa จะ overwrite)

**References ที่อัปเดต**: ไม่มี — code ใน lib/ reference `/sw.js` ซึ่งเป็น path ของ generated file ใน public/ ไม่ใช่ worker/index.js โดยตรง. Worker source ถูก build/copy โดย next-pwa toolchain.

---

## Files Deleted (list)

### Root `supabase/` — Category A (schema-change, superseded by Prisma)
- `add-account-status.sql`
- `add-approved-at-column.sql`
- `add-auto-checkout.sql`
- `add-base-salary.sql`
- `add-cancel-functionality.sql`
- `add-cancelled-status.sql`
- `add-employee-payroll-fields.sql`
- `add-employee-soft-delete.sql`
- `add-field-work-requests.sql`
- `add-late-minutes.sql`
- `add-late-requests.sql`
- `add-line-user-id.sql`
- `add-ot-gps-columns.sql`
- `add-announcements-local.sql`
- `fix-all-issues.sql`
- `fix-attendance-update-rls.sql`
- `fix-ot-approved-at.sql`
- `add-settings-table.sql`

### Root `supabase/` — Category C (one-off seed/data fix)
- `add-auto-approve-settings.sql`
- `add-checkin-checkout-notification-settings.sql`
- `add-checkin-checkout-time-restrictions.sql`
- `add-holiday-notification-settings.sql`
- `add-payroll-settings.sql`
- `add-require-approval-setting.sql`
- `add-working-days-settings.sql`
- `rollback-auto-mode.sql`
- `snippets/Untitled query 494.sql`

---

## RLS Files Moved

| Source | Destination | Reason |
|---|---|---|
| `fix-admin-rls.sql` | `supabase/rls/multi-entity.sql` | comprehensive admin RLS |
| `fix-rls-policies.sql` | merged → `supabase/rls/multi-entity.sql` | most up-to-date full policy set |
| `fix-rls.sql` | merged → `supabase/rls/multi-entity.sql` | older version |
| `fix-cancel-rls.sql` | `supabase/rls/requests.sql` | request tables cancel policies |
| `fix-leave-wfh-rls.sql` | merged → `supabase/rls/requests.sql` | leave+wfh policies |
| `fix-holidays-rls.sql` | `supabase/rls/holidays.sql` | holidays policies |
| `fix-infinite-recursion.sql` | `supabase/rls/employees.sql` | employees RLS + get_my_role() |
| `fix-settings-rls.sql` | `supabase/rls/system-settings.sql` | system_settings policies |
| `fix-settings-rls-local.sql` | `supabase/rls/system-settings-local-dev.sql` | local dev only — permissive |
| `setup-storage.sql` | `supabase/rls/storage.sql` | Storage bucket + policies |
