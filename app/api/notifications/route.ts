import { NextRequest } from "next/server";
import {
  sendLineMessage,
  formatOTApprovalMessage,
  formatLeaveApprovalMessage,
  formatWFHApprovalMessage,
  formatEarlyCheckoutMessage,
  getLineSettings,
} from "@/lib/line/messaging";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { supabaseServer } from "@/lib/supabase/server";
import { withAuth } from "@/lib/auth/api-middleware";

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { type, data } = body;

    console.debug("[Notifications API] Received request:", { type, data });

    // Get notification settings
    const { data: settingsData } = await supabaseServer
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", [
        "enable_notifications",
        // OT settings
        "ot_notify_on_request",
        "ot_notify_on_approval",
        "ot_notify_on_start",
        "ot_notify_on_end",
        // New settings for other notification types
        "enable_leave_notifications",
        "enable_wfh_notifications",
        "enable_late_notifications",
        "enable_fieldwork_notifications",
        "enable_announcement_notifications",
        "enable_employee_registration_notifications",
        "enable_anomaly_notifications",
      ]);

    const settingsMap: Record<string, string> = {};
    settingsData?.forEach((s: { setting_key: string; setting_value: string }) => {
      settingsMap[s.setting_key] = s.setting_value;
    });

    // Check global notification toggle
    if (settingsMap.enable_notifications !== "true") {
      console.debug("[Notifications API] Global notifications disabled");
      return Response.json({ error: "Notifications disabled" }, { status: 503 });
    }

    let message = "";
    let success = false;

    switch (type) {
      // ==================== OT Notifications ====================
      case "new_ot_request":
        if (settingsMap.ot_notify_on_request !== "false") {
          const dateStr = data.date ? format(new Date(data.date), "d MMMM yyyy", { locale: th }) : "ไม่ระบุ";
          message = `📋 คำขอ OT ใหม่

👤 พนักงาน: ${data.employeeName || "ไม่ระบุ"}
📅 วันที่: ${dateStr}
⏰ เวลา: ${data.startTime || "ไม่ระบุ"} - ${data.endTime || "ไม่ระบุ"}

กรุณาตรวจสอบและอนุมัติ`;
          success = await sendLineMessage(message);
        }
        break;

      case "ot_approval":
        if (settingsMap.ot_notify_on_approval !== "false") {
          console.debug("[Notifications API] Processing OT approval...");
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
          } catch (formatError: unknown) {
            console.error("[Notifications API] Error formatting OT message:", formatError);
            message = `🔔 แจ้งเตือน OT: ${data.employeeName} - ${data.approved ? "อนุมัติแล้ว" : "ปฏิเสธ"}`;
          }
          success = await sendLineMessage(message);
        }
        break;

      case "ot_start":
        if (settingsMap.ot_notify_on_start !== "false") {
          const timeStr = data.time || format(new Date(), "HH:mm");
          message = `🟢 เริ่มทำ OT

👤 พนักงาน: ${data.employeeName || "ไม่ระบุ"}
⏰ เวลาเริ่ม: ${timeStr}
📍 สถานที่: ${data.location || "ไม่ระบุ"}

กำลังทำ OT...`;
          success = await sendLineMessage(message);
        }
        break;

      case "ot_end":
        if (settingsMap.ot_notify_on_end !== "false") {
          const timeStr = data.time || format(new Date(), "HH:mm");
          const hours = data.totalHours ? `${data.totalHours.toFixed(1)} ชั่วโมง` : "ไม่ระบุ";
          message = `🔴 จบ OT

👤 พนักงาน: ${data.employeeName || "ไม่ระบุ"}
⏰ เวลาจบ: ${timeStr}
⏱️ รวม OT: ${hours}
📍 สถานที่: ${data.location || "ไม่ระบุ"}

OT เสร็จสิ้น`;
          success = await sendLineMessage(message);
        }
        break;

      // ==================== Leave Notifications ====================
      case "new_leave_request":
        if (settingsMap.enable_leave_notifications === "true") {
          const leaveTypeLabels: Record<string, string> = {
            sick: "ลาป่วย", personal: "ลากิจ", annual: "ลาพักร้อน",
            maternity: "ลาคลอด", military: "ลากรณีทหาร", other: "อื่นๆ",
          };
          const leaveLabel = leaveTypeLabels[data.leaveType] || data.leaveType;
          const startDateStr = data.startDate ? format(new Date(data.startDate), "d MMMM yyyy", { locale: th }) : "ไม่ระบุ";
          const endDateStr = data.endDate ? format(new Date(data.endDate), "d MMMM yyyy", { locale: th }) : "ไม่ระบุ";
          const dateRange = startDateStr === endDateStr ? startDateStr : `${startDateStr} - ${endDateStr}`;
          
          message = `📋 คำขอลางานใหม่

👤 พนักงาน: ${data.employeeName || "ไม่ระบุ"}
📝 ประเภท: ${leaveLabel}
📅 วันที่: ${dateRange}

กรุณาตรวจสอบและอนุมัติ`;
          success = await sendLineMessage(message);
        }
        break;

      case "leave_approval":
        if (settingsMap.enable_leave_notifications === "true") {
          const leaveStartStr = data.startDate ? format(new Date(data.startDate), "d MMMM yyyy", { locale: th }) : "ไม่ระบุ";
          const leaveEndStr = data.endDate ? format(new Date(data.endDate), "d MMMM yyyy", { locale: th }) : "ไม่ระบุ";
          message = await formatLeaveApprovalMessage(
            data.employeeName,
            data.leaveType,
            leaveStartStr,
            leaveEndStr,
            data.approved
          );
          success = await sendLineMessage(message);
        }
        break;

      // ==================== WFH Notifications ====================
      case "new_wfh_request":
        if (settingsMap.enable_wfh_notifications === "true") {
          const wfhDateStr = data.date ? format(new Date(data.date), "d MMMM yyyy", { locale: th }) : "ไม่ระบุ";
          message = `📋 คำขอ WFH ใหม่

👤 พนักงาน: ${data.employeeName || "ไม่ระบุ"}
🏠 Work From Home
📅 วันที่: ${wfhDateStr}

กรุณาตรวจสอบและอนุมัติ`;
          success = await sendLineMessage(message);
        }
        break;

      case "wfh_approval":
        if (settingsMap.enable_wfh_notifications === "true") {
          const wfhApprovalDateStr = data.date ? format(new Date(data.date), "d MMMM yyyy", { locale: th }) : "ไม่ระบุ";
          message = await formatWFHApprovalMessage(
            data.employeeName,
            wfhApprovalDateStr,
            data.approved
          );
          success = await sendLineMessage(message);
        }
        break;

      // ==================== Late Request Notifications ====================
      case "late_request":
        if (settingsMap.enable_late_notifications === "true") {
          const lateDateStr = data.date ? format(new Date(data.date), "d MMMM yyyy", { locale: th }) : "ไม่ระบุ";
          message = `📋 คำขออนุมัติมาสายใหม่

👤 พนักงาน: ${data.employeeName || "ไม่ระบุ"}
📅 วันที่: ${lateDateStr}
⏰ มาสาย: ${data.lateMinutes || 0} นาที

กรุณาตรวจสอบและอนุมัติ`;
          success = await sendLineMessage(message);
        }
        break;

      case "late_approval":
        if (settingsMap.enable_late_notifications === "true") {
          const lateDateStr2 = data.date ? format(new Date(data.date), "d MMMM yyyy", { locale: th }) : "ไม่ระบุ";
          const lateStatus = data.approved ? "✅ อนุมัติแล้ว" : "❌ ปฏิเสธ";
          message = `🔔 แจ้งเตือนคำขอมาสาย

👤 พนักงาน: ${data.employeeName || "ไม่ระบุ"}
📅 วันที่: ${lateDateStr2}
⏰ มาสาย: ${data.lateMinutes || 0} นาที
📋 สถานะ: ${lateStatus}

${data.approved ? "คำขอมาสายได้รับการอนุมัติ" : "กรุณาติดต่อหัวหน้างานเพื่อสอบถามเหตุผล"}`;
          success = await sendLineMessage(message);
        }
        break;

      // ==================== Field Work Notifications ====================
      case "field_work_request":
        if (settingsMap.enable_fieldwork_notifications === "true") {
          const fwDateStr = data.date ? format(new Date(data.date), "d MMMM yyyy", { locale: th }) : "ไม่ระบุ";
          message = `📋 คำของานนอกสถานที่ใหม่

👤 พนักงาน: ${data.employeeName || "ไม่ระบุ"}
📍 งานนอกสถานที่
📅 วันที่: ${fwDateStr}
🏢 สถานที่: ${data.location || "ไม่ระบุ"}

กรุณาตรวจสอบและอนุมัติ`;
          success = await sendLineMessage(message);
        }
        break;

      case "field_work_approval":
        if (settingsMap.enable_fieldwork_notifications === "true") {
          const fwDateStr2 = data.date ? format(new Date(data.date), "d MMMM yyyy", { locale: th }) : "ไม่ระบุ";
          const fwStatus = data.approved ? "✅ อนุมัติแล้ว" : "❌ ปฏิเสธ";
          message = `🔔 แจ้งเตือนคำของานนอกสถานที่

👤 พนักงาน: ${data.employeeName || "ไม่ระบุ"}
📅 วันที่: ${fwDateStr2}
🏢 สถานที่: ${data.location || "ไม่ระบุ"}
📋 สถานะ: ${fwStatus}

${data.approved ? "คำขอได้รับการอนุมัติ สามารถทำงานนอกสถานที่ได้" : "กรุณาติดต่อหัวหน้างานเพื่อสอบถามเหตุผล"}`;
          success = await sendLineMessage(message);
        }
        break;

      // ==================== Announcement Notifications ====================
      case "announcement":
        if (settingsMap.enable_announcement_notifications === "true") {
          message = `📢 ประกาศใหม่

📌 ${data.title || "ไม่มีหัวข้อ"}

${data.content || ""}

${data.isPinned ? "📍 ปักหมุดประกาศนี้" : ""}`;
          success = await sendLineMessage(message);
        }
        break;

      // ==================== Employee Registration ====================
      case "new_employee":
        if (settingsMap.enable_employee_registration_notifications === "true") {
          message = `👤 พนักงานใหม่ลงทะเบียน

📧 อีเมล: ${data.email || "ไม่ระบุ"}
👤 ชื่อ: ${data.name || "ไม่ระบุ"}
🏢 สาขา: ${data.branch || "ไม่ระบุ"}

กรุณาตรวจสอบและอนุมัติบัญชีในระบบ`;
          success = await sendLineMessage(message);
        }
        break;

      // ==================== Anomaly Notifications ====================
      case "anomaly":
        if (settingsMap.enable_anomaly_notifications === "true") {
          const anomalyLabels: Record<string, string> = {
            auto_checkout: "ลืมเช็คเอาท์ (Auto checkout)",
            early_checkout: "เช็คเอาท์ก่อนเวลา",
            late_checkin: "มาสาย",
            missing_checkout: "ไม่มีการเช็คเอาท์",
            location_mismatch: "ตำแหน่ง GPS ไม่ตรง",
            other: "อื่นๆ",
          };
          const anomalyLabel = anomalyLabels[data.anomalyType] || data.anomalyType;
          const anomalyDateStr = data.date ? format(new Date(data.date), "d MMMM yyyy", { locale: th }) : "ไม่ระบุ";
          
          message = `⚠️ แจ้งเตือน Attendance ผิดปกติ

👤 พนักงาน: ${data.employeeName || "ไม่ระบุ"}
📅 วันที่: ${anomalyDateStr}
⚠️ ประเภท: ${anomalyLabel}
📝 รายละเอียด: ${data.description || "ไม่มีรายละเอียด"}

กรุณาตรวจสอบในระบบ`;
          success = await sendLineMessage(message);
        }
        break;

      // ==================== Early Checkout ====================
      case "early_checkout":
        if (settingsMap.enable_anomaly_notifications === "true") {
          message = await formatEarlyCheckoutMessage(
            data.employeeName,
            data.time,
            data.totalHours,
            data.expectedTime,
            data.location
          );
          success = await sendLineMessage(message);
        }
        break;

      default:
        return Response.json({ error: "Invalid notification type" }, { status: 400 });
    }

    if (!success) {
      return Response.json({ success: false, message: "Notification skipped" });
    }
    return Response.json({ success, message: "Notification sent" });
  } catch (error: unknown) {
    console.error("Error sending notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to send notification";
    return Response.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
});
