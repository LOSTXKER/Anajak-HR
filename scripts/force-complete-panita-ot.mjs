/**
 * One-off: ปิด OT ของปณิตา 5/18 แบบ manual (พนักงานลืมกดเริ่ม → ระบบ block expired)
 *
 * ใช้ approved range เป็น actual:
 *   approved_start_time → actual_start_time
 *   approved_end_time   → actual_end_time
 *   approved_ot_hours   → actual_ot_hours
 *   ot_amount = hours × (base_salary / days_per_month / work_hours_per_day) × ot_rate
 *   status = "completed"
 *   admin_note = ระบุ manual close + เหตุผล
 */

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

const PANITA_OT_ID = "89e27f38-a7ff-490d-9b9f-28bd58f555eb";

// 1) Read current OT request
const { data: ot } = await supabase
  .from("ot_requests")
  .select("*")
  .eq("id", PANITA_OT_ID)
  .single();

console.log("\n📋 BEFORE:");
console.log({
  status: ot.status,
  ot_type: ot.ot_type,
  ot_rate: ot.ot_rate,
  approved_start_time: ot.approved_start_time,
  approved_end_time: ot.approved_end_time,
  approved_ot_hours: ot.approved_ot_hours,
  actual_start_time: ot.actual_start_time,
  actual_end_time: ot.actual_end_time,
  actual_ot_hours: ot.actual_ot_hours,
  ot_amount: ot.ot_amount,
});

// 2) Read employee base salary
const { data: emp } = await supabase
  .from("employees")
  .select("name, base_salary_rate")
  .eq("id", ot.employee_id)
  .single();

console.log("\n👤 EMPLOYEE:", emp.name, "base_salary_rate =", emp.base_salary_rate);

// 3) Read payroll settings
const { data: settingsRows } = await supabase
  .from("system_settings")
  .select("setting_key, setting_value")
  .in("setting_key", ["work_hours_per_day", "days_per_month"]);

const settings = Object.fromEntries(settingsRows.map((r) => [r.setting_key, r.setting_value]));
const daysPerMonth = parseFloat(settings.days_per_month || "26");
const workHoursPerDay = parseFloat(settings.work_hours_per_day || "8");

console.log("⚙️ SETTINGS:", { daysPerMonth, workHoursPerDay });

// 4) Compute amount
const baseSalary = parseFloat(emp.base_salary_rate || "0");
const hours = parseFloat(ot.approved_ot_hours || "0");
const otRate = parseFloat(ot.ot_rate || "1");
const hourlyRate = baseSalary > 0 ? baseSalary / daysPerMonth / workHoursPerDay : 0;
const otAmount = Math.round(hours * hourlyRate * otRate * 100) / 100;

console.log("\n🧮 CALC:");
console.log({ hours, otRate, hourlyRate: hourlyRate.toFixed(4), otAmount });

// 5) Update record
const { data: updated, error } = await supabase
  .from("ot_requests")
  .update({
    actual_start_time: ot.approved_start_time,
    actual_end_time: ot.approved_end_time,
    actual_ot_hours: ot.approved_ot_hours,
    ot_amount: otAmount,
    status: "completed",
    admin_note: "ปิด OT แบบ manual โดย admin — พนักงานลืมกดเริ่ม OT ก่อนเลยเวลาสิ้นสุด (2026-05-18)",
  })
  .eq("id", PANITA_OT_ID)
  .select()
  .single();

if (error) {
  console.error("\n❌ Update fail:", error);
  process.exit(1);
}

console.log("\n✅ AFTER:");
console.log({
  status: updated.status,
  actual_start_time: updated.actual_start_time,
  actual_end_time: updated.actual_end_time,
  actual_ot_hours: updated.actual_ot_hours,
  ot_amount: updated.ot_amount,
  admin_note: updated.admin_note,
});

console.log(`\n✅ ปณิตา OT 5/18 ปิดแล้ว — เธอจะเห็นใน /history ของเธอ`);
