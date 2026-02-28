import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { sendLineMessage, formatForgotCheckOutReminder } from "@/lib/line/messaging";
import { getTodayTH, getNowTH } from "@/lib/utils/date";
import { format } from "date-fns";
import { th } from "date-fns/locale";

function parseHHMM(timeStr: string): { hours: number; minutes: number } | null {
  const m = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return { hours: parseInt(m[1], 10), minutes: parseInt(m[2], 10) };
}

function timeToMinutesSinceMidnight(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Checkout Reminder] Starting...");

  try {
    const { data: settings, error: settingsError } = await supabaseServer
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", [
        "reminder_enabled",
        "reminder_first_minutes",
        "reminder_second_minutes",
        "reminder_third_minutes",
        "auto_checkout_time",
        "auto_checkout_enabled",
        "auto_checkout_skip_if_ot",
        "work_end_time",
      ]);

    if (settingsError) {
      console.error("[Checkout Reminder] Error fetching settings:", settingsError);
      throw settingsError;
    }

    const s: Record<string, string> = {};
    settings?.forEach((row: { setting_key: string; setting_value: string }) => {
      s[row.setting_key] = row.setting_value;
    });

    if (s.reminder_enabled !== "true") {
      return NextResponse.json({ success: true, message: "Reminders disabled", sent: 0 });
    }

    if (s.auto_checkout_enabled !== "true") {
      return NextResponse.json({ success: true, message: "Auto checkout disabled, skipping reminders", sent: 0 });
    }

    const autoCheckoutTimeStr = s.auto_checkout_time || "22:00";
    const skipIfOT = s.auto_checkout_skip_if_ot !== "false";
    const workEndTimeStr = s.work_end_time || "18:00";

    const acTime = parseHHMM(autoCheckoutTimeStr);
    if (!acTime) {
      console.error("[Checkout Reminder] Invalid auto_checkout_time:", autoCheckoutTimeStr);
      return NextResponse.json({ success: false, error: "Invalid auto_checkout_time" }, { status: 500 });
    }

    // Settings = "นาทีหลังเวลาเลิกงาน" เช่น เลิกงาน 18:00, setting 15 -> เตือนตอน 18:15
    const reminderMinutes = [
      parseInt(s.reminder_first_minutes || "15", 10),
      parseInt(s.reminder_second_minutes || "30", 10),
      parseInt(s.reminder_third_minutes || "60", 10),
    ].sort((a, b) => a - b); // ascending: first reminder is earliest (least minutes after)

    const weTime = parseHHMM(workEndTimeStr);
    if (!weTime) {
      console.error("[Checkout Reminder] Invalid work_end_time:", workEndTimeStr);
      return NextResponse.json({ success: false, error: "Invalid work_end_time" }, { status: 500 });
    }

    const weMinutes = timeToMinutesSinceMidnight(weTime.hours, weTime.minutes);
    const reminderTimes = reminderMinutes.map((minAfter) => weMinutes + minAfter);

    const bangkokNow = getNowTH();
    const nowMinutes = timeToMinutesSinceMidnight(bangkokNow.getHours(), bangkokNow.getMinutes());
    const today = getTodayTH();

    let shouldHaveSent = 0;
    for (const rt of reminderTimes) {
      if (nowMinutes >= rt) shouldHaveSent++;
    }

    if (shouldHaveSent === 0) {
      console.log(`[Checkout Reminder] Too early (now=${nowMinutes}, first reminder at ${reminderTimes[0]})`);
      return NextResponse.json({ success: true, message: "Too early for reminders", sent: 0 });
    }

    console.log(`[Checkout Reminder] Bangkok time: ${format(bangkokNow, "HH:mm")}, should have sent: ${shouldHaveSent}, work_end: ${workEndTimeStr}, auto_checkout: ${autoCheckoutTimeStr}`);

    // Find employees checked in but not out
    const { data: uncheckedOut, error: fetchError } = await supabaseServer
      .from("attendance_logs")
      .select(`
        id,
        employee_id,
        clock_in_time,
        work_mode,
        reminder_count,
        employees!employee_id (
          id, name, line_user_id
        )
      `)
      .eq("work_date", today)
      .is("clock_out_time", null);

    if (fetchError) {
      console.error("[Checkout Reminder] Fetch error:", fetchError);
      throw fetchError;
    }

    if (!uncheckedOut || uncheckedOut.length === 0) {
      return NextResponse.json({ success: true, message: "No unchecked out employees", sent: 0 });
    }

    // Skip OT employees
    let employeesWithOT = new Set<string>();
    if (skipIfOT) {
      const { data: activeOTs } = await supabaseServer
        .from("ot_requests")
        .select("employee_id")
        .eq("request_date", today)
        .in("status", ["approved", "started"]);
      employeesWithOT = new Set(activeOTs?.map((ot: { employee_id: string }) => ot.employee_id) || []);
    }

    // Skip WFH employees
    const { data: activeWFHs } = await supabaseServer
      .from("wfh_requests")
      .select("employee_id")
      .eq("date", today)
      .eq("status", "approved");
    const employeesWithWFH = new Set<string>(
      activeWFHs?.map((w: { employee_id: string }) => w.employee_id) || []
    );

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const att of uncheckedOut) {
      try {
        const employee = att.employees as unknown as {
          id: string;
          name: string;
          line_user_id?: string;
        };

        if (skipIfOT && employeesWithOT.has(att.employee_id)) { skipped++; continue; }
        if (employeesWithWFH.has(att.employee_id) || (att as any).work_mode === "wfh") { skipped++; continue; }
        if (!att.clock_in_time) continue;

        const currentCount = att.reminder_count || 0;
        if (currentCount >= shouldHaveSent) continue;

        // Send reminders for each missed step
        const remindersToSend = shouldHaveSent - currentCount;
        const nextReminderNumber = currentCount + 1;

        if (!employee?.line_user_id) {
          // No LINE — still update count so we don't retry endlessly
          await supabaseServer
            .from("attendance_logs")
            .update({ reminder_count: shouldHaveSent })
            .eq("id", att.id);
          continue;
        }

        const clockInTH = new Date(new Date(att.clock_in_time).toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
        const clockInStr = format(clockInTH, "HH:mm");

        const message = formatForgotCheckOutReminder(employee.name, {
          reminderNumber: nextReminderNumber,
          totalReminders: 3,
          clockInTime: clockInStr,
          workEndTime: workEndTimeStr,
          autoCheckoutTime: autoCheckoutTimeStr,
        });

        await sendLineMessage(message, employee.line_user_id);

        // Update reminder_count
        await supabaseServer
          .from("attendance_logs")
          .update({ reminder_count: shouldHaveSent })
          .eq("id", att.id);

        // Record in checkout_reminders table
        await supabaseServer.from("checkout_reminders").insert({
          attendance_id: att.id,
          employee_id: att.employee_id,
          reminder_number: nextReminderNumber,
          sent_via: "line",
        });

        sent++;
        console.log(`[Checkout Reminder] Sent reminder #${nextReminderNumber} to ${employee.name}`);
      } catch (err) {
        console.error(`[Checkout Reminder] Error for ${att.id}:`, err);
        errors.push(att.id);
      }
    }

    console.log(`[Checkout Reminder] Done. Sent: ${sent}, Skipped: ${skipped}, Errors: ${errors.length}`);

    return NextResponse.json({
      success: true,
      sent,
      skipped,
      total: uncheckedOut.length,
      shouldHaveSent,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    console.error("[Checkout Reminder] Fatal error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
