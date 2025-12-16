import { NextRequest } from "next/server";
import { sendPushToEmployee, PushNotificationPayload } from "@/lib/push/send";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeId, title, body: messageBody, data, icon, badge, tag, requireInteraction } = body;

    if (!employeeId || !title || !messageBody) {
      return Response.json(
        { error: "employeeId, title, and body are required" },
        { status: 400 }
      );
    }

    // Note: Using service role - no auth check needed for server-side API
    // In production, you should verify the request is from admin
    // (e.g., check API key, session token, etc.)

    // Send push notification
    const payload: PushNotificationPayload = {
      title,
      body: messageBody,
      icon,
      badge,
      data,
      tag,
      requireInteraction,
    };

    const success = await sendPushToEmployee(employeeId, payload);

    if (success) {
      return Response.json({ 
        success: true,
        message: "Push notification sent successfully" 
      });
    } else {
      return Response.json({ 
        success: false,
        message: "Failed to send push notification. Employee may not have subscribed." 
      }, { status: 404 });
    }

  } catch (error: any) {
    console.error("Error in push send endpoint:", error);
    return Response.json(
      { error: error.message || "Failed to send push notification" },
      { status: 500 }
    );
  }
}

