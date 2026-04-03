import pg from "pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();

  const empId = "7e75dea7-7672-4aa8-878a-8777bd916841";

  // 1. Delete all history except the "hired" backfill
  const del = await client.query(
    `DELETE FROM employment_history
     WHERE employee_id = $1 AND action != 'hired'`,
    [empId]
  );
  console.log(`Deleted ${del.rowCount} duplicate/test entries`);

  // 2. Insert a single correct "resigned" event
  // Last working day was 31/3, so effective_date = 2026-04-01 (first day NOT employed)
  await client.query(
    `INSERT INTO employment_history (employee_id, action, effective_date, reason)
     VALUES ($1, 'resigned', '2026-04-01', 'ลาออก')`,
    [empId]
  );
  console.log("Inserted correct resigned event (effective 2026-04-01)");

  // 3. Fix employee record
  await client.query(
    `UPDATE employees
     SET employment_status = 'resigned',
         resignation_date = '2026-03-31',
         last_working_date = '2026-03-31'
     WHERE id = $1`,
    [empId]
  );
  console.log("Updated employee record");

  // 4. Verify
  const history = await client.query(
    `SELECT action, effective_date::text, reason
     FROM employment_history
     WHERE employee_id = $1
     ORDER BY effective_date`,
    [empId]
  );
  console.log("\n=== Final History ===");
  history.rows.forEach((r) => console.log(`  ${r.action} | ${r.effective_date} | ${r.reason}`));

  await client.end();
}

run();
