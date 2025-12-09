import { NextRequest } from "next/server";
import {
  sendLineMessage,
  formatOTApprovalMessage,
  formatLeaveApprovalMessage,
  formatWFHApprovalMessage,
  formatEarlyCheckoutMessage,
} from "@/lib/line/messaging";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    console.log("[Notifications API] Received request:", { type, data });

    let message = "";
    let success = false;

    switch (type) {
      case "ot_approval":
        console.log("[Notifications API] Processing OT approval...");
        try {
          const dateStr = data.date ? format(new Date(data.date), "d MMMM yyyy", { locale: th }) : "ไม่ระบุ";
          const startTimeStr = data.startTime ? format(new Date(data.startTime), "HH:mm") : "ไม่ระบุ";
          const endTimeStr = data.endTime ? format(new Date(data.endTime), "HH:mm") : "ไม่ระบุ";
          
          message = await formatOTApprovalMessage(
            data.employeeName || "ไม่ระบุชื่อ",
            dateStr,
            startTimeStr,
            endTimeStr,
            data.approved
          );
          console.log("[Notifications API] Message formatted:", message);
        } catch (formatError: any) {
          console.error("[Notifications API] Error formatting OT message:", formatError);
          message = `🔔 แจ้งเตือน OT: ${data.employeeName} - ${data.approved ? "อนุมัติแล้ว" : "ปฏิเสธ"}`;
        }
        success = await sendLineMessage(message);
        console.log("[Notifications API] LINE send result:", success);
        break;

      case "leave_approval":
        message = await formatLeaveApprovalMessage(
          data.employeeName,
          data.leaveType,
          format(new Date(data.startDate), "d MMMM yyyy", { locale: th }),
          format(new Date(data.endDate), "d MMMM yyyy", { locale: th }),
          data.approved
        );
        success = await sendLineMessage(message);
        break;

      case "wfh_approval":
        message = await formatWFHApprovalMessage(
          data.employeeName,
          format(new Date(data.date), "d MMMM yyyy", { locale: th }),
          data.approved
        );
        success = await sendLineMessage(message);
        break;

      case "early_checkout":
        message = await formatEarlyCheckoutMessage(
          data.employeeName,
          data.time,
          data.totalHours,
          data.expectedTime,
          data.location
        );
        success = await sendLineMessage(message);
        break;

      default:
        return Response.json({ error: "Invalid notification type" }, { status: 400 });
    }

    return Response.json({ success, message: "Notification sent" });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return Response.json(
      { error: error.message || "Failed to send notification" },
      { status: 500 }
    );
  }
}

