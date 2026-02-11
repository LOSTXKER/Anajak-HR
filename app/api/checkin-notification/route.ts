import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { sendLineMessage, formatCheckInMessage } from "@/lib/line/messaging";

export async function POST(request: NextRequest) {
  // ตรวจสอบว่ามี auth token (ป้องกันการเรียกจากภายนอก)
  const authHeader = request.headers.get("authorization");
  const cookieToken = request.cookies.get("sb-access-token")?.value;
  if (!authHeader && !cookieToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { employeeName, time, location, isLate } = body;

    console.log("[Check-in Notification] Request:", { employeeName, time, isLate });

    // เช็คว่าเปิดการแจ้งเตือนหรือไม่
    const { data: settings } = await supabaseServer
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["enable_checkin_notifications", "enable_notifications"]);

    if (!settings || settings.length === 0) {
      return Response.json({ success: false, message: "Settings not found" });
    }

    const settingsMap: Record<string, string> = {};
    settings.forEach((item: { setting_key: string; setting_value: string }) => {
      settingsMap[item.setting_key] = item.setting_value;
    });

    if (settingsMap.enable_checkin_notifications !== "true" || 
        settingsMap.enable_notifications !== "true") {
      console.log("[Check-in Notification] Notifications disabled");
      return Response.json({ success: false, message: "Notifications disabled" });
    }

    // Format และส่งข้อความ
    const message = await formatCheckInMessage(employeeName, time, location, isLate);
    const success = await sendLineMessage(message);

    return Response.json({ 
      success, 
      message: success ? "Notification sent" : "Failed to send notification" 
    });

  } catch (error: any) {
    console.error("[Check-in Notification] Error:", error);
    return Response.json(
      { success: false, error: error.message || "Failed to send notification" },
      { status: 500 }
    );
  }
}

