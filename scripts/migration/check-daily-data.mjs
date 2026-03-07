/**
 * Compare daily attendance data between old and new projects
 * to find any missing days
 */

import pg from "pg";
import { loadMigrationEnv, required, log, logSection } from "./helpers.mjs";

const env = loadMigrationEnv();
const oldClient = new pg.Client({ connectionString: required(env, "OLD_DB_URL"), ssl: { rejectUnauthorized: false } });
const newClient = new pg.Client({ connectionString: required(env, "NEW_DB_URL"), ssl: { rejectUnauthorized: false } });

await oldClient.connect();
await newClient.connect();

logSection("Compare Daily Attendance Data");

// Get daily counts from OLD
const { rows: oldDaily } = await oldClient.query(`
  SELECT work_date::text as date, COUNT(*)::int as cnt
  FROM attendance_logs
  GROUP BY work_date
  ORDER BY work_date DESC
`);

// Get daily counts from NEW
const { rows: newDaily } = await newClient.query(`
  SELECT work_date::text as date, COUNT(*)::int as cnt
  FROM attendance_logs
  GROUP BY work_date
  ORDER BY work_date DESC
`);

const newMap = Object.fromEntries(newDaily.map(r => [r.date, r.cnt]));

log("\nDate              | Old | New | Status");
log("------------------|-----|-----|-------");
for (const { date, cnt } of oldDaily) {
  const newCnt = newMap[date] || 0;
  const status = cnt === newCnt ? "OK" : `MISSING ${cnt - newCnt}`;
  log(`${date} | ${String(cnt).padStart(3)} | ${String(newCnt).padStart(3)} | ${status}`);
}

logSection("Compare Total Rows Per Table");

const { rows: tables } = await oldClient.query(`
  SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
`);

for (const { tablename } of tables) {
  const { rows: [{ count: o }] } = await oldClient.query(`SELECT COUNT(*)::int as count FROM "public"."${tablename}"`);
  const { rows: [{ count: n }] } = await newClient.query(`SELECT COUNT(*)::int as count FROM "public"."${tablename}"`);
  const mark = o === n ? "OK" : `DIFF (old=${o}, new=${n})`;
  log(`${tablename.padEnd(30)} | ${mark}`);
}

logSection("Check What Attendance App Shows");

// Check if the app might be filtering by some status or joining something
const { rows: newSample } = await newClient.query(`
  SELECT al.work_date, al.employee_id, e.first_name, e.last_name, al.clock_in_time, al.clock_out_time, al.status
  FROM attendance_logs al
  LEFT JOIN employees e ON e.id = al.employee_id
  ORDER BY al.work_date DESC
  LIMIT 20
`);

log("\nLatest 20 attendance records in NEW:");
for (const r of newSample) {
  log(`${r.work_date} | ${r.first_name} ${r.last_name} | in=${r.clock_in_time || '-'} out=${r.clock_out_time || '-'} | ${r.status}`);
}

// Check for any RLS issues
const { rows: rlsCheck } = await newClient.query(`
  SELECT relname, relrowsecurity, relforcerowsecurity
  FROM pg_class
  WHERE relname = 'attendance_logs'
`);
log(`\nRLS on attendance_logs: ${JSON.stringify(rlsCheck[0])}`);

await oldClient.end();
await newClient.end();
