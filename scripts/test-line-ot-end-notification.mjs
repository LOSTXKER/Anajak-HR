/**
 * Smoke test: ส่งข้อความ "🔴 จบ OT" เข้า LINE จริง — verify fix
 *
 * Bug 2026-05-18 ค่ำ: LINE OT end แสดง "รวม OT: ไม่ระบุ" + "สถานที่: ไม่ระบุ"
 * Root cause: frontend ส่ง `hours` (string) + `gpsLat`/`gpsLng`
 *             แต่ API อ่าน `data.totalHours` (number) + `data.location` → undefined
 * Fix: API route อ่าน `data.hours ?? data.totalHours` + build Google Maps URL จาก gps
 *
 * Script นี้ mirror logic จาก app/api/notifications/route.ts (case "ot_end")
 * เพื่อ verify ว่าโค้ดใหม่จะส่ง message ถูกก่อน deploy
 *
 * รัน: node scripts/test-line-ot-end-notification.mjs
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

// ─────────────────────────────────────────────────────────
// Test payload: จำลองเคสจริงจาก bug report 5/18 ค่ำ
// ─────────────────────────────────────────────────────────
const data = {
  employeeName: "เอกอภิภัทร์  กุลรัตนรักษ์",
  time: "22:21",
  hours: "2.4",              // string จาก frontend .toFixed(1)
  gpsLat: 13.7563,           // pin โรงงานอนาจักร (สมมติ — แทนค่าจริงได้)
  gpsLng: 100.5018,
};

// ─────────────────────────────────────────────────────────
// Mirror logic จาก app/api/notifications/route.ts case "ot_end"
// ─────────────────────────────────────────────────────────
const timeStr = data.time;
const hoursRaw = data.hours ?? data.totalHours;
const hoursNum = typeof hoursRaw === "string" ? parseFloat(hoursRaw) : hoursRaw;
const hours = hoursNum != null && !Number.isNaN(hoursNum)
  ? `${hoursNum.toFixed(1)} ชั่วโมง`
  : "ไม่ระบุ";
const locationStr = data.location
  || (data.gpsLat != null && data.gpsLng != null
    ? `https://maps.google.com/?q=${data.gpsLat},${data.gpsLng}`
    : "ไม่ระบุ");

const message = `🔴 จบ OT

👤 พนักงาน: ${data.employeeName || "ไม่ระบุ"}
⏰ เวลาจบ: ${timeStr}
⏱️ รวม OT: ${hours}
📍 สถานที่: ${locationStr}

OT เสร็จสิ้น

(🧪 TEST — verify fix รอบนี้: รวม OT + สถานที่ ต้องไม่ขึ้น "ไม่ระบุ")`;

console.log("\n📤 จะส่งข้อความนี้เข้า LINE:\n");
console.log(message);
console.log("");

// ─────────────────────────────────────────────────────────
// Load LINE settings + ส่ง
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

console.log(`✅ ส่งสำเร็จ — เช็ค LINE ว่า:`);
console.log(`   • "⏱️ รวม OT: 2.4 ชั่วโมง" (ไม่ใช่ "ไม่ระบุ")`);
console.log(`   • "📍 สถานที่: https://maps.google.com/?q=..." (ไม่ใช่ "ไม่ระบุ")`);
