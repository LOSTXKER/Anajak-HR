import { NextRequest } from "next/server";
import { sendPushToEmployee, PushNotificationPayload } from "@/lib/push/send";
import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";

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

    // Verify admin permission
    const cookieStore = cookies();
    const supabase = supabaseServer(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: admin } = await supabase
      .from("employees")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!admin || admin.role !== 'admin') {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

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

