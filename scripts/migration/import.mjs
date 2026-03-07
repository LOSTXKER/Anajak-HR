/**
 * Supabase Migration - Import Script
 *
 * Imports into the NEW Supabase project (Singapore):
 *   1. Database schema (pg_dump SQL or migration files)
 *   2. Auth users + identities (before data, due to FK)
 *   3. All public table data
 *   4. Fix sequences
 *   5. Update photo URLs to new project
 *   6. Storage bucket + policies + files
 *
 * Usage: node scripts/migration/import.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { execSync } from "child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  mkdirSync,
} from "fs";
import { resolve, join, relative, extname } from "path";
import {
  loadMigrationEnv,
  required,
  log,
  logSection,
  BACKUP_DIR,
  createPgClient,
} from "./helpers.mjs";

const env = loadMigrationEnv();
const NEW_DB_URL = required(env, "NEW_DB_URL");
const NEW_SUPABASE_URL = required(env, "NEW_SUPABASE_URL");
const NEW_SUPABASE_SERVICE_KEY = required(env, "NEW_SUPABASE_SERVICE_KEY");
const OLD_SUPABASE_URL = required(env, "OLD_SUPABASE_URL");

if (!existsSync(BACKUP_DIR)) {
  console.error("[ERROR] Backup directory not found. Run export.mjs first.");
  process.exit(1);
}

const SETUP_STORAGE_SQL = resolve(
  BACKUP_DIR,
  "..",
  "..",
  "..",
  "supabase",
  "setup-storage.sql"
);

async function importSchema(client) {
  logSection("Phase 1: Import Database Schema");

  const methodFile = join(BACKUP_DIR, "_schema_method.txt");
  const method = existsSync(methodFile)
    ? readFileSync(methodFile, "utf-8").trim()
    : "migrations";

  if (method === "pg_dump") {
    const schemaFile = join(BACKUP_DIR, "schema.sql");
    if (!existsSync(schemaFile)) {
      log("schema.sql not found, falling back to migrations");
      await importSchemaFromMigrations(client);
      return;
    }

    let psqlAvailable = false;
    try {
      execSync("psql --version", { stdio: "pipe" });
      psqlAvailable = true;
    } catch {
      /* psql not found */
    }

    if (psqlAvailable) {
      log("Importing schema via psql...");
      try {
        execSync(`psql -d "${NEW_DB_URL}" -f "${schemaFile}"`, {
          encoding: "utf-8",
          maxBuffer: 50 * 1024 * 1024,
          stdio: ["pipe", "pipe", "pipe"],
        });
        log("Schema imported successfully via psql");
        return;
      } catch (e) {
        log(`psql failed (${e.message}), falling back to pg client...`);
      }
    }

    log("Importing schema via pg client...");
    const sql = readFileSync(schemaFile, "utf-8");
    try {
      await client.query(sql);
      log("Schema imported successfully");
    } catch (e) {
      log(`Warning: Some schema statements may have errored: ${e.message}`);
      log("Trying statement-by-statement...");
      await runStatementsOneByOne(client, sql);
    }
  } else {
    await importSchemaFromMigrations(client);
  }
}

async function importSchemaFromMigrations(client) {
  const migrationsDir = join(BACKUP_DIR, "migrations");
  if (!existsSync(migrationsDir)) {
    const repoMigrations = resolve(
      BACKUP_DIR,
      "..",
      "..",
      "..",
      "supabase",
      "migrations"
    );
    if (!existsSync(repoMigrations)) {
      console.error("[ERROR] No migrations found in backup or repo");
      process.exit(1);
    }
    log("Using migration files from repository...");
    await runMigrationsFromDir(client, repoMigrations);
    return;
  }

  log("Using migration files from backup...");
  await runMigrationsFromDir(client, migrationsDir);
}

async function runMigrationsFromDir(client, dir) {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  log(`Found ${files.length} migration files`);
  let success = 0;
  let skipped = 0;

  for (const file of files) {
    const sql = readFileSync(join(dir, file), "utf-8");
    try {
      await client.query(sql);
      log(`  OK: ${file}`);
      success++;
    } catch (e) {
      const msg = e.message || "";
      const isHarmless =
        msg.includes("already exists") ||
        msg.includes("does not exist") ||
        msg.includes("duplicate key");
      if (isHarmless) {
        log(`  SKIP: ${file} (${msg.slice(0, 80)})`);
        skipped++;
      } else {
        log(`  WARN: ${file} - ${msg.slice(0, 120)}`);
        skipped++;
      }
    }
  }
  log(`\nMigrations: ${success} applied, ${skipped} skipped/warned`);
}

