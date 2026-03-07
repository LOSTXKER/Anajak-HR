import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { loadMigrationEnv, required, log, logSection } from "./helpers.mjs";

const env = loadMigrationEnv();
const NEW_DB_URL = required(env, "NEW_DB_URL");
const NEW_SUPABASE_URL = required(env, "NEW_SUPABASE_URL");
const NEW_ANON_KEY = required(env, "NEW_SUPABASE_ANON_KEY");
const NEW_SERVICE_KEY = required(env, "NEW_SUPABASE_SERVICE_KEY");

const client = new pg.Client({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

// 1. Check all functions referenced in policies
logSection("1. Check Functions Used in Policies");

const { rows: policies } = await client.query(`
  SELECT tablename, policyname, qual, with_check
  FROM pg_policies WHERE schemaname = 'public'
`);

const funcRefs = new Set();
for (const p of policies) {
  const text = (p.qual || "") + " " + (p.with_check || "");
  const matches = text.match(/(\w+)\s*\(/g);
  if (matches) {
    for (const m of matches) {
      const name = m.replace(/\s*\($/, "");
      if (!["ANY", "ARRAY", "EXISTS", "COALESCE", "NOT"].includes(name.toUpperCase())) {
        funcRefs.add(name);
      }
    }
  }
}

log("Functions referenced in policies:");
for (const f of funcRefs) {
  const { rows } = await client.query(`
    SELECT routine_name, routine_schema FROM information_schema.routines
    WHERE routine_name = $1
  `, [f]);
  const status = rows.length > 0 ? `EXISTS (${rows[0].routine_schema})` : "MISSING!";
  log(`  ${f}: ${status}`);
}

// 2. Check attendance_logs policies in detail
logSection("2. Attendance Logs Policies Detail");

const { rows: attPolicies } = await client.query(`
  SELECT policyname, cmd, permissive, roles, qual, with_check
  FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attendance_logs'
  ORDER BY policyname
`);

for (const p of attPolicies) {
  log(`  [${p.cmd}] ${p.policyname}`);
  log(`    Roles: ${p.roles}, Permissive: ${p.permissive}`);
  if (p.qual) log(`    USING: ${p.qual.slice(0, 150)}`);
  if (p.with_check) log(`    WITH CHECK: ${p.with_check.slice(0, 150)}`);
  log("");
}

// 3. Test query via Supabase client (as an admin user)
logSection("3. Test Query via Supabase Client");

// Find an admin user
const { rows: admins } = await client.query(`
  SELECT id, email, role FROM employees WHERE role = 'admin' LIMIT 1
`);
if (admins.length > 0) {
  log(`Admin user: ${admins[0].email} (${admins[0].id})`);
}

// Check total attendance via admin connection (bypasses RLS)
const { rows: [{ count: totalAdmin }] } = await client.query(
  "SELECT COUNT(*) as count FROM attendance_logs"
);
log(`Total attendance (admin/no RLS): ${totalAdmin}`);

// Check date range with actual data
const { rows: dates } = await client.query(`
  SELECT work_date, COUNT(*) as count FROM attendance_logs
  GROUP BY work_date ORDER BY work_date DESC LIMIT 10
`);
log("\nRecent dates with data:");
for (const d of dates) {
  const dateStr = d.work_date instanceof Date ? d.work_date.toISOString().slice(0, 10) : d.work_date;
  log(`  ${dateStr}: ${d.count} records`);
}

// 4. Test via Supabase REST API (this goes through RLS)
logSection("4. Test via Supabase REST API (with RLS)");

const supabase = createClient(NEW_SUPABASE_URL, NEW_SERVICE_KEY);

const { data: svcData, error: svcErr } = await supabase
  .from("attendance_logs")
  .select("id, employee_id, work_date")
  .order("work_date", { ascending: false })
  .limit(5);

if (svcErr) {
  log(`Service key query error: ${svcErr.message}`);
} else {
  log(`Service key query: ${svcData.length} rows returned`);
  for (const r of svcData) log(`  ${r.work_date} - ${r.employee_id}`);
}

// Test with anon key (simulates client-side, no user session)
const anonSupabase = createClient(NEW_SUPABASE_URL, NEW_ANON_KEY);
const { data: anonData, error: anonErr } = await anonSupabase
  .from("attendance_logs")
  .select("id", { count: "exact", head: true });

if (anonErr) {
  log(`\nAnon key query error: ${anonErr.message}`);
} else {
  log(`\nAnon key query (no user session): returned`);
}

await client.end();
logSection("DEBUG COMPLETE");
