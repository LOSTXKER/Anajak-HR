/**
 * Diagnostic: Check if badge points are still in the system
 */

import pg from "pg";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");
let env = {};
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  }
} catch { process.exit(1); }

const client = new pg.Client({ connectionString: env.DIRECT_URL });

async function check() {
  await client.connect();

  console.log("=== 1. Badge definitions points_reward ===");
  const badges = await client.query("SELECT name, points_reward FROM badge_definitions ORDER BY name");
  for (const b of badges.rows) {
    console.log(`  ${b.name}: ${b.points_reward} pts ${b.points_reward > 0 ? "⚠️ NOT ZERO" : "✓"}`);
  }

  console.log("\n=== 2. badge_earned transactions still in DB ===");
  const txns = await client.query(`
    SELECT COUNT(*) as count, SUM(points) as total_pts
    FROM point_transactions
    WHERE action_type = 'badge_earned'
  `);
  const { count, total_pts } = txns.rows[0];
  console.log(`  badge_earned transactions: ${count} (total: ${total_pts || 0} pts)`);
  if (parseInt(count) > 0) {
    console.log("  ⚠️ badge_earned transactions still exist! Recalculation may not have run.");
  } else {
    console.log("  ✓ No badge_earned transactions found.");
  }

  console.log("\n=== 3. Employee points summary (top 10) ===");
  const points = await client.query(`
    SELECT ep.employee_id, e.name, ep.total_points, ep.quarterly_points, ep.level_name, ep.rank_tier
    FROM employee_points ep
    JOIN employees e ON e.id = ep.employee_id
    ORDER BY ep.total_points DESC
    LIMIT 10
  `);
  for (const p of points.rows) {
    console.log(`  ${p.name}: total=${p.total_points} quarterly=${p.quarterly_points} level=${p.level_name} rank=${p.rank_tier}`);
  }

  console.log("\n=== 4. Point breakdown by action_type ===");
  const breakdown = await client.query(`
    SELECT action_type, COUNT(*) as count, SUM(points) as total
    FROM point_transactions
    GROUP BY action_type
    ORDER BY total DESC
  `);
  for (const r of breakdown.rows) {
    console.log(`  ${r.action_type}: ${r.count} transactions = ${r.total} pts`);
  }

  await client.end();
}

check().catch((err) => { console.error(err.message); process.exit(1); });
