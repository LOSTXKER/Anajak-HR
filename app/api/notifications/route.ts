import { NextRequest } from "next/server";
import {
  sendLineMessage,
  formatOTApprovalMessage,
  formatLeaveApprovalMessage,
  formatWFHApprovalMessage,
} from "@/lib/line/messaging";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    let message = "";
    let success = false;

    switch (type) {
      case "ot_approval":
        message = await formatOTApprovalMessage(
          data.employeeName,
          format(new Date(data.date), "d MMMM yyyy", { locale: th }),
          format(new Date(data.startTime), "HH:mm"),
          format(new Date(data.endTime), "HH:mm"),
          data.approved
        );
        success = await sendLineMessage(message);
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

