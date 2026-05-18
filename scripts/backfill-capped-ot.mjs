/**
 * Backfill: แก้ OT records ที่ถูก cap ผิด policy ย้อนหลัง
 *
 * Target IDs (จาก audit-capped-ot.mjs):
 *   - bccfd52a-5fb9-45da-9155-b98b654575de  (2026-02-01, ขาด 0.33 ชม.)
 *   - 1d68a4a3-44dd-49dc-8587-751a3c1d1aac  (2025-12-27, ขาด 0.39 ชม.)
 *
 * Note: ใช้ snapshot ของ system_settings + employee.base_salary_rate ปัจจุบัน
 *       ถ้าค่าเปลี่ยนไปจากตอน OT จบ → amount อาจไม่ตรง 100% กับที่ควรได้ตอนนั้น
 *       แต่ความต่างน้อย (rate เดียวกัน) → OK
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

const TARGETS = [
  "bccfd52a-5fb9-45da-9155-b98b654575de",
  "1d68a4a3-44dd-49dc-8587-751a3c1d1aac",
];

const { data: settingsRows } = await supabase
  .from("system_settings")
  .select("setting_key, setting_value")
  .in("setting_key", ["work_hours_per_day", "days_per_month", "hours_per_day"]);

const settings = Object.fromEntries(settingsRows.map((r) => [r.setting_key, r.setting_value]));
const daysPerMonth = parseFloat(settings.days_per_month || "30");
const hoursPerDay = parseFloat(settings.work_hours_per_day || settings.hours_per_day || "8");

for (const id of TARGETS) {
  const { data: ot, error } = await supabase
    .from("ot_requests")
    .select("*, employees!ot_requests_employee_id_fkey(name, base_salary_rate)")
    .eq("id", id)
    .single();

  if (error) { console.error("❌", id, error); continue; }

  const start = new Date(ot.actual_start_time);
  const end = new Date(ot.actual_end_time);
  const newHours = Math.round(((end.getTime() - start.getTime()) / 3600000) * 100) / 100;
  const baseSalary = parseFloat(ot.employees?.base_salary_rate || "0");
  const otRate = parseFloat(ot.ot_rate || "1");
  const hourlyRate = baseSalary > 0 ? baseSalary / daysPerMonth / hoursPerDay : 0;
  const newAmount = Math.round(newHours * hourlyRate * otRate * 100) / 100;

  const oldHours = parseFloat(ot.actual_ot_hours || "0");
  const oldAmount = parseFloat(ot.ot_amount || "0");

  const adminNote = [
    ot.admin_note,
    `[2026-05-19 backfill] actual_ot_hours: ${oldHours} → ${newHours} (ใช้เวลาทำจริง แทน cap ที่ approved_end_time). ot_amount: ${oldAmount} → ${newAmount}.`,
  ].filter(Boolean).join(" | ");

  const { error: upErr } = await supabase
    .from("ot_requests")
    .update({
      actual_ot_hours: newHours,
      ot_amount: newAmount,
      admin_note: adminNote,
    })
    .eq("id", id);

  if (upErr) { console.error("❌", id, upErr); continue; }

  console.log(`✅ ${id} | ${ot.request_date} ${ot.employees?.name}`);
  console.log(`   hours: ${oldHours} → ${newHours} | amount: ${oldAmount} → ${newAmount}`);
}

console.log("\n— Done —");
