# Archived RLS Files

ไฟล์ที่ถูก supersede แล้ว — เก็บไว้เพื่อ audit trail (reversible)

| ไฟล์ | Superseded by | วันที่ archived |
|------|---------------|-----------------|
| `employees.sql` | `_phase_b_step3_rewrite.sql` (Phase B Step 3 multi-tenant rewrite) | 2026-05-17 |
| `requests.sql` | `_phase_b_step3_rewrite.sql` (Phase B Step 3 — all request tables org-scoped) | 2026-05-17 |
| `system-settings.sql` | `_phase_b_step3_rewrite.sql` (Phase B Step 3 — `settings_select_org` replaces `settings_select_filtered`) | 2026-05-17 |
| `multi-entity.sql` | `_phase_b_step3_rewrite.sql` for attendance/branches; `holidays.sql` still active for holidays portion | 2026-05-17 |

## Notes

- ไฟล์ใน archived/ **ไม่ apply** ใน production DB อีกแล้ว
- ถ้าต้องการ rollback → ต้องย้อน Phase B Step 3 ด้วย (ไม่ใช่แค่ restore ไฟล์นี้)
- ไฟล์ที่ยังใช้งานอยู่ใน `supabase/rls/` (root level):
  - `_organization_helpers.sql` — helper functions (APPLIED 2026-05-16)
  - `_phase_b_step3_rewrite.sql` — main Phase B policies (APPLIED 2026-05-16)
  - `holidays.sql` — holidays policies (APPLIED 2026-05-16)
  - `storage.sql` — storage bucket policies (APPLIED 2026-05-16)
  - `system-settings-local-dev.sql` — LOCAL DEV ONLY (ห้ามรันใน production)
