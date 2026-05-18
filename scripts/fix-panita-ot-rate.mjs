/**
 * One-off DB fix: ปณิตา OT 5/18 ot_rate 1.5 → 1
 *
 * Root cause: EditRequestModal hardcode default `ot_rate ?? 1.5` ทำให้ admin save
 *             ค่า 1.5 ทับลงไป ทั้งที่ system_settings.ot_rate_workday = 1
 *
 * Verify ก่อนรันจริง: ดูค่าเก่า + ใหม่
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

const { data: before } = await supabase
  .from("ot_requests")
  .select("id, employee_id, ot_type, ot_rate, status, request_date")
  .eq("id", PANITA_OT_ID)
  .single();

console.log("\n📋 BEFORE:");
console.log(JSON.stringify(before, null, 2));

const { data: after, error } = await supabase
  .from("ot_requests")
  .update({ ot_rate: 1, ot_type: "workday" })
  .eq("id", PANITA_OT_ID)
  .select()
  .single();

if (error) {
  console.error("❌ Update fail:", error);
  process.exit(1);
}

console.log("\n✅ AFTER:");
console.log(JSON.stringify(
  { id: after.id, ot_type: after.ot_type, ot_rate: after.ot_rate, status: after.status },
  null, 2
));
