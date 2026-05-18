/**
 * One-off inspection: ทำไม OT 5/18 ปณิตา ได้ 1.5x แต่ เอกอภิภัทร์ ได้ 1x
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

// 1) Employees: pull rate columns + branch
const { data: emps } = await supabase
  .from("employees")
  .select("id, name, email, branch_id, ot_rate_1x, ot_rate_1_5x, ot_rate_2x")
  .in("email", ["surawutpanita3@gmail.com", "pipat110159@gmail.com"]);

console.log("\n👥 EMPLOYEES");
console.log(JSON.stringify(emps, null, 2));

const empIds = (emps ?? []).map((e) => e.id);

// 2) OT requests for those employees on 5/18
const { data: ots } = await supabase
  .from("ot_requests")
  .select("*")
  .in("employee_id", empIds)
  .eq("request_date", "2026-05-18");

console.log("\n📋 OT REQUESTS (2026-05-18)");
console.log(JSON.stringify(ots, null, 2));

// 3) System settings for rates
const { data: settings } = await supabase
  .from("system_settings")
  .select("setting_key, setting_value")
  .in("setting_key", ["ot_rate_workday", "ot_rate_weekend", "ot_rate_holiday"]);

console.log("\n⚙️ SYSTEM SETTINGS");
console.log(JSON.stringify(settings, null, 2));

// 4) Holidays on 5/18 (branch-aware)
const { data: holidays } = await supabase
  .from("holidays")
  .select("*")
  .eq("date", "2026-05-18")
  .eq("is_active", true);

console.log("\n🎉 HOLIDAYS on 5/18");
console.log(JSON.stringify(holidays, null, 2));
