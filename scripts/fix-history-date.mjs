import pg from "pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();

  const empId = "a88894d7-c65c-420b-8cbe-0afc0d7996c0";

  // Set effective_date to March 8 (day AFTER last working day March 7)
  // so wasEmployedOnDate returns true for March 7 and false for March 8+
  const r1 = await client.query(
    `UPDATE employment_history
     SET effective_date = '2026-03-08'
     WHERE employee_id = $1 AND action = 'resigned'`,
    [empId]
  );
  console.log("Updated resignation effective_date to 2026-03-08:", r1.rowCount, "rows");

  // Also update the employee record
  const r2 = await client.query(
    `UPDATE employees
     SET last_working_date = '2026-03-07',
         resignation_date = '2026-03-01'
     WHERE id = $1`,
    [empId]
  );
  console.log("Updated employee record:", r2.rowCount, "rows");

  // Verify
  const history = await client.query(
    `SELECT action, effective_date, reason FROM employment_history
     WHERE employee_id = $1 ORDER BY effective_date`,
    [empId]
  );
  console.log("Final history:", history.rows);

  await client.end();
}

run();
