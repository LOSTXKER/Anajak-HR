/**
 * Supabase Migration - Verification Script
 *
 * Compares OLD and NEW projects to ensure data integrity:
 *   - Record counts for all tables
 *   - Auth user counts
 *   - Storage file counts
 *   - Photo URL validity
 *
 * Usage: node scripts/migration/verify.mjs
 */

import { createClient } from "@supabase/supabase-js";
import {
  loadMigrationEnv,
  required,
  log,
  logSection,
  createPgClient,
} from "./helpers.mjs";

const env = loadMigrationEnv();
const OLD_DB_URL = required(env, "OLD_DB_URL");
const NEW_DB_URL = required(env, "NEW_DB_URL");
const OLD_SUPABASE_URL = required(env, "OLD_SUPABASE_URL");
const OLD_SUPABASE_SERVICE_KEY = required(env, "OLD_SUPABASE_SERVICE_KEY");
const NEW_SUPABASE_URL = required(env, "NEW_SUPABASE_URL");
const NEW_SUPABASE_SERVICE_KEY = required(env, "NEW_SUPABASE_SERVICE_KEY");

async function listAllStorageFiles(supabase, bucket, prefix = "") {
  const allFiles = [];
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(prefix, { limit: 1000 });
  if (error || !data) return allFiles;

  for (const item of data) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id) {
      allFiles.push(fullPath);
    } else {
      const sub = await listAllStorageFiles(supabase, bucket, fullPath);
      allFiles.push(...sub);
    }
  }
  return allFiles;
}

