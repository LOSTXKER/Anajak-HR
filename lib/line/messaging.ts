/**
 * LINE Messaging API Integration
 * 
 * Settings are now configured via Admin Settings page (/admin/settings)
 * No need to edit .env.local manually!
 */

import { supabaseServer } from "@/lib/supabase/server";

const LINE_MESSAGING_API = "https://api.line.me/v2/bot/message";

interface LineMessage {
  type: string;
  text: string;
}

/**
 * Get LINE settings from database (server-side only)
 */
async function getLineSettings() {
  try {
    const { data, error } = await supabaseServer
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", [
        "line_channel_access_token",
        "line_recipient_id",
        "enable_notifications",
      ]);

    if (error) {
      console.error("Error fetching LINE settings:", error);
      return null;
    }

    if (!data) return null;

    const settings: any = {};
    data.forEach((item) => {
      settings[item.setting_key] = item.setting_value;
    });

    return settings;
  } catch (error) {
    console.error("Error fetching LINE settings:", error);
    return null;
  }
}

/**
 * Send push message via LINE Messaging API
 * @param message - Message text to send
 * @param to - Optional User ID or Group ID (uses database setting if not provided)
 * @param accessToken - Optional access token (uses database setting if not provided)
 * @returns Success status
 */
export async function sendLineMessage(
  message: string,
  to?: string,
  accessToken?: string
): Promise<boolean> {
  try {
    // Get settings from database if not provided
    const settings = await getLineSettings();

    if (!settings || settings.enable_notifications !== "true") {
      console.log("LINE notifications are disabled");
      return false;
    }

    const token = accessToken || settings.line_channel_access_token;
    const recipient = to || settings.line_recipient_id;

    if (!token) {
      console.warn("LINE Channel Access Token not configured");
      return false;
    }

    if (!recipient) {
      console.warn("LINE recipient (User ID or Group ID) not configured");
      return false;
    }

    const messages: LineMessage[] = [
      {
        type: "text",
        text: message,
      },
    ];

    const response = await fetch(`${LINE_MESSAGING_API}/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: recipient,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`LINE Messaging API error: ${JSON.stringify(error)}`);
    }

    return true;
  } catch (error) {
    console.error("Error sending LINE message:", error);
    return false;
  }
}

/**
 * Send multicast message to multiple users
 * @param userIds - Array of user IDs
 * @param message - Message text to send
 * @param accessToken - Optional access token (uses database setting if not provided)
 * @returns Success status
 */
export async function sendLineMulticast(
  userIds: string[],
  message: string,
  accessToken?: string
): Promise<boolean> {
  try {
    // Get settings from database if not provided
    const settings = await getLineSettings();

    if (!settings || settings.enable_notifications !== "true") {
      console.log("LINE notifications are disabled");
      return false;
    }

    const token = accessToken || settings.line_channel_access_token;

    if (!token) {
      console.warn("LINE Channel Access Token not configured");
      return false;
    }

    if (!userIds || userIds.length === 0) {
      console.warn("No user IDs provided");
      return false;
    }

    const messages: LineMessage[] = [
      {
        type: "text",
        text: message,
      },
    ];

    const response = await fetch(`${LINE_MESSAGING_API}/multicast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: userIds,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`LINE Messaging API error: ${JSON.stringify(error)}`);
    }

    return true;
  } catch (error) {
    console.error("Error sending LINE multicast:", error);
    return false;
  }
}

/**
 * Format OT approval notification
 */
