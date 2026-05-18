import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const EMAIL = "pipat110159@gmail.com";
const DATE = "2026-05-18";

const { data: emp, error: empErr } = await supabase
  .from("employees")
  .select("id, name, email, base_salary_rate")
  .eq("email", EMAIL)
  .maybeSingle();

if (empErr || !emp) {
  console.error("❌ employee not found:", empErr);
  process.exit(1);
}

console.log("\n👤 EMPLOYEE:", emp);

const { data: ots, error: otErr } = await supabase
  .from("ot_requests")
  .select("*")
  .eq("employee_id", emp.id)
  .eq("request_date", DATE);

if (otErr) {
  console.error("❌ ot fetch fail:", otErr);
  process.exit(1);
}

console.log(`\n📋 OT records on ${DATE}: ${ots.length}`);

for (const ot of ots) {
  console.log("\n— record —");
  console.log({
    id: ot.id,
    status: ot.status,
    ot_type: ot.ot_type,
    ot_rate: ot.ot_rate,
    requested_start_time: ot.requested_start_time,
    requested_end_time: ot.requested_end_time,
    approved_start_time: ot.approved_start_time,
    approved_end_time: ot.approved_end_time,
    approved_ot_hours: ot.approved_ot_hours,
    actual_start_time: ot.actual_start_time,
    actual_end_time: ot.actual_end_time,
    actual_ot_hours: ot.actual_ot_hours,
    ot_amount: ot.ot_amount,
    reason: ot.reason,
    created_at: ot.created_at,
    updated_at: ot.updated_at,
  });

  // Recompute diff from each pair
  const pairs = [
    ["requested", ot.requested_start_time, ot.requested_end_time],
    ["approved", ot.approved_start_time, ot.approved_end_time],
    ["actual", ot.actual_start_time, ot.actual_end_time],
  ];
  console.log("\n🧮 RECOMPUTE diff (UTC + Thai):");
  for (const [label, s, e] of pairs) {
    if (!s || !e) {
      console.log(`  ${label}: (missing)`);
      continue;
    }
    const sd = new Date(s), ed = new Date(e);
    const ms = ed.getTime() - sd.getTime();
    const hr = Math.round((ms / 3600000) * 100) / 100;
    const sThai = sd.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });
    const eThai = ed.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });
    console.log(`  ${label}: ${sThai} → ${eThai}  (raw ${s} → ${e}) = ${hr} hr`);
  }
}
