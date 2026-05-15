// Run with: node scripts/fix-cancel-constraints.mjs
// Adds 'cancelled' to status CHECK constraints + cancel/admin columns
// for all request tables (wfh, ot, leave, late, field_work).
//
// Uses DIRECT_URL (session mode) because DDL doesn't work well via pgbouncer.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, "..", ".env.local");
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    if (process.env[m[1]] === undefined) {
      let v = m[2];
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      process.env[m[1]] = v;
    }
  }
}

loadEnv();

// Prefer DATABASE_URL (pooler) — DIRECT_URL host is often unreachable on IPv4 networks
const connectionString =
  process.env.DATABASE_URL || process.env.DIRECT_URL;

if (!connectionString) {
  console.error("Missing DIRECT_URL / DATABASE_URL in .env.local");
  process.exit(1);
}

const SQL = `
-- WFH
ALTER TABLE wfh_requests DROP CONSTRAINT IF EXISTS wfh_requests_status_check;
ALTER TABLE wfh_requests
  ADD CONSTRAINT wfh_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));
ALTER TABLE wfh_requests
  ADD COLUMN IF NOT EXISTS cancelled_by  UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS cancelled_at  TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS approved_at   TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS admin_note    TEXT;

-- OT
ALTER TABLE ot_requests DROP CONSTRAINT IF EXISTS ot_requests_status_check;
ALTER TABLE ot_requests
  ADD CONSTRAINT ot_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled'));
ALTER TABLE ot_requests
  ADD COLUMN IF NOT EXISTS cancelled_by  UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS cancelled_at  TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS approved_at   TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS admin_note    TEXT;

-- Leave
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_status_check;
ALTER TABLE leave_requests
  ADD CONSTRAINT leave_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));
ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS cancelled_by  UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS cancelled_at  TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS approved_at   TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS admin_note    TEXT;

-- Late (table may or may not exist; guard with DO block)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'late_requests') THEN
    EXECUTE 'ALTER TABLE late_requests DROP CONSTRAINT IF EXISTS late_requests_status_check';
    EXECUTE 'ALTER TABLE late_requests ADD CONSTRAINT late_requests_status_check
             CHECK (status IN (''pending'', ''approved'', ''rejected'', ''cancelled''))';
    EXECUTE 'ALTER TABLE late_requests
             ADD COLUMN IF NOT EXISTS cancelled_by  UUID REFERENCES employees(id),
             ADD COLUMN IF NOT EXISTS cancelled_at  TIMESTAMP WITH TIME ZONE,
             ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
             ADD COLUMN IF NOT EXISTS approved_at   TIMESTAMP WITH TIME ZONE,
             ADD COLUMN IF NOT EXISTS admin_note    TEXT';
  END IF;
END $$;

-- Field work (table may or may not exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'field_work_requests') THEN
    EXECUTE 'ALTER TABLE field_work_requests DROP CONSTRAINT IF EXISTS field_work_requests_status_check';
    EXECUTE 'ALTER TABLE field_work_requests ADD CONSTRAINT field_work_requests_status_check
             CHECK (status IN (''pending'', ''approved'', ''rejected'', ''cancelled''))';
  END IF;
END $$;
`;

const VERIFY_SQL = `
SELECT conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conname IN (
  'wfh_requests_status_check',
  'ot_requests_status_check',
  'leave_requests_status_check',
  'late_requests_status_check',
  'field_work_requests_status_check'
)
ORDER BY conname;
`;

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  console.log("Connecting to database...");
  await client.connect();
  console.log("Connected. Applying fix...");
  await client.query(SQL);
  console.log("SQL executed successfully.\n");

  console.log("Verifying constraints:");
  const r = await client.query(VERIFY_SQL);
  for (const row of r.rows) {
    console.log(`  - ${row.conname}: ${row.def}`);
  }
  console.log("\nDone. You should now be able to cancel WFH (and other) requests.");
} catch (err) {
  console.error("ERROR:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
