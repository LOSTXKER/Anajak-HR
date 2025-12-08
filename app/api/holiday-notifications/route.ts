import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { sendLineMessage, formatHolidayReminder, formatHolidayToday } from "@/lib/line/messaging";
import { format, addDays, parseISO } from "date-fns";
import { th } from "date-fns/locale";

/**
 * API route สำหรับเช็คและส่งแจ้งเตือนวันหยุด
 * ควรเรียกผ่าน Cron Job ทุกวันเวลา 09:00
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[Holiday Notifications] Starting holiday check...");

    // 1. เช็คว่าเปิดการแจ้งเตือนหรือไม่
    const { data: settings } = await supabaseServer
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", [
        "enable_holiday_notifications",
        "holiday_notification_days_before",
        "enable_notifications"
      ]);

    if (!settings) {
      return Response.json({ success: false, message: "Could not fetch settings" });
    }

    const settingsMap: Record<string, string> = {};
    settings.forEach((item: { setting_key: string; setting_value: string }) => {
      settingsMap[item.setting_key] = item.setting_value;
    });

    if (settingsMap.enable_holiday_notifications !== "true" || 
        settingsMap.enable_notifications !== "true") {
      console.log("[Holiday Notifications] Notifications disabled");
      return Response.json({ success: false, message: "Notifications disabled" });
    }

    const daysBeforeSetting = parseInt(settingsMap.holiday_notification_days_before || "1", 10);
    
    // 2. หาวันหยุดที่กำลังจะมาถึง
    const today = new Date();
    const checkDate = addDays(today, daysBeforeSetting);
    const checkDateStr = format(checkDate, "yyyy-MM-dd");
    const todayStr = format(today, "yyyy-MM-dd");

    console.log(`[Holiday Notifications] Checking for holidays on ${checkDateStr}`);

    const { data: upcomingHolidays } = await supabaseServer
      .from("holidays")
      .select("*")
      .eq("date", checkDateStr)
      .eq("is_active", true);

    const { data: todayHolidays } = await supabaseServer
      .from("holidays")
      .select("*")
      .eq("date", todayStr)
      .eq("is_active", true);

    const notificationsSent: string[] = [];

    // 3. ส่งแจ้งเตือนวันหยุดที่กำลังจะมาถึง (ล่วงหน้า)
    if (upcomingHolidays && upcomingHolidays.length > 0) {
      for (const holiday of upcomingHolidays) {
        console.log(`[Holiday Notifications] Upcoming holiday: ${holiday.name}`);
        
        const dateStr = format(parseISO(holiday.date), "d MMMM yyyy", { locale: th });
        const message = await formatHolidayReminder(
          holiday.name,
          dateStr,
          holiday.type,
          daysBeforeSetting
        );

        const success = await sendLineMessage(message);
        if (success) {
          notificationsSent.push(`Upcoming: ${holiday.name}`);
        }
      }
    }

    // 4. ส่งแจ้งเตือนวันหยุดวันนี้
    if (todayHolidays && todayHolidays.length > 0) {
      for (const holiday of todayHolidays) {
        console.log(`[Holiday Notifications] Today is a holiday: ${holiday.name}`);
        
        const message = await formatHolidayToday(holiday.name, holiday.type);
        const success = await sendLineMessage(message);
        
        if (success) {
          notificationsSent.push(`Today: ${holiday.name}`);
        }
      }
    }

    if (notificationsSent.length === 0) {
      console.log("[Holiday Notifications] No holidays to notify");
      return Response.json({ 
        success: true, 
        message: "No holidays to notify",
        checked: { checkDate: checkDateStr, today: todayStr }
      });
    }

    console.log(`[Holiday Notifications] Sent ${notificationsSent.length} notifications`);
    return Response.json({
      success: true,
      message: "Holiday notifications sent",
      notifications: notificationsSent
    });

  } catch (error: any) {
    console.error("[Holiday Notifications] Error:", error);
    return Response.json(
      { success: false, error: error.message || "Failed to send holiday notifications" },
      { status: 500 }
    );
  }
}

// Allow GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}

