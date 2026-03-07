import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadMigrationEnv() {
  const envPath = resolve(__dirname, ".env.migration");
  const env = {};
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
  } catch {
    console.error(
      "\n[ERROR] Cannot read .env.migration\n" +
        "  Copy .env.migration.example to .env.migration and fill in values.\n"
    );
    process.exit(1);
  }
  return env;
}

export function required(env, key) {
  if (!env[key]) {
    console.error(`[ERROR] Missing required key: ${key} in .env.migration`);
    process.exit(1);
  }
  return env[key];
}

export function log(msg) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] ${msg}`);
}

export function logSection(title) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"=".repeat(60)}\n`);
}

export const BACKUP_DIR = resolve(__dirname, "backup");
export const MIGRATIONS_DIR = resolve(__dirname, "..", "..", "supabase", "migrations");

/**
 * Prevent pg from converting date/timestamp to JS Date objects.
 * JS Date uses local timezone which shifts date columns by -1 day
 * when local TZ is ahead of UTC (e.g. Asia/Bangkok UTC+7).
 *
 * Call this on every pg.Client before querying date columns.
 */
export function fixPgDateParsing(client) {
  // OID 1082 = date, 1114 = timestamp, 1184 = timestamptz
  client.setTypeParser(1082, val => val);
  client.setTypeParser(1114, val => val);
  client.setTypeParser(1184, val => val);
}

/**
 * Create a pg.Client with date parsing already fixed.
 */
export function createPgClient(connectionString) {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  fixPgDateParsing(client);
  return client;
}