async function runStatementsOneByOne(client, sql) {
  const statements = sql
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  let ok = 0;
  let fail = 0;
  for (const stmt of statements) {
    try {
      await client.query(stmt);
      ok++;
    } catch {
      fail++;
    }
  }
  log(`  Statements: ${ok} succeeded, ${fail} failed`);
}

async function importAuth(client) {
  logSection("Phase 2: Import Auth Users + Identities");

  const usersFile = join(BACKUP_DIR, "auth_users.json");
  const identitiesFile = join(BACKUP_DIR, "auth_identities.json");

  if (!existsSync(usersFile)) {
    log("No auth_users.json found, skipping auth import");
    return;
  }

  const users = JSON.parse(readFileSync(usersFile, "utf-8"));
  log(`Importing ${users.length} auth users...`);

  let imported = 0;
  let skipped = 0;

  for (const user of users) {
    const columns = Object.keys(user).filter(
      (c) => user[c] !== undefined
    );
    const values = columns.map((c) => user[c]);
    const placeholders = columns.map((_, i) => `$${i + 1}`);

    try {
      await client.query(
        `INSERT INTO auth.users (${columns.map((c) => `"${c}"`).join(", ")})
         VALUES (${placeholders.join(", ")})
         ON CONFLICT (id) DO NOTHING`,
        values
      );
      imported++;
    } catch (e) {
      log(`  WARN user ${user.email}: ${e.message.slice(0, 80)}`);
      skipped++;
    }
  }
  log(`Auth users: ${imported} imported, ${skipped} skipped`);

  if (existsSync(identitiesFile)) {
    const identities = JSON.parse(readFileSync(identitiesFile, "utf-8"));
    log(`Importing ${identities.length} auth identities...`);

    let idImported = 0;
    let idSkipped = 0;

    for (const identity of identities) {
      const columns = Object.keys(identity).filter(
        (c) => identity[c] !== undefined
      );
      const values = columns.map((c) => identity[c]);
      const placeholders = columns.map((_, i) => `$${i + 1}`);

      try {
        await client.query(
          `INSERT INTO auth.identities (${columns.map((c) => `"${c}"`).join(", ")})
           VALUES (${placeholders.join(", ")})
           ON CONFLICT (id) DO NOTHING`,
          values
        );
        idImported++;
      } catch (e) {
        log(`  WARN identity: ${e.message.slice(0, 80)}`);
        idSkipped++;
      }
    }
    log(`Auth identities: ${idImported} imported, ${idSkipped} skipped`);
  }
}

async function importData(client) {
  logSection("Phase 3: Import Table Data");

  const dataDir = join(BACKUP_DIR, "data");
  if (!existsSync(dataDir)) {
    log("No data directory found, skipping data import");
    return;
  }

  const manifestFile = join(dataDir, "_manifest.json");
  const files = readdirSync(dataDir)
    .filter((f) => f.endsWith(".json") && f !== "_manifest.json")
    .sort();

  log(`Found ${files.length} table data files`);

  log("Disabling FK constraints...");
  await client.query("SET session_replication_role = 'replica'");

  let totalRows = 0;

  for (const file of files) {
    const tableName = file.replace(".json", "");
    const rows = JSON.parse(readFileSync(join(dataDir, file), "utf-8"));

    if (rows.length === 0) {
      log(`  ${tableName}: 0 rows (skip)`);
      continue;
    }

    try {
      await client.query(`DELETE FROM "public"."${tableName}"`);
    } catch {
      // Table might not exist if schema import had issues
    }

    const columns = Object.keys(rows[0]);
    let inserted = 0;
    let errors = 0;

    const BATCH_SIZE = 50;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      for (const row of batch) {
        const values = columns.map((c) => row[c]);
        const placeholders = columns.map((_, idx) => `$${idx + 1}`);

        try {
          await client.query(
            `INSERT INTO "public"."${tableName}" (${columns.map((c) => `"${c}"`).join(", ")})
             VALUES (${placeholders.join(", ")})
             ON CONFLICT DO NOTHING`,
            values
          );
          inserted++;
        } catch (e) {
          if (errors === 0) {
            log(`  ${tableName} first error: ${e.message.slice(0, 100)}`);
          }
          errors++;
        }
      }

      if (i > 0 && i % 500 === 0) {
        log(`  ${tableName}: ${inserted}/${rows.length} inserted...`);
      }
    }

    totalRows += inserted;
    const status = errors > 0 ? ` (${errors} errors)` : "";
    log(`  ${tableName}: ${inserted}/${rows.length} rows${status}`);
  }

  log("\nRe-enabling FK constraints...");
  await client.query("SET session_replication_role = 'origin'");

  log(`\nTotal: ${totalRows} rows imported`);
}

