/**
 * Fix CHECK constraints and re-import remaining failed data.
 * Also creates missing tables (field_work_requests).
 */

import pg from "pg";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { loadMigrationEnv, required, log, logSection, BACKUP_DIR } from "./helpers.mjs";

const env = loadMigrationEnv();
const NEW_DB_URL = required(env, "NEW_DB_URL");

async function main() {
  const client = new pg.Client({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // Phase 1: Check and fix constraints
  logSection("Phase 1: Fix CHECK Constraints");

  // Fix attendance_anomalies - add 'manual_edit' to anomaly_type check
  try {
    const { rows: anomalyConstraints } = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conrelid = 'public.attendance_anomalies'::regclass AND contype = 'c'
    `);
    log("Current attendance_anomalies constraints:");
    for (const c of anomalyConstraints) log(`  ${c.conname}: ${c.def}`);

    for (const c of anomalyConstraints) {
      if (c.conname.includes("anomaly_type") || c.def.includes("anomaly_type")) {
        await client.query(`ALTER TABLE "public"."attendance_anomalies" DROP CONSTRAINT "${c.conname}"`);
        log(`  Dropped: ${c.conname}`);
      }
      if (c.conname.includes("status") || c.def.includes("status")) {
        await client.query(`ALTER TABLE "public"."attendance_anomalies" DROP CONSTRAINT "${c.conname}"`);
        log(`  Dropped: ${c.conname}`);
      }
    }

    await client.query(`
      ALTER TABLE "public"."attendance_anomalies"
      ADD CONSTRAINT attendance_anomalies_anomaly_type_check
      CHECK (anomaly_type IN ('missing_checkout', 'early_checkout', 'auto_checkout', 'manual_edit', 'suspicious_location', 'overtime_mismatch'))
    `);
    log("  Added updated anomaly_type constraint");

    await client.query(`
      ALTER TABLE "public"."attendance_anomalies"
      ADD CONSTRAINT attendance_anomalies_status_check
      CHECK (status IN ('pending', 'resolved', 'dismissed', 'acknowledged'))
    `);
    log("  Added updated status constraint");
  } catch (e) {
    log(`  WARN: ${e.message.slice(0, 100)}`);
  }

  // Fix ot_requests - add 'cancelled' to status check
  try {
    const { rows: otConstraints } = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conrelid = 'public.ot_requests'::regclass AND contype = 'c'
    `);
    log("\nCurrent ot_requests constraints:");
    for (const c of otConstraints) log(`  ${c.conname}: ${c.def}`);

    for (const c of otConstraints) {
      if (c.conname.includes("status") || c.def.includes("status")) {
        await client.query(`ALTER TABLE "public"."ot_requests" DROP CONSTRAINT "${c.conname}"`);
        log(`  Dropped: ${c.conname}`);
      }
    }

    await client.query(`
      ALTER TABLE "public"."ot_requests"
      ADD CONSTRAINT ot_requests_status_check
      CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled'))
    `);
    log("  Added updated status constraint with 'cancelled'");
  } catch (e) {
    log(`  WARN: ${e.message.slice(0, 100)}`);
  }

  // Phase 2: Create missing field_work_requests table
  logSection("Phase 2: Create Missing Tables");

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS field_work_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID REFERENCES employees(id) NOT NULL,
        date DATE NOT NULL,
        is_half_day BOOLEAN DEFAULT false,
        location TEXT NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
        approved_by UUID REFERENCES employees(id),
        approved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        cancelled_by UUID REFERENCES employees(id),
        cancelled_at TIMESTAMP WITH TIME ZONE,
        cancel_reason TEXT
      )
    `);
    log("Created field_work_requests table");

    await client.query(`ALTER TABLE field_work_requests ENABLE ROW LEVEL SECURITY`);
    log("Enabled RLS on field_work_requests");
  } catch (e) {
    log(`field_work_requests: ${e.message.slice(0, 100)}`);
  }

  // Phase 3: Re-import failed data
  logSection("Phase 3: Re-import Failed Data");

  await client.query("SET session_replication_role = 'replica'");

  const retryTables = ["attendance_anomalies", "ot_requests", "field_work_requests"];

  for (const tableName of retryTables) {
    const dataFile = join(BACKUP_DIR, "data", `${tableName}.json`);
    if (!existsSync(dataFile)) continue;

    const rows = JSON.parse(readFileSync(dataFile, "utf-8"));
    if (rows.length === 0) { log(`  ${tableName}: 0 rows (skip)`); continue; }

    const { rows: tableCols } = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
    `, [tableName]);
    const validCols = new Set(tableCols.map(c => c.column_name));

    try { await client.query(`DELETE FROM "public"."${tableName}"`); } catch { /* */ }

    let inserted = 0;
    let errors = 0;

    for (const row of rows) {
      const columns = Object.keys(row).filter(c => validCols.has(c) && row[c] !== undefined);
      const values = columns.map(c => row[c]);
      const placeholders = columns.map((_, i) => `$${i + 1}`);

      try {
        await client.query(
          `INSERT INTO "public"."${tableName}" (${columns.map(c => `"${c}"`).join(", ")})
           VALUES (${placeholders.join(", ")})
           ON CONFLICT DO NOTHING`,
          values
        );
        inserted++;
      } catch (e) {
        if (errors === 0) log(`  ${tableName} error: ${e.message.slice(0, 120)}`);
        errors++;
      }
    }

    const status = errors > 0 ? ` (${errors} errors)` : "";
    log(`  ${tableName}: ${inserted}/${rows.length} rows${status}`);
  }

  await client.query("SET session_replication_role = 'origin'");
  await client.end();

  logSection("CONSTRAINT FIX COMPLETE");
}

main().catch(e => {
  console.error("[FATAL]", e.message);
  process.exit(1);
});
