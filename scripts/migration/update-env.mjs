/**
 * Supabase Migration - Update .env.local
 *
 * Updates (or creates) .env.local with new Supabase credentials
 * from .env.migration configuration.
 *
 * Usage: node scripts/migration/update-env.mjs
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadMigrationEnv, required, log, logSection } from "./helpers.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..", "..");
const ENV_LOCAL_PATH = resolve(PROJECT_ROOT, ".env.local");

const env = loadMigrationEnv();
const NEW_SUPABASE_URL = required(env, "NEW_SUPABASE_URL");
const NEW_SUPABASE_ANON_KEY = required(env, "NEW_SUPABASE_ANON_KEY");
const NEW_SUPABASE_SERVICE_KEY = required(env, "NEW_SUPABASE_SERVICE_KEY");
const NEW_DB_URL = required(env, "NEW_DB_URL");

logSection("Update .env.local");

const newVars = {
  NEXT_PUBLIC_SUPABASE_URL: NEW_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: NEW_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: NEW_SUPABASE_SERVICE_KEY,
  DIRECT_URL: NEW_DB_URL,
};

let content = "";

if (existsSync(ENV_LOCAL_PATH)) {
  log(`Updating existing ${ENV_LOCAL_PATH}`);
  content = readFileSync(ENV_LOCAL_PATH, "utf-8");

  for (const [key, value] of Object.entries(newVars)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
      log(`  Updated: ${key}`);
    } else {
      content += `\n${key}=${value}`;
      log(`  Added: ${key}`);
    }
  }
} else {
  log(`Creating new ${ENV_LOCAL_PATH}`);
  const lines = [
    "# Supabase Configuration (Singapore Region)",
    `NEXT_PUBLIC_SUPABASE_URL=${NEW_SUPABASE_URL}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEW_SUPABASE_ANON_KEY}`,
    `SUPABASE_SERVICE_ROLE_KEY=${NEW_SUPABASE_SERVICE_KEY}`,
    "",
    "# Database Direct URL",
    `DIRECT_URL=${NEW_DB_URL}`,
    "",
  ];
  content = lines.join("\n");

  for (const key of Object.keys(newVars)) {
    log(`  Set: ${key}`);
  }
}

writeFileSync(ENV_LOCAL_PATH, content);
log(`\n.env.local saved to: ${ENV_LOCAL_PATH}`);
log("\nRemember to also update environment variables in:");
log("  - Vercel (if deployed there)");
log("  - Any other hosting platform");
log("  - CI/CD pipeline");
