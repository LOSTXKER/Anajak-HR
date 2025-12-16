import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { sendCheckinReminders, sendCheckoutReminders } from "@/lib/push/send";
import { format } from "date-fns";

/**
 * Scheduled Push Notification Reminders
 * Should be called every minute by Vercel Cron
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Push Reminders] Starting scheduled check...');

    const now = new Date();
    const currentTime = format(now, 'HH:mm'); // "08:30"
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday

    // Get system settings
    const { data: settings } = await supabaseServer
      .from("system_settings")
      .select("*")
      .in("setting_key", ["work_start_time", "work_end_time"]);

    if (!settings || settings.length === 0) {
      console.log('[Push Reminders] No system settings found');
      return Response.json({ success: false, message: "Settings not found" });
    }

    const settingsMap: Record<string, string> = {};
    settings.forEach(s => {
      settingsMap[s.setting_key] = s.setting_value;
    });

    const workStartTime = settingsMap.work_start_time || "08:30";
    const workEndTime = settingsMap.work_end_time || "17:30";

    console.log(`[Push Reminders] Current time: ${currentTime}, Work times: ${workStartTime} - ${workEndTime}`);

    // Check if today is a holiday
    const todayStr = format(now, 'yyyy-MM-dd');
    const { data: holidays } = await supabaseServer
      .from("holidays")
      .select("*")
      .eq("date", todayStr)
      .eq("is_active", true);

    if (holidays && holidays.length > 0) {
      console.log(`[Push Reminders] Today is a holiday (${holidays[0].name}), skipping reminders`);
      return Response.json({ 
        success: true, 
        message: "Skipped - Holiday",
        holiday: holidays[0].name
      });
    }

    // Check if today is weekend
    if (currentDay === 0 || currentDay === 6) {
      console.log('[Push Reminders] Today is weekend, skipping reminders');
      return Response.json({ 
        success: true, 
        message: "Skipped - Weekend" 
      });
    }

    // Send check-in reminder
    if (currentTime === workStartTime) {
      console.log('[Push Reminders] Sending check-in reminders...');
      await sendCheckinReminders();
      return Response.json({ 
        success: true, 
        message: "Check-in reminders sent",
        time: currentTime
      });
    }

    // Send check-out reminder
    if (currentTime === workEndTime) {
      console.log('[Push Reminders] Sending check-out reminders...');
      await sendCheckoutReminders();
      return Response.json({ 
        success: true, 
        message: "Check-out reminders sent",
        time: currentTime
      });
    }

    console.log('[Push Reminders] No reminders scheduled for this time');
    return Response.json({ 
      success: true, 
      message: "No reminders scheduled",
      currentTime,
      workStartTime,
      workEndTime
    });

  } catch (error: any) {
    console.error('[Push Reminders] Error:', error);
    return Response.json(
      { success: false, error: error.message || "Failed to process reminders" },
      { status: 500 }
    );
  }
}

// Allow GET for testing
export async function GET(request: NextRequest) {
  return POST(request);
}

