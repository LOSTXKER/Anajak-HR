import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { checkAndAwardBadges, ensureEmployeePoints, getGamificationSettings, awardPoints, getLeaderboard } from "@/lib/services/gamification.service";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { th } from "date-fns/locale";
import { sendLineMessage, formatWeeklyRankingMessage } from "@/lib/line/messaging";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Gamification Daily] Starting daily check...");

  try {
    const settings = await getGamificationSettings();
    if (settings.gamify_enabled === "false") {
      return NextResponse.json({ message: "Gamification disabled" });
    }

    const { data: employees } = await supabaseServer
      .from("employees")
      .select("id")
      .eq("account_status", "approved")
      .is("deleted_at", null)
      .eq("is_system_account", false);

    if (!employees || employees.length === 0) {
      return NextResponse.json({ message: "No employees to process" });
    }

    let badgesAwarded = 0;
    let weeklyBonuses = 0;

    const today = new Date();
    const dayOfWeek = today.getDay();
    const isEndOfWeek = dayOfWeek === 0; // Sunday

    // Get working days to calculate required attendance
    const { data: wdSetting } = await supabaseServer
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "working_days")
      .maybeSingle();
    const workingDays = wdSetting?.setting_value
      ? wdSetting.setting_value.split(",").map(Number)
      : [1, 2, 3, 4, 5];
    const requiredDays = workingDays.length;

    for (const emp of employees) {
      const newBadges = await checkAndAwardBadges(emp.id);
      badgesAwarded += newBadges.length;

      // Weekly no-leave bonus (run on Sundays)
      if (isEndOfWeek) {
        const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
        const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

        const { count: leaveCount } = await supabaseServer
          .from("leave_requests")
          .select("id", { count: "exact", head: true })
          .eq("employee_id", emp.id)
          .eq("status", "approved")
          .gte("start_date", weekStart)
          .lte("start_date", weekEnd);

        if ((leaveCount || 0) === 0) {
          const { count: attCount } = await supabaseServer
            .from("attendance_logs")
            .select("id", { count: "exact", head: true })
            .eq("employee_id", emp.id)
            .gte("work_date", weekStart)
            .lte("work_date", weekEnd);

          if ((attCount || 0) >= requiredDays) {
            const pts = parseInt(settings.gamify_points_no_leave_week || "20");
            await awardPoints(emp.id, "no_leave_week", pts, "ไม่ลางานตลอดสัปดาห์");
            weeklyBonuses++;
          }
        }
      }
    }

    // Weekly ranking announcement
    let rankingSent = false;
    const { data: rankingSettings } = await supabaseServer
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["enable_weekly_ranking_announcement", "weekly_ranking_day"]);

    const rankingMap: Record<string, string> = {};
    (rankingSettings || []).forEach((s: { setting_key: string; setting_value: string }) => {
      rankingMap[s.setting_key] = s.setting_value;
    });

    const rankingEnabled = rankingMap.enable_weekly_ranking_announcement !== "false";
    const rankingDay = parseInt(rankingMap.weekly_ranking_day || "0");

    if (rankingEnabled && dayOfWeek === rankingDay) {
      try {
        const leaderboard = await getLeaderboard("quarterly");
        const weekStartDate = startOfWeek(today, { weekStartsOn: 1 });
        const weekEndDate = endOfWeek(today, { weekStartsOn: 1 });
        const weekStartStr = format(weekStartDate, "d MMM", { locale: th });
        const weekEndStr = format(weekEndDate, "d MMM yyyy", { locale: th });

        const message = formatWeeklyRankingMessage(leaderboard, weekStartStr, weekEndStr);
        rankingSent = await sendLineMessage(message);
        console.log(`[Gamification Daily] Weekly ranking sent: ${rankingSent}`);
      } catch (err) {
        console.error("[Gamification Daily] Error sending weekly ranking:", err);
      }
    }

    console.log(`[Gamification Daily] Done: ${badgesAwarded} badges, ${weeklyBonuses} weekly bonuses, ranking: ${rankingSent}`);

    return NextResponse.json({
      success: true,
      processed: employees.length,
      badgesAwarded,
      weeklyBonuses,
      rankingSent,
    });
  } catch (error) {
    console.error("[Gamification Daily] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
