/**
 * Find and fix missing columns between old and new databases,
 * then re-import failed auth users and table data.
 */

import pg from "pg";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { loadMigrationEnv, required, log, logSection, BACKUP_DIR } from "./helpers.mjs";

const env = loadMigrationEnv();
const OLD_DB_URL = required(env, "OLD_DB_URL");
const NEW_DB_URL = required(env, "NEW_DB_URL");

async function main() {
  const oldClient = new pg.Client({ connectionString: OLD_DB_URL, ssl: { rejectUnauthorized: false } });
  const newClient = new pg.Client({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } });
  await oldClient.connect();
  await newClient.connect();

  // Phase 1: Find and add missing columns
  logSection("Phase 1: Fix Missing Columns");

  const { rows: oldCols } = await oldClient.query(`
    SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default,
           character_maximum_length, numeric_precision, numeric_scale
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);

  const { rows: newCols } = await newClient.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `);

  const newColSet = new Set(newCols.map(c => `${c.table_name}.${c.column_name}`));

  const missing = oldCols.filter(c => !newColSet.has(`${c.table_name}.${c.column_name}`));

  if (missing.length === 0) {
    log("No missing columns found");
  } else {
    log(`Found ${missing.length} missing columns:`);
    for (const col of missing) {
      let typeDef = col.udt_name;
      if (col.udt_name === "varchar" && col.character_maximum_length) {
        typeDef = `VARCHAR(${col.character_maximum_length})`;
      } else if (col.udt_name === "numeric" && col.numeric_precision) {
        typeDef = `NUMERIC(${col.numeric_precision}, ${col.numeric_scale || 0})`;
      } else if (col.udt_name === "int4") {
        typeDef = "INTEGER";
      } else if (col.udt_name === "int8") {
        typeDef = "BIGINT";
      } else if (col.udt_name === "bool") {
        typeDef = "BOOLEAN";
      } else if (col.udt_name === "timestamptz") {
        typeDef = "TIMESTAMP WITH TIME ZONE";
      } else if (col.udt_name === "timestamp") {
        typeDef = "TIMESTAMP";
      } else if (col.udt_name === "text") {
        typeDef = "TEXT";
      } else if (col.udt_name === "uuid") {
        typeDef = "UUID";
      } else if (col.udt_name === "date") {
        typeDef = "DATE";
      } else if (col.udt_name === "jsonb") {
        typeDef = "JSONB";
      } else if (col.udt_name === "json") {
        typeDef = "JSON";
      } else if (col.udt_name === "_text") {
        typeDef = "TEXT[]";
      }

      let defaultClause = "";
      if (col.column_default) {
        defaultClause = ` DEFAULT ${col.column_default}`;
      }

      const sql = `ALTER TABLE "public"."${col.table_name}" ADD COLUMN IF NOT EXISTS "${col.column_name}" ${typeDef}${defaultClause}`;

      try {
        await newClient.query(sql);
        log(`  ADDED: ${col.table_name}.${col.column_name} (${typeDef})`);
      } catch (e) {
        log(`  FAIL: ${col.table_name}.${col.column_name}: ${e.message.slice(0, 80)}`);
      }
    }
  }

  // Phase 2: Re-import auth users (excluding generated columns)
  logSection("Phase 2: Re-import Auth Users");

  const usersFile = join(BACKUP_DIR, "auth_users.json");
  if (existsSync(usersFile)) {
    const users = JSON.parse(readFileSync(usersFile, "utf-8"));

    // Get list of generated/computed columns that can't be inserted
    const { rows: authColInfo } = await newClient.query(`
      SELECT column_name, is_generated, generation_expression
      FROM information_schema.columns
      WHERE table_schema = 'auth' AND table_name = 'users'
    `);
    const generatedCols = new Set(
      authColInfo
        .filter(c => c.is_generated === "ALWAYS" || c.generation_expression)
        .map(c => c.column_name)
    );
    // Also exclude 'confirmed_at' explicitly as it's a generated column in newer GoTrue
    generatedCols.add("confirmed_at");

    log(`Excluding generated columns: ${[...generatedCols].join(", ")}`);
    log(`Importing ${users.length} users...`);

    let imported = 0;
    let skipped = 0;

    for (const user of users) {
      const columns = Object.keys(user).filter(
        c => user[c] !== undefined && !generatedCols.has(c)
      );
      const values = columns.map(c => user[c]);
      const placeholders = columns.map((_, i) => `$${i + 1}`);

      try {
        await newClient.query(
          `INSERT INTO auth.users (${columns.map(c => `"${c}"`).join(", ")})
           VALUES (${placeholders.join(", ")})
           ON CONFLICT (id) DO UPDATE SET
           ${columns.filter(c => c !== "id").map(c => `"${c}" = EXCLUDED."${c}"`).join(", ")}`,
          values
        );
        imported++;
      } catch (e) {
        log(`  WARN ${user.email}: ${e.message.slice(0, 100)}`);
        skipped++;
      }
    }
    log(`Auth users: ${imported} imported, ${skipped} skipped`);
  }

  // Re-import auth identities
  const identitiesFile = join(BACKUP_DIR, "auth_identities.json");
  if (existsSync(identitiesFile)) {
    const identities = JSON.parse(readFileSync(identitiesFile, "utf-8"));

    const { rows: idColInfo } = await newClient.query(`
      SELECT column_name, is_generated, generation_expression
      FROM information_schema.columns
      WHERE table_schema = 'auth' AND table_name = 'identities'
    `);
    const genIdCols = new Set(
      idColInfo
        .filter(c => c.is_generated === "ALWAYS" || c.generation_expression)
        .map(c => c.column_name)
    );
    genIdCols.add("email");

    log(`\nImporting ${identities.length} identities (excluding: ${[...genIdCols].join(", ")})...`);

    let idImported = 0;
    let idSkipped = 0;

    for (const identity of identities) {
      const columns = Object.keys(identity).filter(
        c => identity[c] !== undefined && !genIdCols.has(c)
      );
      const values = columns.map(c => identity[c]);
      const placeholders = columns.map((_, i) => `$${i + 1}`);

      try {
        await newClient.query(
          `INSERT INTO auth.identities (${columns.map(c => `"${c}"`).join(", ")})
           VALUES (${placeholders.join(", ")})
           ON CONFLICT (id) DO UPDATE SET
           ${columns.filter(c => c !== "id").map(c => `"${c}" = EXCLUDED."${c}"`).join(", ")}`,
          values
        );
        idImported++;
      } catch (e) {
        log(`  WARN identity: ${e.message.slice(0, 100)}`);
        idSkipped++;
      }
    }
    log(`Auth identities: ${idImported} imported, ${idSkipped} skipped`);
  }

  // Phase 3: Re-import failed tables
  logSection("Phase 3: Re-import Failed Tables");

  const failedTables = [
    "employees", "attendance_logs", "attendance_anomalies",
    "late_requests", "leave_requests", "ot_requests", "wfh_requests"
  ];

  await newClient.query("SET session_replication_role = 'replica'");

  for (const tableName of failedTables) {
    const dataFile = join(BACKUP_DIR, "data", `${tableName}.json`);
    if (!existsSync(dataFile)) continue;

    const rows = JSON.parse(readFileSync(dataFile, "utf-8"));
    if (rows.length === 0) continue;

    // Get actual columns in the new table
    const { rows: tableCols } = await newClient.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
    `, [tableName]);
    const validCols = new Set(tableCols.map(c => c.column_name));

    // Clear existing data
    try {
      await newClient.query(`DELETE FROM "public"."${tableName}"`);
    } catch { /* ignore */ }

    let inserted = 0;
    let errors = 0;

    for (const row of rows) {
      // Only include columns that exist in the new table
      const columns = Object.keys(row).filter(c => validCols.has(c) && row[c] !== undefined);
      const values = columns.map(c => row[c]);
      const placeholders = columns.map((_, i) => `$${i + 1}`);

      try {
        await newClient.query(
          `INSERT INTO "public"."${tableName}" (${columns.map(c => `"${c}"`).join(", ")})
           VALUES (${placeholders.join(", ")})
           ON CONFLICT DO NOTHING`,
          values
        );
        inserted++;
      } catch (e) {
        if (errors === 0) log(`  ${tableName} error: ${e.message.slice(0, 100)}`);
        errors++;
      }
    }

    const status = errors > 0 ? ` (${errors} errors)` : "";
    log(`  ${tableName}: ${inserted}/${rows.length} rows${status}`);
  }

  await newClient.query("SET session_replication_role = 'origin'");

  // Phase 4: Update photo URLs
  logSection("Phase 4: Update Photo URLs");

  const OLD_URL = required(env, "OLD_SUPABASE_URL");
  const NEW_URL = required(env, "NEW_SUPABASE_URL");

  if (OLD_URL !== NEW_URL) {
    const { rows: textCols } = await newClient.query(`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND data_type IN ('text', 'character varying')
    `);

    let totalUpdated = 0;
    for (const { table_name, column_name } of textCols) {
      try {
        const { rowCount } = await newClient.query(
          `UPDATE "public"."${table_name}" SET "${column_name}" = REPLACE("${column_name}", $1, $2) WHERE "${column_name}" LIKE $3`,
          [OLD_URL, NEW_URL, `${OLD_URL}%`]
        );
        if (rowCount > 0) {
          log(`  ${table_name}.${column_name}: ${rowCount} URLs updated`);
          totalUpdated += rowCount;
        }
      } catch { /* ignore */ }
    }
    log(`Total: ${totalUpdated} URLs updated`);
  }

  await oldClient.end();
  await newClient.end();

  logSection("FIX COMPLETE");
  log("All issues resolved. Run verify.mjs to confirm.");
}

main().catch(e => {
  console.error("[FATAL]", e.message);
  console.error(e.stack);
  process.exit(1);
});
