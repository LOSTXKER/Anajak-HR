/**
 * One-time script: update the oldest salary_history entry for each employee
 * so its effective_date matches the employee's actual hire date.
 *
 * Priority for hire date:
 *   1. First "hired" event in employment_history
 *   2. employees.hire_date
 *   3. employees.created_at
 *
 * Usage: node scripts/backfill-salary-dates.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  // 1. Fetch all employees
  const { data: employees, error: empErr } = await supabase
    .from("employees")
    .select("id, name, created_at")
    .eq("account_status", "approved")
    .neq("role", "admin");

  if (empErr) throw empErr;
  console.log(`Found ${employees.length} employees`);

  // 2. Fetch all "hired" events
  const { data: hiredEvents } = await supabase
    .from("employment_history")
    .select("employee_id, effective_date")
    .eq("action", "hired")
    .order("effective_date", { ascending: true });

  const firstHiredMap = {};
  for (const ev of hiredEvents || []) {
    if (!firstHiredMap[ev.employee_id]) {
      firstHiredMap[ev.employee_id] = ev.effective_date.slice(0, 10);
    }
  }

  // 3. Fetch all salary_history, ordered oldest first
  const { data: allHistory } = await supabase
    .from("salary_history")
    .select("id, employee_id, effective_date")
    .order("effective_date", { ascending: true });

  // Group by employee: find the oldest entry per employee
  const oldestEntry = {};
  for (const row of allHistory || []) {
    if (!oldestEntry[row.employee_id]) {
      oldestEntry[row.employee_id] = row;
    }
  }

  // 4. Update each employee's oldest salary_history entry
  let updated = 0;
  let skipped = 0;
  for (const emp of employees) {
    const entry = oldestEntry[emp.id];
    if (!entry) {
      console.log(`  SKIP ${emp.name}: no salary_history`);
      skipped++;
      continue;
    }

    const hireDate =
      firstHiredMap[emp.id] ||
      emp.created_at.slice(0, 10);

    const currentDate = entry.effective_date.slice(0, 10);
    if (currentDate === hireDate) {
      console.log(`  OK   ${emp.name}: already ${hireDate}`);
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from("salary_history")
      .update({ effective_date: hireDate })
      .eq("id", entry.id);

    if (error) {
      console.error(`  ERR  ${emp.name}: ${error.message}`);
    } else {
      console.log(`  UPD  ${emp.name}: ${currentDate} -> ${hireDate}`);
      updated++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
}

run().catch(console.error);
