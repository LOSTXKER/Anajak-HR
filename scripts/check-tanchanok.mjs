import pg from "pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();

  // Find Tanchanok
  const emp = await client.query(
    `SELECT id, name, employment_status, deleted_at, resignation_date, last_working_date
     FROM employees WHERE name ILIKE '%tanchanok%'`
  );
  console.log("=== Employee ===");
  console.log(emp.rows[0]);

  const empId = emp.rows[0].id;

  // All history entries
  const history = await client.query(
    `SELECT id, action, effective_date, reason, created_at
     FROM employment_history
     WHERE employee_id = $1
     ORDER BY created_at`,
    [empId]
  );
  console.log("\n=== All History Entries ===");
  history.rows.forEach((r, i) => {
    console.log(`${i + 1}. ${r.action} | effective: ${r.effective_date.toISOString().slice(0, 10)} | reason: ${r.reason} | created: ${r.created_at.toISOString()}`);
    console.log(`   id: ${r.id}`);
  });

  await client.end();
}

run();
