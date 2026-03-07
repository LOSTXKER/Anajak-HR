import pg from "pg";
import { loadMigrationEnv, required } from "./helpers.mjs";

const env = loadMigrationEnv();
const client = new pg.Client({
  connectionString: required(env, "NEW_DB_URL"),
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const { rows: [{ count }] } = await client.query("SELECT COUNT(*) as count FROM attendance_logs");
console.log("Total attendance_logs:", count);

const { rows: [range] } = await client.query("SELECT MIN(work_date) as min_date, MAX(work_date) as max_date FROM attendance_logs");
console.log("Date range:", range.min_date, "to", range.max_date);

const { rows: monthly } = await client.query(`
  SELECT TO_CHAR(work_date, 'YYYY-MM') as month, COUNT(*) as count
  FROM attendance_logs GROUP BY 1 ORDER BY 1
`);
console.log("\nRecords per month:");
for (const m of monthly) console.log("  " + m.month + ": " + m.count + " records");

const { rows: todayRec } = await client.query("SELECT COUNT(*) as count FROM attendance_logs WHERE work_date = CURRENT_DATE");
console.log("\nToday (CURRENT_DATE) records:", todayRec[0].count);

const { rows: recent } = await client.query(`
  SELECT work_date, COUNT(*) as count FROM attendance_logs
  WHERE work_date >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY 1 ORDER BY 1
`);
console.log("\nLast 7 days:");
for (const r of recent) console.log("  " + r.work_date.toISOString().slice(0, 10) + ": " + r.count + " records");

const { rows: rls } = await client.query(`
  SELECT tablename, rowsecurity FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'attendance_logs'
`);
console.log("\nRLS enabled:", rls[0]?.rowsecurity);

const { rows: policies } = await client.query(`
  SELECT policyname, cmd FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'attendance_logs'
`);
console.log("Policies:", policies.length);
for (const p of policies) console.log("  " + p.policyname + " (" + p.cmd + ")");

await client.end();
