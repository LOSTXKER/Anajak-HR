/**
 * Re-fix backfill: ใช้ hourly rate จาก stored data ตอน OT จบ ไม่ใช่ปัจจุบัน
 *
 * Derive: implied_rate_per_hour = old_amount / old_hours
 *         new_amount = new_hours × implied_rate_per_hour
 *
 * เพราะ base_salary อาจเปลี่ยนระหว่าง 2025-12 → 2026-05 → ใช้ rate ตอนนั้น
 *
 * Targets: 2 records ที่ backfill ก่อนหน้านี้
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

// ค่า historical (จาก audit + backfill ก่อนหน้า — เก็บ original ไว้ก่อน)
const TARGETS = [
  {
    id: "bccfd52a-5fb9-45da-9155-b98b654575de",
    date: "2026-02-01",
    originalHours: 6.13,
    originalAmount: 383.33,
    newHours: 6.46,
  },
  {
    id: "1d68a4a3-44dd-49dc-8587-751a3c1d1aac",
    date: "2025-12-27",
    originalHours: 7.95,
    originalAmount: 745.31,
    newHours: 8.34,
  },
];

for (const t of TARGETS) {
  const impliedRate = t.originalAmount / t.originalHours;
  const correctAmount = Math.round(t.newHours * impliedRate * 100) / 100;

  const { data: ot } = await supabase
    .from("ot_requests")
    .select("admin_note, ot_amount, actual_ot_hours")
    .eq("id", t.id)
    .single();

  const adminNote = [
    ot.admin_note,
    `[2026-05-19 fix-backfill-rate] ใช้ hourly rate ตอน OT จบ (${impliedRate.toFixed(4)} บาท/ชม. derived จาก ${t.originalAmount}/${t.originalHours}) แทน rate ปัจจุบัน. ot_amount: ${ot.ot_amount} → ${correctAmount}.`,
  ].filter(Boolean).join(" | ");

  const { error } = await supabase
    .from("ot_requests")
    .update({
      ot_amount: correctAmount,
      admin_note: adminNote,
    })
    .eq("id", t.id);

  if (error) { console.error("❌", t.id, error); continue; }

  const delta = Math.round((correctAmount - t.originalAmount) * 100) / 100;
  console.log(`✅ ${t.date} ${t.id}`);
  console.log(`   implied rate: ${impliedRate.toFixed(4)} บาท/ชม.`);
  console.log(`   hours ${t.originalHours} → ${t.newHours} | amount ${t.originalAmount} → ${correctAmount} (delta +${delta})`);
}
