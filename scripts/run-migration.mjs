/**
 * Run a SQL migration file against the database
 * Usage: node scripts/run-migration.mjs <path-to-sql-file>
 */

import pg from "pg";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");

let env = {};
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  }
} catch {
  console.error("Could not read .env.local");
  process.exit(1);
}

const directUrl = env.DIRECT_URL;
if (!directUrl) {
  console.error("Missing DIRECT_URL in .env.local");
  process.exit(1);
}

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error("Usage: node scripts/run-migration.mjs <path-to-sql-file>");
  process.exit(1);
}

const sqlPath = resolve(sqlFile);
const sql = readFileSync(sqlPath, "utf-8");

const client = new pg.Client({ connectionString: directUrl });

async function run() {
  await client.connect();
  try {
    console.log(`Running migration: ${sqlPath}\n`);
    const result = await client.query(sql);
    const results = Array.isArray(result) ? result : [result];
    for (const r of results) {
      if (r.rows?.length > 0) {
        console.log(r.rows.map((row) => Object.values(row).join(" | ")).join("\n"));
      }
    }
    console.log("\nMigration completed successfully.");
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
