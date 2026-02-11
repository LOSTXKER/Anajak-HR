/**
 * Seed holidays for BE 2569 (CE 2026)
 * Run: node scripts/seed-holidays-2569.mjs
 */

import pg from "pg";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env.local
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const directUrl = env.DIRECT_URL;
if (!directUrl) {
  console.error("Missing DIRECT_URL in .env.local");
  process.exit(1);
}

const client = new pg.Client({ connectionString: directUrl });

const holidays = [
  // ส่วนที่ 1: วันหยุดตามประเพณี (13 วัน)
  { date: "2026-01-01", name: "วันขึ้นปีใหม่", type: "public" },
  { date: "2026-03-03", name: "วันมาฆบูชา", type: "public" },
  { date: "2026-04-06", name: "วันจักรี", type: "public" },
  { date: "2026-04-13", name: "วันสงกรานต์", type: "public" },
  { date: "2026-04-14", name: "วันสงกรานต์", type: "public" },
  { date: "2026-04-15", name: "วันสงกรานต์", type: "public" },
  { date: "2026-05-01", name: "วันแรงงานแห่งชาติ", type: "public" },
  { date: "2026-06-01", name: "ชดเชยวันวิสาขบูชา", type: "public" },
  { date: "2026-07-29", name: "วันอาสาฬหบูชา", type: "public" },
  { date: "2026-08-12", name: "วันแม่แห่งชาติ", type: "public" },
  { date: "2026-10-13", name: "วันคล้ายวันสวรรคต ร.9", type: "public" },
  { date: "2026-12-07", name: "ชดเชยวันพ่อแห่งชาติ", type: "public" },
  { date: "2026-12-10", name: "วันรัฐธรรมนูญ", type: "public" },

  // ส่วนที่ 2: วันหยุดยาวเทศกาลปีใหม่ (28-31 ธ.ค. 2569 เป็นวันหยุดบริษัท)
  { date: "2026-12-28", name: "หยุดเทศกาลปีใหม่", type: "company" },
  { date: "2026-12-29", name: "หยุดเทศกาลปีใหม่", type: "company" },
  { date: "2026-12-30", name: "หยุดเทศกาลปีใหม่", type: "company" },
  { date: "2026-12-31", name: "หยุดเทศกาลปีใหม่", type: "company" },

  // วันขึ้นปีใหม่ พ.ศ. 2570 (ค.ศ. 2027)
  { date: "2027-01-01", name: "วันขึ้นปีใหม่", type: "public" },
];

async function seed() {
  console.log("Seeding holidays for BE 2569 (CE 2026)...\n");

  await client.connect();
  let inserted = 0;
  let skipped = 0;

  try {
    for (const holiday of holidays) {
      // Check if already exists
      const check = await client.query(
        "SELECT id FROM holidays WHERE date = $1 LIMIT 1",
        [holiday.date]
      );

      if (check.rows.length > 0) {
        console.log(`  SKIP  ${holiday.date}  ${holiday.name} (already exists)`);
        skipped++;
        continue;
      }

      await client.query(
        "INSERT INTO holidays (date, name, type) VALUES ($1, $2, $3)",
        [holiday.date, holiday.name, holiday.type]
      );
      console.log(`  ADD   ${holiday.date}  ${holiday.name} [${holiday.type}]`);
      inserted++;
    }

    console.log(`\nDone! Inserted: ${inserted}, Skipped: ${skipped}`);
  } finally {
    await client.end();
  }
}

seed().catch(console.error);
