/**
 * Export storage files via database query + public URL download
 * Fallback when service_role key is not available
 */

import pg from "pg";
import { mkdirSync, writeFileSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadMigrationEnv, required, log, logSection, BACKUP_DIR } from "./helpers.mjs";

const env = loadMigrationEnv();
const OLD_DB_URL = required(env, "OLD_DB_URL");
const OLD_SUPABASE_URL = required(env, "OLD_SUPABASE_URL");

const STORAGE_DIR = join(BACKUP_DIR, "storage", "attendance-photos");
mkdirSync(STORAGE_DIR, { recursive: true });

const CONCURRENCY = 10;

async function downloadFile(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  logSection("Export Storage Files (Direct Download)");

  const client = new pg.Client({
    connectionString: OLD_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  log("Connected to database");

  const { rows: files } = await client.query(
    "SELECT name, bucket_id FROM storage.objects WHERE bucket_id = 'attendance-photos' ORDER BY name"
  );
  await client.end();

  log(`Found ${files.length} files to download`);

  let downloaded = 0;
  let failed = 0;
  const manifest = [];

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);

    const results = await Promise.allSettled(
      batch.map(async (file) => {
        const publicUrl = `${OLD_SUPABASE_URL}/storage/v1/object/public/attendance-photos/${encodeURIComponent(file.name).replace(/%2F/g, "/")}`;
        const buffer = await downloadFile(publicUrl);
        const localPath = join(STORAGE_DIR, file.name);
        mkdirSync(resolve(localPath, ".."), { recursive: true });
        writeFileSync(localPath, buffer);
        return { name: file.name, size: buffer.length };
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        manifest.push(result.value);
        downloaded++;
      } else {
        failed++;
        if (failed <= 5) log(`  FAIL: ${result.reason.message}`);
      }
    }

    if ((i + CONCURRENCY) % 50 === 0 || i + CONCURRENCY >= files.length) {
      log(`  Progress: ${downloaded}/${files.length} downloaded (${failed} failed)`);
    }
  }

  const totalSize = manifest.reduce((a, f) => a + f.size, 0);
  writeFileSync(
    join(BACKUP_DIR, "storage_manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  logSection("Storage Export Complete");
  log(`Downloaded: ${downloaded} files`);
  log(`Failed: ${failed} files`);
  log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
}

main().catch((e) => {
  console.error("[FATAL]", e.message);
  process.exit(1);
});