async function fixSequences(client) {
  logSection("Phase 4: Fix Sequences");

  const { rows: sequences } = await client.query(`
    SELECT
      s.relname AS seq_name,
      t.relname AS table_name,
      a.attname AS column_name
    FROM pg_class s
    JOIN pg_depend d ON d.objid = s.oid
    JOIN pg_class t ON d.refobjid = t.oid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
    WHERE s.relkind = 'S'
      AND s.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  `);

  if (sequences.length === 0) {
    log("No sequences found (UUIDs used for primary keys)");
    return;
  }

  for (const { seq_name, table_name, column_name } of sequences) {
    try {
      await client.query(`
        SELECT setval('"${seq_name}"',
          COALESCE((SELECT MAX("${column_name}") FROM "${table_name}"), 1)
        )
      `);
      log(`  Reset: ${seq_name}`);
    } catch (e) {
      log(`  WARN ${seq_name}: ${e.message.slice(0, 80)}`);
    }
  }
}

async function updatePhotoUrls(client) {
  logSection("Phase 5: Update Photo URLs");

  if (OLD_SUPABASE_URL === NEW_SUPABASE_URL) {
    log("URLs are the same, skipping");
    return;
  }

  const urlColumns = [
    { table: "attendance_logs", columns: ["clock_in_photo_url", "clock_out_photo_url"] },
    { table: "ot_requests", columns: ["before_photo_url", "after_photo_url"] },
    { table: "employees", columns: ["face_profile_image_url"] },
  ];

  let totalUpdated = 0;

  for (const { table, columns } of urlColumns) {
    for (const col of columns) {
      try {
        const { rowCount } = await client.query(
          `UPDATE "public"."${table}"
           SET "${col}" = REPLACE("${col}", $1, $2)
           WHERE "${col}" IS NOT NULL AND "${col}" LIKE $3`,
          [OLD_SUPABASE_URL, NEW_SUPABASE_URL, `${OLD_SUPABASE_URL}%`]
        );
        if (rowCount > 0) {
          log(`  ${table}.${col}: ${rowCount} URLs updated`);
          totalUpdated += rowCount;
        }
      } catch (e) {
        log(`  WARN ${table}.${col}: ${e.message.slice(0, 80)}`);
      }
    }
  }

  // Generic sweep: find any remaining references in all text columns
  const { rows: textCols } = await client.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type IN ('text', 'character varying')
      AND table_name NOT IN ('attendance_logs', 'ot_requests', 'employees')
  `);

  for (const { table_name, column_name } of textCols) {
    try {
      const { rowCount } = await client.query(
        `UPDATE "public"."${table_name}"
         SET "${column_name}" = REPLACE("${column_name}", $1, $2)
         WHERE "${column_name}" LIKE $3`,
        [OLD_SUPABASE_URL, NEW_SUPABASE_URL, `${OLD_SUPABASE_URL}%`]
      );
      if (rowCount > 0) {
        log(`  ${table_name}.${column_name}: ${rowCount} URLs updated`);
        totalUpdated += rowCount;
      }
    } catch {
      // Ignore errors for non-existent tables/columns
    }
  }

  log(`\nTotal: ${totalUpdated} URLs updated from old to new project`);
}

async function importStorage(client) {
  logSection("Phase 6: Import Storage");

  // Create bucket via SQL
  log("Creating attendance-photos bucket...");
  const setupSql = existsSync(SETUP_STORAGE_SQL)
    ? readFileSync(SETUP_STORAGE_SQL, "utf-8")
    : `
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES (
        'attendance-photos', 'attendance-photos', true, 5242880,
        ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      ) ON CONFLICT (id) DO UPDATE SET
        public = true, file_size_limit = 5242880,
        allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

      DROP POLICY IF EXISTS "Authenticated users can upload attendance photos" ON storage.objects;
      CREATE POLICY "Authenticated users can upload attendance photos"
        ON storage.objects FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'attendance-photos');

      DROP POLICY IF EXISTS "Authenticated users can read attendance photos" ON storage.objects;
      CREATE POLICY "Authenticated users can read attendance photos"
        ON storage.objects FOR SELECT TO authenticated
        USING (bucket_id = 'attendance-photos');

      DROP POLICY IF EXISTS "Public can read attendance photos" ON storage.objects;
      CREATE POLICY "Public can read attendance photos"
        ON storage.objects FOR SELECT TO public
        USING (bucket_id = 'attendance-photos');

      DROP POLICY IF EXISTS "Users can delete their own attendance photos" ON storage.objects;
      CREATE POLICY "Users can delete their own attendance photos"
        ON storage.objects FOR DELETE TO authenticated
        USING (bucket_id = 'attendance-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
    `;

  try {
    await client.query(setupSql);
    log("Bucket and policies created");
  } catch (e) {
    log(`Warning: Bucket setup partially failed: ${e.message.slice(0, 100)}`);
  }

  // Upload files
  const storageDir = join(BACKUP_DIR, "storage");
  if (!existsSync(storageDir)) {
    log("No storage backup found, skipping file upload");
    return;
  }

  const supabase = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_KEY);

  const bucketDirs = readdirSync(storageDir).filter((d) =>
    statSync(join(storageDir, d)).isDirectory()
  );

  for (const bucketName of bucketDirs) {
    const bucketDir = join(storageDir, bucketName);
    const allFiles = getAllFiles(bucketDir);

    log(`Uploading ${allFiles.length} files to bucket "${bucketName}"...`);
    let uploaded = 0;
    let failed = 0;

    for (const filePath of allFiles) {
      const relativePath = relative(bucketDir, filePath).replace(/\\/g, "/");
      const fileBuffer = readFileSync(filePath);
      const contentType = getMimeType(filePath);

      try {
        const { error } = await supabase.storage
          .from(bucketName)
          .upload(relativePath, fileBuffer, { contentType, upsert: true });

        if (error) {
          if (failed < 3) log(`  FAIL ${relativePath}: ${error.message}`);
          failed++;
        } else {
          uploaded++;
        }

        if (uploaded % 20 === 0 && uploaded > 0) {
          log(`  Progress: ${uploaded}/${allFiles.length} uploaded...`);
        }
      } catch (e) {
        if (failed < 3) log(`  ERROR ${relativePath}: ${e.message}`);
        failed++;
      }
    }

    log(`  Done: ${uploaded} uploaded, ${failed} failed`);
  }
}

function getAllFiles(dir) {
  const files = [];
  for (const item of readdirSync(dir)) {
    const fullPath = join(dir, item);
    if (statSync(fullPath).isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function getMimeType(filePath) {
  const ext = extname(filePath).toLowerCase();
  const map = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
  };
  return map[ext] || "application/octet-stream";
}

async function main() {
  logSection("Supabase Migration - IMPORT");
  log(`Backup directory: ${BACKUP_DIR}`);
  log(`Destination: ${NEW_SUPABASE_URL}\n`);

  const client = createPgClient(NEW_DB_URL);

  try {
    log("Connecting to new database...");
    await client.connect();
    log("Connected!\n");

    await importSchema(client);
    await importAuth(client);
    await importData(client);
    await fixSequences(client);
    await updatePhotoUrls(client);
    await importStorage(client);

    await client.end();

    logSection("IMPORT COMPLETE");
    log("All data imported to the new project.");
    log("Next steps:");
    log("  1. Update .env.local with new credentials");
    log("  2. Run: node scripts/migration/verify.mjs");
    log("  3. Test login, check data, verify photos");
  } catch (e) {
    console.error("\n[FATAL]", e.message);
    console.error(e.stack);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

main();