export async function formatOTApprovalMessage(
  employeeName: string,
  date: string,
  startTime: string,
  endTime: string,
  approved: boolean
): Promise<string> {
  const templateKey = approved ? "line_msg_ot_approved" : "line_msg_ot_rejected";
  
  try {
    const { data } = await supabaseServer
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", templateKey)
      .single();

    if (data?.setting_value) {
      return data.setting_value
        .replace(/{employeeName}/g, employeeName)
        .replace(/{date}/g, date)
        .replace(/{startTime}/g, startTime)
        .replace(/{endTime}/g, endTime);
    }
  } catch (error) {
    console.error("Error fetching message template:", error);
  }

  // Fallback to default message
  const status = approved ? "✅ อนุมัติแล้ว" : "❌ ปฏิเสธ";
  return `🔔 แจ้งเตือนคำขอ OT

👤 พนักงาน: ${employeeName}
📅 วันที่: ${date}
⏰ เวลา: ${startTime} - ${endTime}
📋 สถานะ: ${status}

${approved ? "สามารถทำงาน OT ได้ตามเวลาที่ขออนุมัติ" : "กรุณาติดต่อหัวหน้างานเพื่อสอบถามเหตุผล"}`;
}

/**
 * Format leave approval notification
 */
export async function formatLeaveApprovalMessage(
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  approved: boolean
): Promise<string> {
  const templateKey = approved ? "line_msg_leave_approved" : "line_msg_leave_rejected";
  
  const leaveTypeLabels: Record<string, string> = {
    sick: "ลาป่วย",
    personal: "ลากิจ",
    annual: "ลาพักร้อน",
    maternity: "ลาคลอด",
    military: "ลากรณีทหาร",
    other: "อื่นๆ",
  };

  const leaveTypeLabel = leaveTypeLabels[leaveType] || leaveType;
  const dateRange = startDate !== endDate ? `${startDate} ถึง ${endDate}` : startDate;

  try {
    const { data } = await supabaseServer
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", templateKey)
      .single();

    if (data?.setting_value) {
      return data.setting_value
        .replace(/{employeeName}/g, employeeName)
        .replace(/{leaveType}/g, leaveTypeLabel)
        .replace(/{dateRange}/g, dateRange);
    }
  } catch (error) {
    console.error("Error fetching message template:", error);
  }

  // Fallback to default message
  const status = approved ? "✅ อนุมัติแล้ว" : "❌ ปฏิเสธ";
  return `🔔 แจ้งเตือนคำขอลา

👤 พนักงาน: ${employeeName}
📝 ประเภท: ${leaveTypeLabel}
📅 วันที่: ${dateRange}
📋 สถานะ: ${status}

${approved ? "ขอให้พักผ่อนให้เต็มที่" : "กรุณาติดต่อหัวหน้างานเพื่อสอบถามเหตุผล"}`;
}

/**
 * Format WFH approval notification
 */
export async function formatWFHApprovalMessage(
  employeeName: string,
  date: string,
  approved: boolean
): Promise<string> {
  const templateKey = approved ? "line_msg_wfh_approved" : "line_msg_wfh_rejected";

  try {
    const { data } = await supabaseServer
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", templateKey)
      .single();

    if (data?.setting_value) {
      return data.setting_value
        .replace(/{employeeName}/g, employeeName)
        .replace(/{date}/g, date);
    }
  } catch (error) {
    console.error("Error fetching message template:", error);
  }

  // Fallback to default message
  const status = approved ? "✅ อนุมัติแล้ว" : "❌ ปฏิเสธ";
  return `🔔 แจ้งเตือนคำขอ WFH

👤 พนักงาน: ${employeeName}
📅 วันที่: ${date}
🏠 Work From Home
📋 สถานะ: ${status}

${approved ? "อย่าลืมเช็คอิน-เช็คเอาท์ตามปกติ (ไม่ต้องเปิด GPS)" : "กรุณาติดต่อหัวหน้างานเพื่อสอบถามเหตุผล"}`;
}

/**
 * Format late check-in reminder
 */
export function formatLateCheckInReminder(employeeName: string) {
  return `⏰ เตือนความจำ

👤 ${employeeName}
คุณยังไม่ได้เช็คอินเข้างานวันนี้
กรุณาเช็คอินโดยเร็วที่สุด`;
}

/**
 * Format forgot check-out reminder
 */
export function formatForgotCheckOutReminder(employeeName: string) {
  return `⏰ เตือนความจำ

👤 ${employeeName}
คุณยังไม่ได้เช็คเอาท์เลิกงาน
กรุณาเช็คเอาท์เพื่อบันทึกเวลาทำงาน`;
}

