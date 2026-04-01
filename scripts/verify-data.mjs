import pg from "pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();

  const empId = "a88894d7-c65c-420b-8cbe-0afc0d7996c0";

  // 1. Check employee record
  const emp = await client.query(
    `SELECT name, employment_status, deleted_at, resignation_date, last_working_date
     FROM employees WHERE id = $1`,
    [empId]
  );
  console.log("=== Employee Record ===");
  console.log(emp.rows[0]);

  // 2. Check employment history
  const hist = await client.query(
    `SELECT action, effective_date FROM employment_history
     WHERE employee_id = $1 ORDER BY effective_date`,
    [empId]
  );
  console.log("\n=== Employment History ===");
  hist.rows.forEach((r) => console.log(r));

  // 3. Check actual attendance records in March
  const att = await client.query(
    `SELECT work_date::text, status, clock_in_time
     FROM attendance_logs
     WHERE employee_id = $1
     AND work_date >= '2026-03-01' AND work_date <= '2026-03-31'
     ORDER BY work_date`,
    [empId]
  );
  console.log("\n=== March Attendance Records ===");
  att.rows.forEach((r) => console.log(r));

  // 4. Test wasEmployedOnDate logic for key dates
  const events = hist.rows.sort((a, b) =>
    a.effective_date.toISOString().slice(0, 10).localeCompare(b.effective_date.toISOString().slice(0, 10))
  );

  function wasEmployedOnDate(dateStr) {
    let active = true;
    for (const event of events) {
      const effDate = event.effective_date.toISOString().slice(0, 10);
      if (effDate > dateStr) break;
      if (event.action === "resigned" || event.action === "terminated") {
        active = false;
      } else if (event.action === "rehired") {
        active = true;
      }
    }
    return active;
  }

  console.log("\n=== wasEmployedOnDate Test ===");
  const testDates = [
    "2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04",
    "2026-03-05", "2026-03-06", "2026-03-07", "2026-03-08",
    "2026-03-09", "2026-03-10", "2026-03-15", "2026-03-31",
    "2026-04-01"
  ];
  testDates.forEach((d) => {
    console.log(`  ${d}: ${wasEmployedOnDate(d) ? "EMPLOYED" : "NOT EMPLOYED"}`);
  });

  await client.end();
}

run();
