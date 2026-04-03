import pg from "pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();

  const result = await client.query(`
    SELECT 
      e.name,
      e.employment_status,
      e.created_at::date AS account_created,
      array_agg(
        eh.action || ' (' || eh.effective_date::text || ')'
        ORDER BY eh.effective_date
      ) AS history
    FROM employees e
    LEFT JOIN employment_history eh ON eh.employee_id = e.id
    GROUP BY e.id, e.name, e.employment_status, e.created_at
    ORDER BY e.name
  `);

  console.log("=== Employee Employment History ===\n");
  result.rows.forEach((r) => {
    console.log(`${r.name}`);
    console.log(`  Status: ${r.employment_status}`);
    console.log(`  Account Created: ${r.account_created}`);
    console.log(`  History: ${r.history.join(" → ")}`);
    console.log();
  });

  await client.end();
}

run();
