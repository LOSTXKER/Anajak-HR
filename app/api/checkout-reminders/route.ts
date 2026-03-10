import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { sendLineMessage } from "@/lib/line/messaging";
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

    if (s.reminder_enabled === "false") {
      return NextResponse.json({ success: true, message: "Reminders disabled", sent: 0 });
    }

    if (s.auto_checkout_enabled === "false") {
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

    const reminderMinutes = [
      parseInt(s.reminder_first_minutes || "15", 10),
      parseInt(s.reminder_second_minutes || "30", 10),
      parseInt(s.reminder_third_minutes || "60", 10),
    ].sort((a, b) => a - b);

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

    console.log(`[Checkout Reminder] Bangkok time: ${format(bangkokNow, "HH:mm")}, round: ${shouldHaveSent}/${reminderMinutes.length}, work_end: ${workEndTimeStr}, auto_checkout: ${autoCheckoutTimeStr}`);

    const { data: uncheckedOut, error: fetchError } = await supabaseServer
      .from("attendance_logs")
      .select(`
        id,
        employee_id,
        clock_in_time,
        work_mode,
        reminder_count,
        employees!employee_id (
          id, name
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

    let employeesWithOT = new Set<string>();
    if (skipIfOT) {
      const { data: activeOTs } = await supabaseServer
        .from("ot_requests")
        .select("employee_id")
        .eq("request_date", today)
        .in("status", ["approved", "started"]);
      employeesWithOT = new Set(activeOTs?.map((ot: { employee_id: string }) => ot.employee_id) || []);
    }

    const { data: activeWFHs } = await supabaseServer
      .from("wfh_requests")
      .select("employee_id")
      .eq("date", today)
      .eq("status", "approved");
    const employeesWithWFH = new Set<string>(
      activeWFHs?.map((w: { employee_id: string }) => w.employee_id) || []
    );

    interface PendingEmployee {
      attId: string;
      employeeId: string;
      name: string;
      clockInStr: string;
      currentCount: number;
    }

    let skipped = 0;
    const pendingEmployees: PendingEmployee[] = [];

    for (const att of uncheckedOut) {
      const employee = att.employees as unknown as { id: string; name: string };

      if (skipIfOT && employeesWithOT.has(att.employee_id)) { skipped++; continue; }
      if (employeesWithWFH.has(att.employee_id) || (att as any).work_mode === "wfh") { skipped++; continue; }
      if (!att.clock_in_time) continue;

      const currentCount = att.reminder_count || 0;
      if (currentCount >= shouldHaveSent) continue;

      const clockInTH = new Date(new Date(att.clock_in_time).toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
      const clockInStr = format(clockInTH, "HH:mm");

      pendingEmployees.push({
        attId: att.id,
        employeeId: att.employee_id,
        name: employee?.name || att.employee_id,
        clockInStr,
        currentCount,
      });
    }

    if (pendingEmployees.length === 0) {
      console.log("[Checkout Reminder] All employees already reminded or skipped");
      return NextResponse.json({ success: true, message: "All employees already reminded", sent: 0, skipped });
    }

    let sent = 0;
    const errors: string[] = [];

    const employeeList = pendingEmployees
      .map((emp) => `  • ${emp.name} (เข้างาน ${emp.clockInStr} น.)`)
      .join("\n");

    const message = `⏰ เตือนลืมเช็คเอาท์ (ครั้งที่ ${shouldHaveSent}/${reminderMinutes.length})

📅 วันที่: ${format(bangkokNow, "d MMMM yyyy", { locale: th })}
🏢 เวลาเลิกงาน: ${workEndTimeStr} น.

👥 พนักงานที่ยังไม่เช็คเอาท์ (${pendingEmployees.length} คน):
${employeeList}

🤖 ระบบจะ Auto-checkout เวลา ${autoCheckoutTimeStr} น.
กรุณาเช็คเอาท์ก่อนเวลาดังกล่าว`;

    console.log(`[Checkout Reminder] Sending group reminder for ${pendingEmployees.length} employees, round ${shouldHaveSent}`);

    const lineSuccess = await sendLineMessage(message);

    if (lineSuccess) {
      sent++;
      console.log(`[Checkout Reminder] Group reminder sent successfully`);
    } else {
      console.error(`[Checkout Reminder] Failed to send group reminder`);
      errors.push("group_message_failed");
    }

    for (const emp of pendingEmployees) {
      try {
        await supabaseServer
          .from("attendance_logs")
          .update({ reminder_count: shouldHaveSent })
          .eq("id", emp.attId);

        await supabaseServer.from("checkout_reminders").insert({
          attendance_id: emp.attId,
          employee_id: emp.employeeId,
          reminder_number: shouldHaveSent,
          sent_via: "line",
        });
      } catch (updateErr) {
        console.warn(`[Checkout Reminder] Failed to update record for ${emp.name}:`, updateErr);
      }
    }

    console.log(`[Checkout Reminder] Done. Sent: ${sent}, Employees: ${pendingEmployees.length}, Skipped: ${skipped}, Errors: ${errors.length}`);

    return NextResponse.json({
      success: true,
      sent,
      skipped,
      employeesNotified: pendingEmployees.map((e) => e.name),
      reminderRound: shouldHaveSent,
      totalRounds: reminderMinutes.length,
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
