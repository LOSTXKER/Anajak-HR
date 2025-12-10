import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { sendLineMessage } from "@/lib/line/messaging";
import { format, addMinutes, addHours, parseISO } from "date-fns";
import { th } from "date-fns/locale";

/**
 * API สำหรับตรวจสอบและทำ Auto Check-out
 * ควรเรียกผ่าน cron job ทุก 5-10 นาที
 */
export async function POST(request: NextRequest) {
  try {
    // ดึงการตั้งค่า
    const { data: settingsData } = await supabaseServer
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", [
        "auto_checkout_enabled",
        "auto_checkout_delay_hours",
        "auto_checkout_require_outside_radius",
        "auto_checkout_skip_if_ot",
        "auto_checkout_time",
        "reminder_enabled",
        "reminder_first_minutes",
        "reminder_second_minutes",
        "reminder_third_minutes",
        "notify_admin_on_auto_checkout",
        "work_end_time",
      ]);

    const settings: Record<string, string> = {};
    settingsData?.forEach((item: any) => {
      settings[item.setting_key] = item.setting_value;
    });

    const autoCheckoutEnabled = settings.auto_checkout_enabled === "true";
    const reminderEnabled = settings.reminder_enabled === "true";

    if (!autoCheckoutEnabled && !reminderEnabled) {
      return Response.json({ message: "Auto checkout and reminders are disabled" });
    }

    const now = new Date();
    const today = format(now, "yyyy-MM-dd");
    const workEndTime = settings.work_end_time || "18:00";
    const [endHour, endMinute] = workEndTime.split(":").map(Number);

    // หาพนักงานที่ยังไม่ได้เช็คเอาท์วันนี้
    const { data: pendingCheckoutsRaw, error } = await supabaseServer
      .from("attendance_logs")
      .select(`
        *,
        employee:employees!employee_id(id, name, email, role, line_user_id)
      `)
      .eq("work_date", today)
      .is("clock_out_time", null);

    // ตรวจสอบ error ก่อน
    if (error) {
      console.error("Error fetching pending checkouts:", error);
      return Response.json({
        error: "Failed to fetch pending checkouts",
        details: error.message,
        hint: error.hint || "Check if SUPABASE_SERVICE_ROLE_KEY is set correctly"
      }, { status: 500 });
    }

    // Filter เฉพาะที่ไม่ใช่ admin
    const pendingCheckouts = (pendingCheckoutsRaw || []).filter(
      (a: any) => a.employee?.role !== "admin"
    );

    const results = {
      reminders_sent: 0,
      auto_checkouts: 0,
      anomalies_created: 0,
    };

    for (const attendance of pendingCheckouts || []) {
      const clockInDate = parseISO(attendance.clock_in_time);
      const workEndDate = new Date(clockInDate);
      workEndDate.setHours(endHour, endMinute, 0, 0);

      // ถ้ายังไม่ถึงเวลาเลิกงาน ข้ามไป
      if (now < workEndDate) continue;

      const minutesSinceWorkEnd = Math.floor((now.getTime() - workEndDate.getTime()) / 60000);
      const hoursSinceWorkEnd = minutesSinceWorkEnd / 60;

      // ตรวจสอบว่ามี OT ที่อนุมัติแล้วหรือไม่
      if (settings.auto_checkout_skip_if_ot === "true") {
        const { data: approvedOT } = await supabaseServer
          .from("ot_requests")
          .select("id")
          .eq("employee_id", attendance.employee_id)
          .eq("request_date", today)
          .eq("status", "approved")
          .maybeSingle();

        if (approvedOT) continue; // ข้ามถ้ามี OT
      }

      // ส่งการแจ้งเตือน
      if (reminderEnabled && attendance.employee?.line_user_id) {
        const reminderMinutes = [
          parseInt(settings.reminder_first_minutes || "15"),
          parseInt(settings.reminder_second_minutes || "60"),
          parseInt(settings.reminder_third_minutes || "180"),
        ];

        const currentReminderCount = attendance.reminder_count || 0;

        for (let i = currentReminderCount; i < reminderMinutes.length; i++) {
          if (minutesSinceWorkEnd >= reminderMinutes[i]) {
            // ส่งการแจ้งเตือน
            const reminderMessage = `⏰ เตือนความจำ - ยังไม่ได้เช็คเอาท์

👤 ${attendance.employee.name}
📅 ${format(now, "d MMMM yyyy", { locale: th })}
🕐 เช็คอิน: ${format(clockInDate, "HH:mm น.")}
❓ เช็คเอาท์: ยังไม่ได้เช็ค

กรุณาเช็คเอาท์เพื่อบันทึกเวลาทำงานของคุณ

💡 หากลืมเช็คเอาท์ ระบบจะบันทึกเวลา ${settings.auto_checkout_time || "18:00"} น. อัตโนมัติ`;

            await sendLineMessage(reminderMessage, attendance.employee.line_user_id);

            // บันทึกการส่งการแจ้งเตือน
            await supabaseServer.from("checkout_reminders").insert({
              attendance_id: attendance.id,
              employee_id: attendance.employee_id,
              reminder_number: i + 1,
              sent_via: "line",
            });

            // อัพเดทจำนวนการแจ้งเตือนที่ส่งแล้ว
            await supabaseServer
              .from("attendance_logs")
              .update({ reminder_count: i + 1 })
              .eq("id", attendance.id);

            results.reminders_sent++;
          }
        }
      }

      // Auto Check-out
      if (autoCheckoutEnabled) {
        const delayHours = parseInt(settings.auto_checkout_delay_hours || "4");

        if (hoursSinceWorkEnd >= delayHours) {
          // สร้างเวลาเช็คเอาท์ตามที่ตั้งค่าไว้
          const autoCheckoutTime = settings.auto_checkout_time || "18:00";
          const [checkoutHour, checkoutMinute] = autoCheckoutTime.split(":").map(Number);
          const checkoutDate = new Date(clockInDate);
          checkoutDate.setHours(checkoutHour, checkoutMinute, 0, 0);

          // คำนวณ total_hours
          const diffMs = checkoutDate.getTime() - clockInDate.getTime();
          const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

          // ทำ Auto Check-out
          await supabaseServer
            .from("attendance_logs")
            .update({
              clock_out_time: checkoutDate.toISOString(),
              total_hours: totalHours,
              auto_checkout: true,
              auto_checkout_reason: `ไม่ได้เช็คเอาท์ภายใน ${delayHours} ชั่วโมงหลังเวลาเลิกงาน`,
            })
            .eq("id", attendance.id);

          // สร้าง Anomaly
          await supabaseServer.from("attendance_anomalies").insert({
            attendance_id: attendance.id,
            employee_id: attendance.employee_id,
            date: today,
            anomaly_type: "auto_checkout",
            description: `Auto Check-out เวลา ${autoCheckoutTime} น. - ไม่ได้เช็คเอาท์ภายใน ${delayHours} ชั่วโมงหลังเวลาเลิกงาน`,
            status: "pending",
          });

          results.auto_checkouts++;
          results.anomalies_created++;

          // แจ้ง Admin
          if (settings.notify_admin_on_auto_checkout === "true") {
            const adminMessage = `🤖 Auto Check-out

👤 ${attendance.employee?.name}
📅 ${format(now, "d MMMM yyyy", { locale: th })}
🕐 เช็คอิน: ${format(clockInDate, "HH:mm น.")}
⏰ เช็คเอาท์ (Auto): ${autoCheckoutTime} น.

⚠️ พนักงานไม่ได้เช็คเอาท์ภายใน ${delayHours} ชั่วโมง
กรุณาตรวจสอบที่หน้า "ตรวจสอบความผิดปกติ"`;

            await sendLineMessage(adminMessage);
          }
        }
      }
    }

    return Response.json({
      success: true,
      message: "Auto checkout process completed",
      results,
    });
  } catch (error: any) {
    console.error("Error in auto checkout:", error);
    return Response.json(
      { error: error.message || "Auto checkout failed" },
      { status: 500 }
    );
  }
}

