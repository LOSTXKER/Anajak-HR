/**
 * One-off: แก้ actual_ot_hours ของ OT 5/18 ของเอกอภิภัทร์
 *
 * Before: actual_ot_hours = 2.41 (cap ตาม approved_end_time — ผิด policy)
 * After:  actual_ot_hours = diff จาก actual_start_time → actual_end_time จริง
 *         ot_amount = hours × hourly_rate × ot_rate
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

const OT_ID = "ed208d6d-14fb-469c-95dd-bf946e243e5d";

const { data: ot, error: otErr } = await supabase
  .from("ot_requests")
  .select("*")
  .eq("id", OT_ID)
  .single();

if (otErr) { console.error(otErr); process.exit(1); }

console.log("📋 BEFORE:", {
  actual_start_time: ot.actual_start_time,
  actual_end_time: ot.actual_end_time,
  actual_ot_hours: ot.actual_ot_hours,
  ot_amount: ot.ot_amount,
  ot_rate: ot.ot_rate,
});

const { data: emp } = await supabase
  .from("employees")
  .select("name, base_salary_rate")
  .eq("id", ot.employee_id)
  .single();

const { data: settingsRows } = await supabase
  .from("system_settings")
  .select("setting_key, setting_value")
  .in("setting_key", ["work_hours_per_day", "days_per_month", "hours_per_day"]);

const settings = Object.fromEntries(settingsRows.map((r) => [r.setting_key, r.setting_value]));
const daysPerMonth = parseFloat(settings.days_per_month || "26");
const hoursPerDay = parseFloat(settings.work_hours_per_day || settings.hours_per_day || "8");
const baseSalary = parseFloat(emp.base_salary_rate || "0");
const otRate = parseFloat(ot.ot_rate || "1");

const start = new Date(ot.actual_start_time);
const end = new Date(ot.actual_end_time);
const newHours = Math.round(((end.getTime() - start.getTime()) / 3600000) * 100) / 100;
const hourlyRate = baseSalary > 0 ? baseSalary / daysPerMonth / hoursPerDay : 0;
const newAmount = Math.round(newHours * hourlyRate * otRate * 100) / 100;

console.log("\n🧮 CALC:", {
  daysPerMonth, hoursPerDay, baseSalary, otRate,
  hourlyRate: hourlyRate.toFixed(4),
  newHours, newAmount,
});

const adminNote = [
  ot.admin_note,
  `[2026-05-19 แก้โดยระบบ] actual_ot_hours: ${ot.actual_ot_hours} → ${newHours} (ใช้เวลาทำจริง 18:05-22:21 แทนการ cap ที่ 20:30 ตาม approved_end_time เดิม). ot_amount: ${ot.ot_amount} → ${newAmount}.`,
].filter(Boolean).join(" | ");

const { data: updated, error } = await supabase
  .from("ot_requests")
  .update({
    actual_ot_hours: newHours,
    ot_amount: newAmount,
    admin_note: adminNote,
  })
  .eq("id", OT_ID)
  .select()
  .single();

if (error) { console.error("❌", error); process.exit(1); }

console.log("\n✅ AFTER:", {
  actual_ot_hours: updated.actual_ot_hours,
  ot_amount: updated.ot_amount,
  admin_note: updated.admin_note,
});
