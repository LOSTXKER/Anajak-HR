import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { sendLineMessage, formatCheckOutMessage } from "@/lib/line/messaging";
import { requireAuth, handleAuthError } from "@/lib/auth/api-middleware";

export async function POST(request: NextRequest) {
  // ตรวจสอบว่ามี auth token จริง (validate JWT)
  try {
    await requireAuth(request);
  } catch (authError) {
    return handleAuthError(authError);
  }

  try {
    const body = await request.json();
    const { employeeName, time, totalHours, location, photoUrl } = body;

    console.debug("[Check-out Notification] Request:", { employeeName, time, totalHours });

    const { data: settings } = await supabaseServer
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["enable_checkout_notifications", "enable_notifications", "enable_line_photo_notifications"]);

    if (!settings || settings.length === 0) {
      return Response.json({ error: "Settings not found" }, { status: 500 });
    }

    const settingsMap: Record<string, string> = {};
    settings.forEach((item: { setting_key: string; setting_value: string }) => {
      settingsMap[item.setting_key] = item.setting_value;
    });

    if (settingsMap.enable_checkout_notifications !== "true" || 
        settingsMap.enable_notifications !== "true") {
      console.debug("[Check-out Notification] Notifications disabled");
      return Response.json({ error: "Notifications disabled" }, { status: 503 });
    }

    const message = await formatCheckOutMessage(employeeName, time, totalHours, location);
    const includePhoto = settingsMap.enable_line_photo_notifications !== "false";
    const success = await sendLineMessage(message, undefined, undefined, includePhoto ? photoUrl : undefined);

    if (!success) {
      return Response.json({ error: "Failed to send notification" }, { status: 500 });
    }
    return Response.json({ success, message: "Notification sent" });

  } catch (error: any) {
    console.error("[Check-out Notification] Error:", error);
    return Response.json(
      { error: error.message || "Failed to send notification" },
      { status: 500 }
    );
  }
}

