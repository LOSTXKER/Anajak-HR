/**
 * Smoke test: ส่งข้อความ OT approval เข้า LINE จริง
 *
 * ใช้ pattern เดียวกับ fix ใน app/api/notifications/route.ts:79-80
 * (toThaiDate + format) — verify ว่าเวลาออกถูกต้องเมื่อ DB เก็บ UTC
 *
 * รัน: node scripts/test-line-ot-notification.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL หรือ SUPABASE_SERVICE_ROLE_KEY ไม่มีใน .env.local");
  process.exit(1);
}

// Mirror ของ lib/utils/date.ts → toThaiDate (อย่าแก้ — match production behavior)
function toThaiDate(timestamp) {
  const d = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  return new Date(d.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
}

function formatHHmm(d) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatThaiDate(d) {
  const months = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ─────────────────────────────────────────────────────────
// Test payload: จำลองเคส 5/18 — OT 20:30-22:00 Thai (= 13:30-15:00 UTC)
// ─────────────────────────────────────────────────────────
const TEST_DATE_ISO = "2026-05-18";                          // request_date (@db.Date)
const TEST_START_ISO = "2026-05-18T13:30:00.000Z";           // = 20:30 Thai
const TEST_END_ISO = "2026-05-18T15:00:00.000Z";             // = 22:00 Thai

const dateStr = formatThaiDate(new Date(TEST_DATE_ISO));
const startTimeStr = formatHHmm(toThaiDate(TEST_START_ISO));
const endTimeStr = formatHHmm(toThaiDate(TEST_END_ISO));

console.log("\n🧪 Test fixture:");
console.log("  Date ISO:        ", TEST_DATE_ISO);
console.log("  Start UTC:       ", TEST_START_ISO, "→ Thai:", startTimeStr);
console.log("  End UTC:         ", TEST_END_ISO, "→ Thai:", endTimeStr);

if (startTimeStr !== "20:30" || endTimeStr !== "22:00") {
  console.error(`\n❌ Conversion FAIL — expected 20:30-22:00, got ${startTimeStr}-${endTimeStr}`);
  process.exit(1);
}
console.log("  ✓ Conversion ถูกต้อง (20:30-22:00)\n");

// ─────────────────────────────────────────────────────────
// Load LINE settings จาก Supabase + ส่งข้อความเทสจริง
// ─────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const { data: settingsRows, error: settingsErr } = await supabase
  .from("system_settings")
  .select("setting_key, setting_value")
  .in("setting_key", ["line_channel_access_token", "line_recipient_id", "enable_notifications"]);

if (settingsErr) {
  console.error("❌ Query Supabase fail:", settingsErr);
  process.exit(1);
}

const settings = Object.fromEntries(settingsRows.map((r) => [r.setting_key, r.setting_value]));

if (settings.enable_notifications !== "true") {
  console.error("❌ enable_notifications = false ใน Supabase — เปิดที่ admin/settings ก่อน");
  process.exit(1);
}
if (!settings.line_channel_access_token || !settings.line_recipient_id) {
  console.error("❌ LINE token หรือ recipient ไม่มีใน system_settings");
  process.exit(1);
}

const message = `🧪 TEST — Timezone fix verification

📋 คำขอ OT ได้รับอนุมัติแล้ว
👤 พนักงาน: TEST USER (ทดสอบ fix 5/18)
📅 วันที่: ${dateStr}
⏰ เวลา: ${startTimeStr} - ${endTimeStr}
✅ สถานะ: อนุมัติแล้ว

(ข้อความนี้ส่งจาก smoke test — ถ้าเห็น 20:30 - 22:00 = fix ถูก)`;

console.log("📤 ส่งเข้า LINE...\n");
console.log(message);
console.log("");

const lineResp = await fetch("https://api.line.me/v2/bot/message/push", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${settings.line_channel_access_token}`,
  },
  body: JSON.stringify({
    to: settings.line_recipient_id,
    messages: [{ type: "text", text: message }],
  }),
});

if (!lineResp.ok) {
  const err = await lineResp.json().catch(() => ({}));
  console.error(`❌ LINE API fail [${lineResp.status}]:`, err);
  process.exit(1);
}

console.log(`✅ ส่งสำเร็จ — เช็คใน LINE ว่าเห็น "20:30 - 22:00" หรือยัง`);
