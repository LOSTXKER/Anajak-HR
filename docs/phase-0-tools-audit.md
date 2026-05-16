# Phase 0 — Admin Tools Audit

**Date**: 2026-05-16
**Audited path**: `app/admin/tools/`
**Phase D target**: reorg per Phase 0 audit (Day 13)

## Current Structure

```
app/admin/tools/
├── page.tsx           (redirect page)
└── quick-fix/
    └── page.tsx       (Quick Fix Dashboard — main page)
```

**Total items**: 2 files (1 subfolder)

## Item-by-item Tag

### `app/admin/tools/page.tsx`

**Tag**: KEEP (modify in Phase D)

**Current behavior**: Client-side redirect to `/admin`

**Rationale**: ถ้าไม่มีหน้า index, URL `/admin/tools` จะ 404 ผู้ใช้ redirect ไป `/admin` แทน
ใน Phase D → เปลี่ยนเป็น proper index page หรือ redirect ไปยัง sub-tool ที่ active

**Phase D action**: ถ้า Quick Fix เป็น tool เดียวที่ KEEP → redirect ตรงไปที่ `/admin/tools/quick-fix` แทน `/admin`

---

### `app/admin/tools/quick-fix/page.tsx`

**Tag**: KEEP

**What it does**:
- Dashboard ตรวจสอบปัญหา real-time 3 ประเภท:
  1. พนักงานยังไม่เช็คเอาท์ (high severity)
  2. OT pending นานเกิน 24 ชม. (medium severity)
  3. มาสายแต่ไม่ขออนุมัติ (low severity)
- WFH backfill tool — เพิ่ม attendance_log ย้อนหลังสำหรับ WFH ที่อนุมัติแล้ว
- Leave balance recalculation tool — คำนวณวันลาคงเหลือใหม่ (ข้าม weekend/holiday)
- Quick fix actions: แก้ checkout ลืม + approve OT เก่า

**Rationale**: ใช้งานจริงทุกวัน — ops dashboard ที่ admin ต้องการ ไม่ใช่ legacy dump

**Phase D action**: KEEP ที่ `/admin/tools/quick-fix` — อาจเพิ่ม sidebar link ที่ชัดเจนขึ้น
(ปัจจุบัน sidebar อาจไม่มี link ตรงๆ → ตรวจใน Phase C/D)

---

## Summary

| Item | Tag | Phase D Action |
|---|---|---|
| `page.tsx` (redirect) | KEEP — modify | เปลี่ยน redirect target จาก `/admin` → `/admin/tools/quick-fix` |
| `quick-fix/page.tsx` | KEEP | เพิ่ม sidebar link ให้ชัดเจน |

**Breakdown**: KEEP 2 / MOVE 0 / DELETE 0

## Notes

- `app/admin/tools/` ปัจจุบัน scope เล็กมาก (2 files) — ยังไม่เป็น "generic dump" ตาม Pain #7
- Pain #7 ที่แท้จริงน่าจะมาจาก naming "tools" ที่คลุมเครือ + ขาด sidebar navigation
- Phase D recommendation: rename path เป็น `/admin/ops` หรือ `/admin/quick-fix` โดยตรง ถ้า scope ยังเล็กแบบนี้
  แต่ตัดสินใจสุดท้ายใน Phase D หลังดู Pain #7 scope ครบ

## DB Backup Strategy

**Approach**: pg_dump local (ฟรี — ไม่ใช้ Supabase Pro backup feature $25/mo)

**Connection**: ใช้ `DIRECT_URL` (port 5432, direct connection) — ไม่ใช่ `DATABASE_URL` (pooler port 6543)
- pg_dump ไม่รองรับ pgbouncer pooler → ต้องใช้ direct เท่านั้น
- `DIRECT_URL` อยู่ใน `.env.local` แล้ว

**Scripts**:
| Command | ไฟล์ | หน้าที่ |
|---|---|---|
| `npm run backup` | `scripts/backup-db.mjs` | สร้าง SQL snapshot → `backups/` |
| `npm run backup -- --label=pre-phase-b` | ← เดิม | ตั้งชื่อ label |
| `npm run restore backups/file.sql` | `scripts/restore-db.mjs` | restore พร้อม double-confirm |

**Backup ก่อน Phase B (2026-05-19) — mandatory**:
```
npm run backup -- --label=pre-phase-b
```

**Output location**: `backups/YYYY-MM-DD-HHmm-{label}.sql`
- folder ถูก gitignore แล้ว — ไฟล์อยู่บนเครื่องเบสเท่านั้น
- แนะนำ copy ไปเก็บบน Google Drive / USB หลัง backup สำเร็จ

**Requirements**: PostgreSQL client tools (`pg_dump` + `psql`) ต้องอยู่ใน PATH
- ดาวน์โหลด: https://www.postgresql.org/download/windows/ (เลือก v15)
- หรือ: `scoop install postgresql` / `choco install postgresql`

---

## Sidebar Check (Phase D todo)

- [ ] ตรวจ `components/admin/AdminLayout.tsx` หรือ sidebar component ว่ามี link ไป `/admin/tools/quick-fix` หรือไม่
- [ ] ถ้าไม่มี → เพิ่มใน Phase C (Day 12 sidebar update)
