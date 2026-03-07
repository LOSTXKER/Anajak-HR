/**
 * Supabase Migration - Export Script
 *
 * Exports from the OLD Supabase project:
 *   1. Database schema (via pg_dump or migration files fallback)
 *   2. All public table data as JSON
 *   3. Auth users + identities
 *   4. Storage files from attendance-photos bucket
 *
 * Usage: node scripts/migration/export.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { execSync } from "child_process";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
  copyFileSync,
} from "fs";
import { resolve, join } from "path";
import {
  loadMigrationEnv,
  required,
  log,
  logSection,
  BACKUP_DIR,
  MIGRATIONS_DIR,
  createPgClient,
} from "./helpers.mjs";

const env = loadMigrationEnv();
const OLD_DB_URL = required(env, "OLD_DB_URL");
const OLD_SUPABASE_URL = required(env, "OLD_SUPABASE_URL");
const OLD_SUPABASE_SERVICE_KEY = required(env, "OLD_SUPABASE_SERVICE_KEY");

mkdirSync(join(BACKUP_DIR, "data"), { recursive: true });
mkdirSync(join(BACKUP_DIR, "storage"), { recursive: true });

async function exportSchema() {
  logSection("Phase 1: Export Database Schema");

  let pgDumpAvailable = false;
  try {
    execSync("pg_dump --version", { stdio: "pipe" });
    pgDumpAvailable = true;
  } catch {
    /* pg_dump not found */
  }

  if (pgDumpAvailable) {
    log("pg_dump found, exporting schema...");
    try {
      const schema = execSync(
        `pg_dump --schema-only --no-owner --no-privileges --no-comments --schema=public ` +
          `--no-tablespaces -d "${OLD_DB_URL}"`,
        { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 }
      );
      writeFileSync(join(BACKUP_DIR, "schema.sql"), schema);
      log(`Schema exported (${(schema.length / 1024).toFixed(1)} KB)`);
      return "pg_dump";
    } catch (e) {
      log(`pg_dump failed: ${e.message}`);
      log("Falling back to migration files...");
    }
  } else {
    log("pg_dump not found on system, using migration files as fallback...");
  }

  const migrationsBackup = join(BACKUP_DIR, "migrations");
  mkdirSync(migrationsBackup, { recursive: true });

  if (!existsSync(MIGRATIONS_DIR)) {
    console.error(`[ERROR] Migration directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    copyFileSync(join(MIGRATIONS_DIR, file), join(migrationsBackup, file));
  }
  log(`Copied ${files.length} migration files to backup`);
  return "migrations";
}

async function exportData(client) {
  logSection("Phase 2: Export Table Data");

  const { rows: tables } = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);

  log(`Found ${tables.length} tables in public schema`);
  const manifest = {};

  for (const { tablename } of tables) {
    const { rows } = await client.query(
      `SELECT * FROM "public"."${tablename}"`
    );
    const filePath = join(BACKUP_DIR, "data", `${tablename}.json`);
    writeFileSync(filePath, JSON.stringify(rows, null, 2));
    manifest[tablename] = rows.length;
    log(`  ${tablename}: ${rows.length} rows`);
  }

  writeFileSync(
    join(BACKUP_DIR, "data", "_manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  log(`\nTotal: ${Object.values(manifest).reduce((a, b) => a + b, 0)} rows across ${tables.length} tables`);
}

async function exportAuth(client) {
  logSection("Phase 3: Export Auth Users");

  const { rows: users } = await client.query("SELECT * FROM auth.users");
  writeFileSync(
    join(BACKUP_DIR, "auth_users.json"),
    JSON.stringify(users, null, 2)
  );
  log(`Exported ${users.length} auth users`);

  const { rows: identities } = await client.query(
    "SELECT * FROM auth.identities"
  );
  writeFileSync(
    join(BACKUP_DIR, "auth_identities.json"),
    JSON.stringify(identities, null, 2)
  );
  log(`Exported ${identities.length} auth identities`);
}

async function listAllStorageFiles(supabase, bucket, prefix = "") {
  const allFiles = [];
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(prefix, { limit: 1000 });

  if (error) {
    log(`  Warning: Could not list ${prefix || "/"}: ${error.message}`);
    return allFiles;
  }
  if (!data) return allFiles;

  for (const item of data) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id) {
      allFiles.push(fullPath);
    } else {
      const subFiles = await listAllStorageFiles(supabase, bucket, fullPath);
      allFiles.push(...subFiles);
    }
  }
  return allFiles;
}

async function exportStorage() {
  logSection("Phase 4: Export Storage Files");

  const supabase = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_SERVICE_KEY);

  const { data: buckets, error: bucketsError } =
    await supabase.storage.listBuckets();
  if (bucketsError) {
    log(`Warning: Could not list buckets: ${bucketsError.message}`);
    log("Skipping storage export (may not have any files)");
    writeFileSync(join(BACKUP_DIR, "storage_manifest.json"), "[]");
    return;
  }

  log(`Found ${buckets.length} bucket(s): ${buckets.map((b) => b.name).join(", ") || "(none)"}`);

  const storageManifest = [];

  for (const bucket of buckets) {
    const bucketDir = join(BACKUP_DIR, "storage", bucket.name);
    mkdirSync(bucketDir, { recursive: true });

    const files = await listAllStorageFiles(supabase, bucket.name);
    log(`Bucket "${bucket.name}": ${files.length} files`);

    let downloaded = 0;
    let failed = 0;

    for (const filePath of files) {
      try {
        const { data, error } = await supabase.storage
          .from(bucket.name)
          .download(filePath);

        if (error) {
          log(`  SKIP ${filePath}: ${error.message}`);
          failed++;
          continue;
        }

        const localPath = join(bucketDir, filePath);
        mkdirSync(resolve(localPath, ".."), { recursive: true });
        const buffer = Buffer.from(await data.arrayBuffer());
        writeFileSync(localPath, buffer);
        storageManifest.push({ bucket: bucket.name, path: filePath, size: buffer.length });
        downloaded++;

        if (downloaded % 20 === 0) {
          log(`  Progress: ${downloaded}/${files.length} downloaded...`);
        }
      } catch (e) {
        log(`  ERROR ${filePath}: ${e.message}`);
        failed++;
      }
    }

    log(`  Done: ${downloaded} downloaded, ${failed} failed`);
  }

  writeFileSync(
    join(BACKUP_DIR, "storage_manifest.json"),
    JSON.stringify(storageManifest, null, 2)
  );

  const totalSize = storageManifest.reduce((a, f) => a + f.size, 0);
  log(`\nTotal storage: ${storageManifest.length} files, ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
}

async function main() {
  logSection("Supabase Migration - EXPORT");
  log(`Backup directory: ${BACKUP_DIR}`);
  log(`Source: ${OLD_SUPABASE_URL}\n`);

  const client = createPgClient(OLD_DB_URL);

  try {
    log("Connecting to old database...");
    await client.connect();
    log("Connected!\n");

    const schemaMethod = await exportSchema();
    writeFileSync(
      join(BACKUP_DIR, "_schema_method.txt"),
      schemaMethod
    );

    await exportData(client);
    await exportAuth(client);
    await client.end();

    await exportStorage();

    logSection("EXPORT COMPLETE");
    log(`All data saved to: ${BACKUP_DIR}`);
    log("Next step: Create a new Supabase project in Singapore region,");
    log("then run: node scripts/migration/import.mjs");
  } catch (e) {
    console.error("\n[FATAL]", e.message);
    console.error(e.stack);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

main();
