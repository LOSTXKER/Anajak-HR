/**
 * Sync today's new data from old project to new project.
 * This handles data that was written to the old project after migration.
 */

import { loadMigrationEnv, required, log, logSection, createPgClient } from "./helpers.mjs";

const env = loadMigrationEnv();
const oldClient = createPgClient(required(env, "OLD_DB_URL"));
const newClient = createPgClient(required(env, "NEW_DB_URL"));

await oldClient.connect();
await newClient.connect();

const OLD_URL = required(env, "OLD_SUPABASE_URL");
const NEW_URL = required(env, "NEW_SUPABASE_URL");

logSection("Sync New Data from Old Project");

const tables = [
  { name: "attendance_logs", dateCol: "work_date" },
  { name: "ot_requests", dateCol: "request_date" },
  { name: "leave_requests", dateCol: "created_at" },
  { name: "wfh_requests", dateCol: "created_at" },
  { name: "late_requests", dateCol: "request_date" },
  { name: "field_work_requests", dateCol: "created_at" },
];

// Get the last export date (approx when migration ran)
const migrationDate = "2026-03-07";

await newClient.query("SET session_replication_role = 'replica'");

let totalSynced = 0;

for (const { name, dateCol } of tables) {
  // Get new records from old project (created after migration)
  const { rows: oldRows } = await oldClient.query(`
    SELECT * FROM "public"."${name}"
    WHERE "${dateCol}" >= $1::date
  `, [migrationDate]);

  if (oldRows.length === 0) {
    log(`${name}: no new data since ${migrationDate}`);
    continue;
  }

  // Get valid columns in new table
  const { rows: colInfo } = await newClient.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
  `, [name]);
  const validCols = new Set(colInfo.map(c => c.column_name));

  let inserted = 0;
  let skipped = 0;

  for (const row of oldRows) {
    const columns = Object.keys(row).filter(c => validCols.has(c) && row[c] !== undefined);
    const values = columns.map(c => {
      let val = row[c];
      if (typeof val === "string" && val.includes(OLD_URL)) {
        val = val.replace(OLD_URL, NEW_URL);
      }
      return val;
    });
    const placeholders = columns.map((_, i) => `$${i + 1}`);

    try {
      await newClient.query(`
        INSERT INTO "public"."${name}" (${columns.map(c => `"${c}"`).join(", ")})
        VALUES (${placeholders.join(", ")})
        ON CONFLICT (id) DO UPDATE SET
        ${columns.filter(c => c !== "id").map(c => `"${c}" = EXCLUDED."${c}"`).join(", ")}
      `, values);
      inserted++;
    } catch (e) {
      if (skipped === 0) log(`  ${name} error: ${e.message.slice(0, 100)}`);
      skipped++;
    }
  }

  totalSynced += inserted;
  log(`${name}: ${inserted} synced, ${skipped} skipped (from ${oldRows.length} records since ${migrationDate})`);
}

await newClient.query("SET session_replication_role = 'origin'");

// Also sync any new storage files
logSection("Sync Storage");
const { rows: oldFiles } = await oldClient.query(`
  SELECT name FROM storage.objects
  WHERE bucket_id = 'attendance-photos'
  AND created_at >= $1::date
`, [migrationDate]);

log(`${oldFiles.length} new storage files since ${migrationDate}`);

if (oldFiles.length > 0) {
  const { createClient } = await import("@supabase/supabase-js");
  const newSupabase = createClient(NEW_URL, required(env, "NEW_SUPABASE_SERVICE_KEY"));

  let uploaded = 0;
  for (const file of oldFiles) {
    const publicUrl = `${OLD_URL}/storage/v1/object/public/attendance-photos/${encodeURIComponent(file.name).replace(/%2F/g, "/")}`;
    try {
      const res = await fetch(publicUrl);
      if (!res.ok) continue;
      const buffer = Buffer.from(await res.arrayBuffer());

      const { error } = await newSupabase.storage
        .from("attendance-photos")
        .upload(file.name, buffer, { contentType: "image/jpeg", upsert: true });
      if (!error) uploaded++;
    } catch { /* skip */ }
  }
  log(`Uploaded ${uploaded}/${oldFiles.length} files`);
}

await oldClient.end();
await newClient.end();

logSection("SYNC COMPLETE");
log(`Total: ${totalSynced} records synced`);
log("\nIMPORTANT: Update Vercel env vars NOW to prevent further data split!");
