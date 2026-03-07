/**
 * Sync ALL data from old project that might be missing in new project.
 * Compares every record and fills in anything missing.
 */

import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { loadMigrationEnv, required, log, logSection } from "./helpers.mjs";

const env = loadMigrationEnv();
const oldClient = new pg.Client({ connectionString: required(env, "OLD_DB_URL"), ssl: { rejectUnauthorized: false } });
const newClient = new pg.Client({ connectionString: required(env, "NEW_DB_URL"), ssl: { rejectUnauthorized: false } });

await oldClient.connect();
await newClient.connect();

const OLD_URL = required(env, "OLD_SUPABASE_URL");
const NEW_URL = required(env, "NEW_SUPABASE_URL");

logSection("Full Sync: Find & Fix ALL Missing Data");

// Get all tables
const { rows: tables } = await oldClient.query(`
  SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
`);

await newClient.query("SET session_replication_role = 'replica'");

let grandTotal = 0;

for (const { tablename } of tables) {
  // Count in both
  const { rows: [{ count: oldCount }] } = await oldClient.query(
    `SELECT COUNT(*)::int as count FROM "public"."${tablename}"`
  );
  const { rows: [{ count: newCount }] } = await newClient.query(
    `SELECT COUNT(*)::int as count FROM "public"."${tablename}"`
  );

  if (oldCount === newCount) {
    continue; // Same count, skip
  }

  const diff = oldCount - newCount;
  log(`\n${tablename}: old=${oldCount}, new=${newCount} (missing ${diff})`);

  // Get valid columns in new table
  const { rows: colInfo } = await newClient.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
  `, [tablename]);
  const validCols = new Set(colInfo.map(c => c.column_name));

  // Get all IDs in new project
  const { rows: newIds } = await newClient.query(
    `SELECT id FROM "public"."${tablename}"`
  );
  const newIdSet = new Set(newIds.map(r => r.id));

  // Get all rows from old project
  const { rows: oldRows } = await oldClient.query(
    `SELECT * FROM "public"."${tablename}"`
  );

  let inserted = 0;
  let updated = 0;
  let errors = 0;

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

    const isNew = !newIdSet.has(row.id);

    try {
      if (isNew) {
        await newClient.query(`
          INSERT INTO "public"."${tablename}" (${columns.map(c => `"${c}"`).join(", ")})
          VALUES (${placeholders.join(", ")})
        `, values);
        inserted++;
      }
    } catch (e) {
      if (errors === 0) log(`  Error: ${e.message.slice(0, 100)}`);
      errors++;
    }
  }

  grandTotal += inserted;
  log(`  -> Inserted: ${inserted}, Errors: ${errors}`);
}

await newClient.query("SET session_replication_role = 'origin'");

// Sync storage
logSection("Sync ALL Missing Storage Files");

const { rows: oldFiles } = await oldClient.query(
  "SELECT name FROM storage.objects WHERE bucket_id = 'attendance-photos'"
);
const { rows: newFiles } = await newClient.query(
  "SELECT name FROM storage.objects WHERE bucket_id = 'attendance-photos'"
);

const newFileSet = new Set(newFiles.map(f => f.name));
const missingFiles = oldFiles.filter(f => !newFileSet.has(f.name));

log(`Old: ${oldFiles.length} files, New: ${newFiles.length} files, Missing: ${missingFiles.length}`);

if (missingFiles.length > 0) {
  const newSupabase = createClient(NEW_URL, required(env, "NEW_SUPABASE_SERVICE_KEY"));
  let uploaded = 0;

  for (const file of missingFiles) {
    const publicUrl = `${OLD_URL}/storage/v1/object/public/attendance-photos/${encodeURIComponent(file.name).replace(/%2F/g, "/")}`;
    try {
      const res = await fetch(publicUrl);
      if (!res.ok) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      const { error } = await newSupabase.storage
        .from("attendance-photos")
        .upload(file.name, buffer, { contentType: "image/jpeg", upsert: true });
      if (!error) uploaded++;

      if (uploaded % 10 === 0) log(`  Progress: ${uploaded}/${missingFiles.length}`);
    } catch { /* skip */ }
  }
  log(`  Uploaded: ${uploaded}/${missingFiles.length}`);
}

// Final verification
logSection("Verification After Sync");

for (const { tablename } of tables) {
  const { rows: [{ count: o }] } = await oldClient.query(
    `SELECT COUNT(*)::int as count FROM "public"."${tablename}"`
  );
  const { rows: [{ count: n }] } = await newClient.query(
    `SELECT COUNT(*)::int as count FROM "public"."${tablename}"`
  );
  if (o !== n) {
    log(`STILL DIFF: ${tablename} old=${o} new=${n}`);
  }
}

const { rows: [{ count: oldStor }] } = await oldClient.query(
  "SELECT COUNT(*)::int as count FROM storage.objects WHERE bucket_id = 'attendance-photos'"
);
const { rows: [{ count: newStor }] } = await newClient.query(
  "SELECT COUNT(*)::int as count FROM storage.objects WHERE bucket_id = 'attendance-photos'"
);
log(`Storage: old=${oldStor}, new=${newStor}`);

await oldClient.end();
await newClient.end();

logSection("SYNC COMPLETE");
log(`Total new records inserted: ${grandTotal}`);
