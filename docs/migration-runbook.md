# Migration Runbook — Phase B (Multi-tenant organizations)

> Author: Vegapunk (Dev) — 2026-05-16  
> Branch: `refactor/2026-05`  
> Status: **READY TO APPLY** (DEFAULT hotfix applied 2026-05-17, production stable)

---

## Overview

Phase B adds a multi-tenant `organizations` table and an `organization_id` column to every tenant table in the database. This is a 3-step migration designed to be **zero-downtime** — each step is safe to apply independently, and the app continues working throughout.

| Step | Migration file | What it does | Safe to apply alone? |
|------|---------------|--------------|----------------------|
| Step 1 | `20260517000000_phase_b_step1_organizations.sql` | Create `organizations` table + nullable `organization_id` columns | Yes |
| Step 2 | `20260517000001_phase_b_step2_backfill.sql` | Backfill all rows to Anajak UUID | Yes (after Step 1) |
| Hotfix | `20260517000002_phase_b_hotfix_default_organization_id.sql` | SET DEFAULT on all columns | Yes (idempotent) |

> **Note**: Step 3 (NOT NULL constraints + RLS policy swap) is in `docs/phase-b-tenant-scope.md` and is scheduled for a later deployment window once Step 2 data is verified.

---

## Prerequisites

- Supabase project URL + service role key (from Supabase Dashboard → Settings → API)
- Node.js 18+ installed locally
- `.env.migration` file set up (see below)
- `pg` CLI or Supabase SQL Editor access

---

## 1. Set up `.env.migration` (Session Pooler workaround)

Supabase free tier uses a **Transaction Pooler** on port 6543 which does **not** support `SET` commands needed by Prisma migrate. Use the **Session Pooler** instead (port 5432 with `?pgbouncer=false`).

Create `.env.migration` at the project root (never commit this file):

```bash
# .env.migration — used ONLY for running migrations, never for app runtime
# Session Pooler URL: port 5432, NOT 6543
# Get from: Supabase Dashboard → Settings → Database → Connection string → URI
# Append: ?pgbouncer=false

DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?pgbouncer=false"
```

> The `?pgbouncer=false` flag forces the Supabase pooler into session mode, which supports the DDL `SET` statements that Prisma migrate requires.

Then run migrations with this file:

```bash
npx dotenv -e .env.migration -- npx prisma migrate deploy
```

---

## 2. Apply migrations via Supabase SQL Editor (alternative method)

If you prefer not to use the CLI, apply each file manually in order:

1. Open Supabase Dashboard → SQL Editor
2. Paste and run each file in order:
   - `supabase/migrations/20260517000000_phase_b_step1_organizations.sql`
   - `supabase/migrations/20260517000001_phase_b_step2_backfill.sql`
   - `supabase/migrations/20260517000002_phase_b_hotfix_default_organization_id.sql`

Each file is idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) so re-running is safe.

---

## 3. DEFAULT hotfix — why it exists

**Problem**: After applying Step 1 (nullable columns), the Prisma schema on the `main` branch did not yet have `organizationId` as a field. When the app tried to INSERT a new employee/attendance/etc., Postgres rejected it with:

```
ERROR: null value in column "organization_id" of relation "employees" violates not-null constraint
```

This happened because: Step 2 backfilled existing rows, but new INSERTs from main-branch code didn't include `organization_id` (Prisma model didn't know about it yet).

**Fix**: Set `DEFAULT '00000000-0000-0000-0000-000000000001'` (Anajak UUID) on all 24 tenant columns. This means any INSERT that doesn't specify `organization_id` automatically gets Anajak — which is correct for single-tenant operation.

**File**: `supabase/migrations/20260517000002_phase_b_hotfix_default_organization_id.sql`

This DEFAULT stays even after `refactor/2026-05` merges to main — it acts as a safety net during any future deploy lag.

---

## 4. Verify migration applied correctly

After applying, run these checks in Supabase SQL Editor:

```sql
-- Check organizations table exists with 5 rows
SELECT id, slug, name FROM public.organizations ORDER BY slug;
-- Expected: anajak, best-channel, ibear, meecard, meelike

-- Check organization_id column exists on employees
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'employees' AND column_name = 'organization_id';
-- Expected: uuid, DEFAULT '00000000-0000-0000-0000-000000000001', YES (nullable)

-- Check all existing employees have been backfilled
SELECT COUNT(*) FROM public.employees WHERE organization_id IS NULL;
-- Expected: 0
```

---

## 5. Rollback procedure

Rollback file: `supabase/rollback/phase_b_rollback.sql`

The file has 3 sections — run only the section(s) you need:

| Section | When to use |
|---------|------------|
| **A** — Undo Step 3 RLS + NOT NULL | Step 3 fails or causes auth issues |
| **B** — Set organization_id back to NULL | Step 2 backfill caused issues, Step 3 not applied |
| **C** — Drop columns + organizations table | Full revert to pre-Phase-B state |

**To run Section A** (most likely scenario):

1. Open Supabase Dashboard → SQL Editor
2. Open `supabase/rollback/phase_b_rollback.sql`
3. Copy Section A only (between `BEGIN;` and `COMMIT;`)
4. Run → verify no errors
5. Test a login + check-in to confirm app works

> Section B and C are commented out by default. Uncomment only when needed.

---

## 6. Connection string strategy summary

| Use case | Port | Pooler mode | File |
|----------|------|-------------|------|
| App runtime (Next.js) | 6543 | Transaction Pooler | `.env.local` |
| Schema migrations (Prisma migrate) | 5432 | Session Pooler | `.env.migration` |
| Direct psql / SQL Editor | 5432 | Direct connection | Supabase Dashboard |

**Never use the Transaction Pooler (6543) for `prisma migrate`** — it will fail with `prepared statement` errors.

---

## 7. Post-migration checklist

- [ ] `organizations` table has 5 rows
- [ ] All 24 tenant tables have `organization_id` column with DEFAULT
- [ ] Zero rows with `organization_id IS NULL`
- [ ] App can create new employee (INSERT test)
- [ ] App can log attendance (INSERT test)
- [ ] Admin navbar shows org switcher (OrgSwitcher component)
- [ ] `npm test` still 75/75 pass after migration
