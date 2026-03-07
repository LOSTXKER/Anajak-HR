import { createClient } from "@supabase/supabase-js";
import { loadMigrationEnv, required, log, logSection } from "./helpers.mjs";

const env = loadMigrationEnv();
const url = required(env, "NEW_SUPABASE_URL");
const anonKey = required(env, "NEW_SUPABASE_ANON_KEY");
const serviceKey = required(env, "NEW_SUPABASE_SERVICE_KEY");

logSection("Test: Service Key (bypasses RLS)");

const admin = createClient(url, serviceKey);
for (const date of ["2026-03-06", "2026-03-05", "2026-03-04", "2026-03-03"]) {
  const { data, error } = await admin
    .from("attendance_logs")
    .select("id, employee_id, work_date, clock_in_time")
    .eq("work_date", date);
  log(`${date}: ${error ? "ERROR: " + error.message : data.length + " records"}`);
}

logSection("Test: Anon Key + Login as Admin");

const anon = createClient(url, anonKey);
const { data: authData, error: authErr } = await anon.auth.signInWithPassword({
  email: "saruth05@hotmail.com",
  password: "Bestlostxker007"
});

if (authErr) {
  log("Login FAILED: " + authErr.message);
  log("\nThis means users CANNOT login with the new project.");
  log("The password hashes may not have been imported correctly.");
} else {
  log("Login SUCCESS as: " + authData.user.email);

  for (const date of ["2026-03-06", "2026-03-05", "2026-03-04"]) {
    const { data, error, count } = await anon
      .from("attendance_logs")
      .select("id, employee_id, work_date", { count: "exact" })
      .eq("work_date", date);
    log(`${date}: ${error ? "ERROR: " + error.message : (data?.length || 0) + " records"}`);
  }

  const { data: empData } = await anon.from("employees").select("id, name, role").limit(5);
  log("\nEmployees visible: " + (empData?.length || 0));
  if (empData) for (const e of empData) log(`  ${e.name} (${e.role})`);
}
