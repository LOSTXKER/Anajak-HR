import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  sendPushToEmployees,
  sendPushToAllEmployees,
  PushNotificationPayload,
} from "@/lib/push/send";
import { withAdmin } from "@/lib/auth/api-middleware";

export const POST = withAdmin(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { title, message, target_type, target_branch_id, announcement_id } = body;

    if (!title || !message) {
      return Response.json(
        { error: "title and message are required" },
        { status: 400 }
      );
    }

    const payload: PushNotificationPayload = {
      title: `📢 ${title}`,
      body: message,
      data: {
        url: "/announcements",
        action: "announcement",
        announcement_id,
      },
      tag: announcement_id ? `announcement-${announcement_id}` : "announcement",
      requireInteraction: true,
    };

    let result: { sent: number; failed: number };

    if (target_type === "branch" && target_branch_id) {
      const { data: employees, error } = await supabaseServer
        .from("push_subscriptions")
        .select("employee_id, employees!inner(branch_id)")
        .eq("employees.branch_id", target_branch_id);

      if (error || !employees || employees.length === 0) {
        return Response.json({
          success: true,
          sent: 0,
          failed: 0,
          message: "No subscribed employees found for this branch",
        });
      }

      const employeeIds = employees.map((e: any) => e.employee_id);
      result = await sendPushToEmployees(employeeIds, payload);
    } else {
      result = await sendPushToAllEmployees(payload);
    }

    return Response.json({
      success: true,
      ...result,
      message: `Push sent to ${result.sent} employee(s)`,
    });
  } catch (error: unknown) {
    console.error("Error in send-announcement push endpoint:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to send push notifications";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
});
