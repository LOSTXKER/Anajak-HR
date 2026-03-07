import pg from "pg";
import { loadMigrationEnv, required, log, logSection } from "./helpers.mjs";

const env = loadMigrationEnv();
const oldClient = new pg.Client({ connectionString: required(env, "OLD_DB_URL"), ssl: { rejectUnauthorized: false } });
const newClient = new pg.Client({ connectionString: required(env, "NEW_DB_URL"), ssl: { rejectUnauthorized: false } });

await oldClient.connect();
await newClient.connect();

logSection("Compare RLS Policies: Old vs New");

const { rows: oldPolicies } = await oldClient.query(`
  SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
  FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname
`);

const { rows: newPolicies } = await newClient.query(`
  SELECT schemaname, tablename, policyname
  FROM pg_policies WHERE schemaname = 'public'
`);

const newPolicySet = new Set(newPolicies.map(p => `${p.tablename}::${p.policyname}`));

const missing = oldPolicies.filter(p => !newPolicySet.has(`${p.tablename}::${p.policyname}`));

log(`Old project: ${oldPolicies.length} policies`);
log(`New project: ${newPolicies.length} policies`);
log(`Missing: ${missing.length} policies\n`);

for (const p of missing) {
  log(`  MISSING: ${p.tablename} -> ${p.policyname} (${p.cmd})`);
}

logSection("Adding Missing Policies");

for (const p of missing) {
  const permissive = p.permissive === "PERMISSIVE" ? "PERMISSIVE" : "RESTRICTIVE";
  const roles = Array.isArray(p.roles) ? p.roles.join(", ") : String(p.roles).replace(/[{}]/g, "");
  const cmd = p.cmd === "ALL" ? "ALL" : p.cmd;

  let sql = `CREATE POLICY "${p.policyname}" ON "public"."${p.tablename}" AS ${permissive} FOR ${cmd} TO ${roles}`;

  if (p.qual) {
    sql += ` USING (${p.qual})`;
  }
  if (p.with_check) {
    sql += ` WITH CHECK (${p.with_check})`;
  }

  try {
    await newClient.query(sql);
    log(`  ADDED: ${p.tablename} -> ${p.policyname}`);
  } catch (e) {
    log(`  FAIL: ${p.tablename} -> ${p.policyname}: ${e.message.slice(0, 100)}`);
  }
}

await oldClient.end();
await newClient.end();

logSection("RLS FIX COMPLETE");
