/**
 * Fix remaining verification failures:
 * 1. OT photo URLs still pointing to old project
 * 2. Missing database functions
 * 3. Retry failed storage file
 */

import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, readFileSync, mkdirSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadMigrationEnv, required, log, logSection, BACKUP_DIR } from "./helpers.mjs";

const env = loadMigrationEnv();
const NEW_DB_URL = required(env, "NEW_DB_URL");
const OLD_SUPABASE_URL = required(env, "OLD_SUPABASE_URL");
const NEW_SUPABASE_URL = required(env, "NEW_SUPABASE_URL");
const NEW_SUPABASE_SERVICE_KEY = required(env, "NEW_SUPABASE_SERVICE_KEY");

async function main() {
  const client = new pg.Client({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // Fix 1: Update remaining old URLs
  logSection("Fix 1: Update Remaining Photo URLs");

  const urlColumns = [
    { table: "ot_requests", col: "before_photo_url" },
    { table: "ot_requests", col: "after_photo_url" },
  ];

  for (const { table, col } of urlColumns) {
    const { rowCount } = await client.query(
      `UPDATE "public"."${table}" SET "${col}" = REPLACE("${col}", $1, $2) WHERE "${col}" LIKE $3`,
      [OLD_SUPABASE_URL, NEW_SUPABASE_URL, `${OLD_SUPABASE_URL}%`]
    );
    log(`  ${table}.${col}: ${rowCount} URLs updated`);
  }

  // Fix 2: Create missing functions
  logSection("Fix 2: Create Missing Functions");

  try {
    await client.query(`
      CREATE OR REPLACE FUNCTION get_current_user_role()
      RETURNS TEXT AS $$
      DECLARE
        user_role TEXT;
      BEGIN
        SELECT role INTO user_role FROM public.employees WHERE id = auth.uid();
        RETURN COALESCE(user_role, 'staff');
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
    `);
    log("  Created: get_current_user_role()");
  } catch (e) {
    log(`  WARN get_current_user_role: ${e.message.slice(0, 100)}`);
  }

  try {
    await client.query(`
      CREATE OR REPLACE FUNCTION get_unread_announcement_count()
      RETURNS INTEGER AS $$
      DECLARE
        unread_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO unread_count
        FROM public.announcements a
        WHERE a.is_active = true
          AND NOT EXISTS (
            SELECT 1 FROM public.announcement_reads ar
            WHERE ar.announcement_id = a.id AND ar.employee_id = auth.uid()
          );
        RETURN COALESCE(unread_count, 0);
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
    `);
    log("  Created: get_unread_announcement_count()");
  } catch (e) {
    log(`  WARN get_unread_announcement_count: ${e.message.slice(0, 100)}`);
  }

  await client.end();

  // Fix 3: Retry failed storage file
  logSection("Fix 3: Retry Failed Storage File");

  const missingFile = "65151e45-1081-4613-bb80-2204bfb739a9/2026-02-02_10-06-53_checkin.jpg";
  const publicUrl = `${OLD_SUPABASE_URL}/storage/v1/object/public/attendance-photos/${missingFile}`;

  try {
    const res = await fetch(publicUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());

    const localPath = join(BACKUP_DIR, "storage", "attendance-photos", missingFile);
    mkdirSync(resolve(localPath, ".."), { recursive: true });
    writeFileSync(localPath, buffer);
    log(`  Downloaded: ${missingFile} (${buffer.length} bytes)`);

    const supabase = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_KEY);
    const { error } = await supabase.storage
      .from("attendance-photos")
      .upload(missingFile, buffer, { contentType: "image/jpeg", upsert: true });

    if (error) throw error;
    log(`  Uploaded to new project`);
  } catch (e) {
    log(`  Could not recover file: ${e.message}`);
  }

  logSection("ALL FIXES COMPLETE");
  log("Run verify.mjs again to confirm all checks pass.");
}

main().catch(e => {
  console.error("[FATAL]", e.message);
  process.exit(1);
});
