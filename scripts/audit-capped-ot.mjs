/**
 * Audit: หา OT records ที่ถูก cap ผิด policy
 *
 * Definition: completed OT ที่
 *   - actual_end_time > approved_end_time (ทำเกินเวลาขอ)
 *   - AND actual_ot_hours < (actual_end - actual_start) ที่ควรเป็น (= ถูก cap)
 *
 * Output: list เรียงตามวันที่ + สรุปยอดเงินที่ขาด
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

const { data: ots, error } = await supabase
  .from("ot_requests")
  .select("*, employees!ot_requests_employee_id_fkey(name, email, base_salary_rate)")
  .eq("status", "completed")
  .not("actual_start_time", "is", null)
  .not("actual_end_time", "is", null)
  .order("request_date", { ascending: false });

if (error) { console.error(error); process.exit(1); }

const { data: settingsRows } = await supabase
  .from("system_settings")
  .select("setting_key, setting_value")
  .in("setting_key", ["work_hours_per_day", "days_per_month", "hours_per_day"]);

const settings = Object.fromEntries(settingsRows.map((r) => [r.setting_key, r.setting_value]));
const daysPerMonth = parseFloat(settings.days_per_month || "30");
const hoursPerDay = parseFloat(settings.work_hours_per_day || settings.hours_per_day || "8");

const capped = [];
let totalMissingHours = 0;
let totalMissingAmount = 0;

for (const ot of ots) {
  const approvedEnd = ot.approved_end_time || ot.requested_end_time;
  if (!approvedEnd) continue;

  const start = new Date(ot.actual_start_time);
  const actualEnd = new Date(ot.actual_end_time);
  const apprEnd = new Date(approvedEnd);

  // ต้องเป็น case ที่ทำเกินเวลา approved
  if (actualEnd.getTime() <= apprEnd.getTime()) continue;

  const realHours = Math.round(((actualEnd.getTime() - start.getTime()) / 3600000) * 100) / 100;
  const storedHours = parseFloat(ot.actual_ot_hours || "0");

  // ต้องเป็น case ที่ stored < real (ถูก cap)
  if (storedHours >= realHours - 0.01) continue; // tolerance 0.01

  const missingHours = Math.round((realHours - storedHours) * 100) / 100;
  const baseSalary = parseFloat(ot.employees?.base_salary_rate || "0");
  const otRate = parseFloat(ot.ot_rate || "1");
  const hourlyRate = baseSalary > 0 ? baseSalary / daysPerMonth / hoursPerDay : 0;
  const missingAmount = Math.round(missingHours * hourlyRate * otRate * 100) / 100;

  totalMissingHours += missingHours;
  totalMissingAmount += missingAmount;

  capped.push({
    id: ot.id,
    date: ot.request_date,
    name: ot.employees?.name,
    email: ot.employees?.email,
    actualStartTH: start.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" }),
    actualEndTH: actualEnd.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" }),
    approvedEndTH: apprEnd.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" }),
    storedHours,
    realHours,
    missingHours,
    storedAmount: parseFloat(ot.ot_amount || "0"),
    missingAmount,
  });
}

console.log(`\n📊 Total completed OT records scanned: ${ots.length}`);
console.log(`⚠️  Records ที่ถูก cap (actual > approved + stored < real): ${capped.length}`);
console.log(`💸 ชั่วโมงที่ขาดทั้งหมด: ${Math.round(totalMissingHours * 100) / 100} ชม.`);
console.log(`💸 เงินที่ขาดทั้งหมด: ${Math.round(totalMissingAmount * 100) / 100} บาท\n`);

if (capped.length > 0) {
  console.log("— DETAIL —");
  for (const c of capped) {
    console.log(`\n${c.date} | ${c.name} (${c.email})`);
    console.log(`  ทำจริง: ${c.actualStartTH} → ${c.actualEndTH} = ${c.realHours} ชม.`);
    console.log(`  ขอถึง: ${c.approvedEndTH} → ระบบ cap → stored ${c.storedHours} ชม.`);
    console.log(`  ขาด: ${c.missingHours} ชม. = ${c.missingAmount} บาท`);
    console.log(`  ot_id: ${c.id}`);
  }
}