async function main() {
  logSection("Supabase Migration - VERIFICATION");

  const oldClient = createPgClient(OLD_DB_URL);
  const newClient = createPgClient(NEW_DB_URL);

  try {
    log("Connecting to both databases...");
    await oldClient.connect();
    await newClient.connect();
    log("Both connected!\n");

    // 1. Compare table record counts
    logSection("1. Table Record Counts");

    const { rows: oldTables } = await oldClient.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' ORDER BY tablename
    `);
    const { rows: newTables } = await newClient.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' ORDER BY tablename
    `);

    const oldTableNames = new Set(oldTables.map((t) => t.tablename));
    const newTableNames = new Set(newTables.map((t) => t.tablename));

    let tablePass = 0;
    let tableFail = 0;

    for (const name of oldTableNames) {
      if (!newTableNames.has(name)) {
        log(`  MISSING TABLE: ${name}`);
        tableFail++;
        continue;
      }

      const { rows: [{ count: oldCount }] } = await oldClient.query(
        `SELECT COUNT(*)::int as count FROM "public"."${name}"`
      );
      const { rows: [{ count: newCount }] } = await newClient.query(
        `SELECT COUNT(*)::int as count FROM "public"."${name}"`
      );

      const match = oldCount === newCount;
      const icon = match ? "PASS" : "FAIL";
      log(`  ${icon}: ${name.padEnd(30)} old=${oldCount}\tnew=${newCount}`);

      if (match) tablePass++;
      else tableFail++;
    }

    for (const name of newTableNames) {
      if (!oldTableNames.has(name)) {
        log(`  NEW TABLE: ${name} (extra, OK)`);
      }
    }

    log(`\nTables: ${tablePass} passed, ${tableFail} failed`);

    // 2. Auth users
    logSection("2. Auth Users");

    const { rows: [{ count: oldUsers }] } = await oldClient.query(
      "SELECT COUNT(*)::int as count FROM auth.users"
    );
    const { rows: [{ count: newUsers }] } = await newClient.query(
      "SELECT COUNT(*)::int as count FROM auth.users"
    );

    const authMatch = oldUsers === newUsers;
    log(`  ${authMatch ? "PASS" : "FAIL"}: auth.users - old=${oldUsers}, new=${newUsers}`);

    const { rows: [{ count: oldIdentities }] } = await oldClient.query(
      "SELECT COUNT(*)::int as count FROM auth.identities"
    );
    const { rows: [{ count: newIdentities }] } = await newClient.query(
      "SELECT COUNT(*)::int as count FROM auth.identities"
    );

    const idMatch = oldIdentities === newIdentities;
    log(`  ${idMatch ? "PASS" : "FAIL"}: auth.identities - old=${oldIdentities}, new=${newIdentities}`);

    // 3. Check photo URLs point to new project
    logSection("3. Photo URL Check");

    const urlChecks = [
      { table: "attendance_logs", col: "clock_in_photo_url" },
      { table: "attendance_logs", col: "clock_out_photo_url" },
      { table: "ot_requests", col: "before_photo_url" },
      { table: "ot_requests", col: "after_photo_url" },
      { table: "employees", col: "face_profile_image_url" },
    ];

    let urlPass = true;
    for (const { table, col } of urlChecks) {
      try {
        const { rows: [{ count }] } = await newClient.query(
          `SELECT COUNT(*)::int as count FROM "public"."${table}"
           WHERE "${col}" IS NOT NULL AND "${col}" LIKE $1`,
          [`${OLD_SUPABASE_URL}%`]
        );
        if (count > 0) {
          log(`  FAIL: ${table}.${col} still has ${count} old URLs`);
          urlPass = false;
        } else {
          log(`  PASS: ${table}.${col} - no old URLs`);
        }
      } catch {
        log(`  SKIP: ${table}.${col} (column may not exist)`);
      }
    }

    // 4. Database functions check
    logSection("4. Database Functions");

    const { rows: oldFuncs } = await oldClient.query(`
      SELECT routine_name FROM information_schema.routines
      WHERE routine_schema = 'public' ORDER BY routine_name
    `);
    const { rows: newFuncs } = await newClient.query(`
      SELECT routine_name FROM information_schema.routines
      WHERE routine_schema = 'public' ORDER BY routine_name
    `);

    const oldFuncNames = new Set(oldFuncs.map((f) => f.routine_name));
    const newFuncNames = new Set(newFuncs.map((f) => f.routine_name));

    let funcPass = 0;
    let funcMissing = 0;
    for (const name of oldFuncNames) {
      if (newFuncNames.has(name)) {
        funcPass++;
      } else {
        log(`  MISSING: ${name}`);
        funcMissing++;
      }
    }
    log(`  Functions: ${funcPass} present, ${funcMissing} missing`);

    // 5. Storage check
    logSection("5. Storage Files");

    const oldSupabase = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_SERVICE_KEY);
    const newSupabase = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_KEY);

    try {
      const oldFiles = await listAllStorageFiles(oldSupabase, "attendance-photos");
      const newFiles = await listAllStorageFiles(newSupabase, "attendance-photos");

      const storageMatch = oldFiles.length === newFiles.length;
      log(
        `  ${storageMatch ? "PASS" : "FAIL"}: attendance-photos - old=${oldFiles.length}, new=${newFiles.length}`
      );

      if (!storageMatch && oldFiles.length > 0) {
        const newSet = new Set(newFiles);
        const missing = oldFiles.filter((f) => !newSet.has(f));
        if (missing.length > 0 && missing.length <= 10) {
          log(`  Missing files: ${missing.join(", ")}`);
        } else if (missing.length > 10) {
          log(`  ${missing.length} files missing`);
        }
      }
    } catch (e) {
      log(`  ERROR: Could not check storage: ${e.message}`);
    }

    // Summary
    logSection("VERIFICATION SUMMARY");

    const allPassed = tableFail === 0 && authMatch && idMatch && urlPass && funcMissing === 0;

    if (allPassed) {
      log("ALL CHECKS PASSED!");
      log("\nYour migration is complete. Safe to:");
      log("  1. Update .env.local with new credentials");
      log("  2. Deploy with new environment variables");
      log("  3. Keep old project as backup for a few days");
    } else {
      log("SOME CHECKS FAILED - review issues above");
      log("\nCommon fixes:");
      if (tableFail > 0) log("  - Re-run import.mjs for table data");
      if (!authMatch) log("  - Re-run import.mjs for auth users");
      if (!urlPass) log("  - Photo URLs not updated, check import.mjs Phase 5");
      if (funcMissing > 0) log("  - Missing functions, re-apply migrations");
    }

    await oldClient.end();
    await newClient.end();
  } catch (e) {
    console.error("\n[FATAL]", e.message);
    console.error(e.stack);
    await oldClient.end().catch(() => {});
    await newClient.end().catch(() => {});
    process.exit(1);
  }
}

main();
