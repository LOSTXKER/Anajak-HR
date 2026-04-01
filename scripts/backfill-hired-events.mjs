import pg from "pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();

  // Insert a "hired" event for every employee that doesn't already have one,
  // using their created_at date as the effective hire date.
  const result = await client.query(`
    INSERT INTO employment_history (employee_id, action, effective_date, reason)
    SELECT e.id, 'hired', e.created_at::date, 'Backfill: initial hire'
    FROM employees e
    WHERE NOT EXISTS (
      SELECT 1 FROM employment_history eh
      WHERE eh.employee_id = e.id AND eh.action = 'hired'
    )
  `);

  console.log(`Inserted ${result.rowCount} "hired" events.`);

  // Verify totals
  const total = await client.query(
    `SELECT count(*) FROM employment_history WHERE action = 'hired'`
  );
  console.log(`Total "hired" events now: ${total.rows[0].count}`);

  const empCount = await client.query(`SELECT count(*) FROM employees`);
  console.log(`Total employees: ${empCount.rows[0].count}`);

  await client.end();
}

run();