// GET endpoint สำหรับตรวจสอบสถานะ
export async function GET() {
  try {
    const today = format(new Date(), "yyyy-MM-dd");

    // ทดสอบการเชื่อมต่อ database
    const { data: testData, error: testError } = await supabaseServer
      .from("attendance_logs")
      .select("id")
      .limit(1);

    if (testError) {
      return Response.json({
        status: "error",
        message: "Database connection failed",
        error: testError.message,
        hint: "Check SUPABASE_SERVICE_ROLE_KEY environment variable",
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }

    // ดึงข้อมูลสำหรับแสดงสถานะ
    const { data: pendingData } = await supabaseServer
      .from("attendance_logs")
      .select("id")
      .eq("work_date", today)
      .is("clock_out_time", null);

    const { data: settingsData } = await supabaseServer
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["auto_checkout_enabled", "reminder_enabled"]);

    const settings: Record<string, string> = {};
    settingsData?.forEach((item: any) => {
      settings[item.setting_key] = item.setting_value;
    });

    return Response.json({
      status: "ok",
      message: "Auto checkout API is running",
      database: "connected",
      auto_checkout_enabled: settings.auto_checkout_enabled === "true",
      reminder_enabled: settings.reminder_enabled === "true",
      pending_checkouts_today: pendingData?.length || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return Response.json({
      status: "error",
      message: error.message || "Unknown error",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

