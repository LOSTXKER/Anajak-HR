import pg from "pg";
import { loadMigrationEnv, required, log, logSection } from "./helpers.mjs";

const env = loadMigrationEnv();
const oldClient = new pg.Client({ connectionString: required(env, "OLD_DB_URL"), ssl: { rejectUnauthorized: false } });
const newClient = new pg.Client({ connectionString: required(env, "NEW_DB_URL"), ssl: { rejectUnauthorized: false } });
await oldClient.connect();
await newClient.connect();

logSection("Employees RLS Policies Comparison");

log("OLD project:");
const { rows: oldPol } = await oldClient.query(`
  SELECT policyname, cmd, permissive, roles, qual, with_check
  FROM pg_policies WHERE schemaname = 'public' AND tablename = 'employees'
  ORDER BY policyname
`);
for (const p of oldPol) {
  log(`  [${p.cmd}] ${p.policyname} (${p.roles})`);
  if (p.qual) log(`    USING: ${p.qual.slice(0, 200)}`);
}

log("\nNEW project:");
const { rows: newPol } = await newClient.query(`
  SELECT policyname, cmd, permissive, roles, qual, with_check
  FROM pg_policies WHERE schemaname = 'public' AND tablename = 'employees'
  ORDER BY policyname
`);
for (const p of newPol) {
  log(`  [${p.cmd}] ${p.policyname} (${p.roles})`);
  if (p.qual) log(`    USING: ${p.qual.slice(0, 200)}`);
}

// Also check ALL tables with missing policies
logSection("All Tables: Policy Count Comparison");

const { rows: oldCounts } = await oldClient.query(`
  SELECT tablename, COUNT(*) as count FROM pg_policies
  WHERE schemaname = 'public' GROUP BY tablename ORDER BY tablename
`);
const { rows: newCounts } = await newClient.query(`
  SELECT tablename, COUNT(*) as count FROM pg_policies
  WHERE schemaname = 'public' GROUP BY tablename ORDER BY tablename
`);

const oldMap = new Map(oldCounts.map(r => [r.tablename, parseInt(r.count)]));
const newMap = new Map(newCounts.map(r => [r.tablename, parseInt(r.count)]));

const allTables = new Set([...oldMap.keys(), ...newMap.keys()]);
for (const t of [...allTables].sort()) {
  const o = oldMap.get(t) || 0;
  const n = newMap.get(t) || 0;
  const status = o === n ? "OK" : "DIFF";
  if (o !== n) log(`  ${status}: ${t.padEnd(30)} old=${o}\tnew=${n}`);
}

await oldClient.end();
await newClient.end();
