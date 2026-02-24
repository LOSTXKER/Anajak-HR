import { Pool } from "pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});

const LEVELS = [
  { level: 1, name: "Rookie", minPoints: 0 },
  { level: 2, name: "Regular", minPoints: 100 },
  { level: 3, name: "Reliable", minPoints: 300 },
  { level: 4, name: "Star", minPoints: 600 },
  { level: 5, name: "Super Star", minPoints: 1000 },
  { level: 6, name: "MVP", minPoints: 1500 },
  { level: 7, name: "Legend", minPoints: 2500 },
];

function calculateLevel(totalPoints: number) {
  let result = LEVELS[0];
  for (const l of LEVELS) {
    if (totalPoints >= l.minPoints) result = l;
  }
  return result;
}

async function main() {
  const client = await pool.connect();

  try {
    console.log("=== Gamification Recalculation ===\n");

    const { rows: employees } = await client.query(
      `SELECT id, name FROM employees
       WHERE account_status = 'approved' AND deleted_at IS NULL AND is_system_account = false
       ORDER BY name`
    );

    console.log(`Found ${employees.length} employees to process\n`);

    const { rows: settingsRows } = await client.query(
      `SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'gamify_%' OR setting_key IN ('working_days', 'work_start_time')`
    );
    const settings: Record<string, string> = {};
    for (const s of settingsRows) {
      settings[s.setting_key] = s.setting_value || "";
    }

    const workStartTime = settings.work_start_time || "09:00";
    console.log(`Work start time: ${workStartTime}`);

    const workingDays = settings.working_days
      ? settings.working_days.split(",").map(Number)
      : [1, 2, 3, 4, 5];
    console.log(`Working days: ${workingDays.join(",")} (0=Sun, 1=Mon, ..., 6=Sat)\n`);

    const { rows: badgeDefs } = await client.query(
      `SELECT * FROM badge_definitions WHERE is_active = true`
    );

    let processed = 0;

    for (const emp of employees) {
      console.log(`[${processed + 1}/${employees.length}] ${emp.name}...`);

      try {
        await client.query("BEGIN");

        await client.query(`DELETE FROM point_transactions WHERE employee_id = $1`, [emp.id]);
        await client.query(`DELETE FROM employee_badges WHERE employee_id = $1`, [emp.id]);
        await client.query(`DELETE FROM employee_points WHERE employee_id = $1`, [emp.id]);

        const { rows: attendanceLogs } = await client.query(
          `SELECT * FROM attendance_logs WHERE employee_id = $1 ORDER BY work_date ASC`,
          [emp.id]
        );

        const { rows: otRequests } = await client.query(
          `SELECT id, created_at FROM ot_requests WHERE employee_id = $1 AND status = 'completed'`,
          [emp.id]
        );

        let totalPoints = 0;
        let currentStreak = 0;
        let longestStreak = 0;
        let onTimeCount = 0;
        let earlyCount = 0;
        let lastStreakDate: Date | null = null;

        for (const log of attendanceLogs) {
          const workDate = new Date(log.work_date);

          if (!log.is_late) {
            const pts = parseInt(settings.gamify_points_on_time || "10");
            totalPoints += pts;
            onTimeCount++;
            await client.query(
              `INSERT INTO point_transactions (employee_id, action_type, points, description, reference_id, reference_type, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [emp.id, "on_time_checkin", pts, "เช็กอินตรงเวลา", log.id, "attendance", workDate]
            );

            if (lastStreakDate) {
              // Find the expected previous working day by walking backwards
              let expectedPrev = new Date(workDate);
              expectedPrev.setDate(expectedPrev.getDate() - 1);
              while (!workingDays.includes(expectedPrev.getDay())) {
                expectedPrev.setDate(expectedPrev.getDate() - 1);
              }

              const lastStr = lastStreakDate.toISOString().slice(0, 10);
              const expectedStr = expectedPrev.toISOString().slice(0, 10);

              if (lastStr === expectedStr) {
                currentStreak++;
              } else if (lastStr === workDate.toISOString().slice(0, 10)) {
                // same day, keep current streak
              } else {
                currentStreak = 1;
              }
            } else {
              currentStreak = 1;
            }
            lastStreakDate = workDate;
            if (currentStreak > longestStreak) longestStreak = currentStreak;
          } else {
            const penalty = parseInt(settings.gamify_points_late_penalty || "-5");
            totalPoints += penalty;
            currentStreak = 0;
            lastStreakDate = null;
            await client.query(
              `INSERT INTO point_transactions (employee_id, action_type, points, description, reference_id, reference_type, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [emp.id, "late_penalty", penalty, "มาสาย", log.id, "attendance", workDate]
            );
          }

          if (log.clock_in_time && !log.is_late) {
            const clockIn = new Date(log.clock_in_time);
            const clockInUTC = clockIn.getUTCHours() * 60 + clockIn.getUTCMinutes();
            // work_start_time is in TH time (UTC+7), convert to UTC for comparison
            const [wsH, wsM] = workStartTime.split(":").map(Number);
            const workStartUTC = ((wsH - 7 + 24) % 24) * 60 + wsM;
            const earlyThreshold = parseInt(settings.gamify_early_minutes || "15");
            if (workStartUTC - clockInUTC >= earlyThreshold) {
              const pts = parseInt(settings.gamify_points_early || "5");
              totalPoints += pts;
              earlyCount++;
              await client.query(
                `INSERT INTO point_transactions (employee_id, action_type, points, description, reference_id, reference_type, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [emp.id, "early_checkin", pts, "เช็กอินก่อนเวลา", log.id, "attendance", workDate]
              );
            }
          }

          if (log.clock_out_time) {
            const pts = parseInt(settings.gamify_points_full_day || "5");
            totalPoints += pts;
            await client.query(
              `INSERT INTO point_transactions (employee_id, action_type, points, description, reference_id, reference_type, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [emp.id, "full_attendance_day", pts, "เข้า-ออกงานครบวัน", log.id, "attendance", workDate]
            );
          }
        }

        for (const ot of otRequests) {
          const pts = parseInt(settings.gamify_points_ot || "15");
          totalPoints += pts;
          await client.query(
            `INSERT INTO point_transactions (employee_id, action_type, points, description, reference_id, reference_type, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [emp.id, "ot_completed", pts, "ทำ OT สำเร็จ", ot.id, "ot", ot.created_at || new Date()]
          );
        }

        if (totalPoints < 0) totalPoints = 0;

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const { rows: monthlyRows } = await client.query(
          `SELECT COALESCE(SUM(points), 0) as total FROM point_transactions 
           WHERE employee_id = $1 AND created_at >= $2`,
          [emp.id, monthStart]
        );
        const monthlyPoints = Math.max(0, parseInt(monthlyRows[0].total));

        const levelInfo = calculateLevel(totalPoints);
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

        const otCount = otRequests.length;
        const totalAttendance = attendanceLogs.length;

        // Badge evaluation using condition_type from DB
        const stats: Record<string, number> = {
          first_checkin: totalAttendance,
          attendance_count: totalAttendance,
          on_time_count: onTimeCount,
          on_time_streak: longestStreak,
          on_time_month: 0, // requires month analysis
          early_count: earlyCount,
          ot_count: otCount,
          streak_days: longestStreak,
          no_leave_month: 0, // requires leave analysis
        };

        let badgeCount = 0;

        for (const badge of badgeDefs) {
          const condType = badge.condition_type;
          const condValue = badge.condition_value;
          const statValue = stats[condType] ?? 0;

          if (statValue >= condValue) {
            await client.query(
              `INSERT INTO employee_badges (employee_id, badge_id, earned_at) VALUES ($1, $2, $3)`,
              [emp.id, badge.id, now]
            );
            badgeCount++;

            const badgePts = badge.points_reward || 0;
            if (badgePts > 0) {
              totalPoints += badgePts;
              await client.query(
                `INSERT INTO point_transactions (employee_id, action_type, points, description, reference_id, reference_type)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [emp.id, "badge_earned", badgePts, `ได้รับ Badge: ${badge.name}`, badge.id, "badge"]
              );
            }
          }
        }

        const finalLevel = calculateLevel(totalPoints);

        await client.query(
          `INSERT INTO employee_points (employee_id, total_points, monthly_points, current_month, level, level_name, current_streak, longest_streak, last_streak_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [emp.id, totalPoints, monthlyPoints, currentMonth, finalLevel.level, finalLevel.name, currentStreak, longestStreak, lastStreakDate]
        );

        await client.query("COMMIT");

        console.log(
          `  ✓ Points: ${totalPoints} | Lv.${finalLevel.level} ${finalLevel.name} | Streak: ${currentStreak} (best: ${longestStreak}) | Badges: ${badgeCount} | Attendance: ${totalAttendance} | OT: ${otCount}`
        );
        processed++;
      } catch (err: any) {
        await client.query("ROLLBACK");
        console.error(`  ✗ Error: ${err.message}`);
      }
    }

    console.log(`\n=== Done! Processed ${processed}/${employees.length} employees ===`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
