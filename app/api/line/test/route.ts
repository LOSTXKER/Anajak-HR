import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { withAdmin } from "@/lib/auth/api-middleware";
import { TH_TIMEZONE } from "@/lib/utils/date";

const LINE_MESSAGING_API = "https://api.line.me/v2/bot/message/push";

export const POST = withAdmin(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { token, to, message } = body;

    let accessToken = token;
    let recipient = to;

    if (!accessToken || !recipient) {
      const { data, error } = await supabaseServer
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["line_channel_access_token", "line_recipient_id"]);

      if (error) {
        console.error("Error fetching settings:", error);
        return Response.json(
          { success: false, error: "ไม่สามารถดึงการตั้งค่าได้" },
          { status: 500 }
        );
      }

      if (data) {
        data.forEach((item: any) => {
          if (item.setting_key === "line_channel_access_token") {
            accessToken = item.setting_value;
          } else if (item.setting_key === "line_recipient_id") {
            recipient = item.setting_value;
          }
        });
      }
    }

    if (!accessToken || !recipient) {
      return Response.json(
        { success: false, error: "กรุณาตั้งค่า LINE API ที่หน้าตั้งค่าหลักก่อน (Token และ Recipient ID)" },
        { status: 400 }
      );
    }

    const testMessage =
      message ||
      `🧪 ทดสอบระบบแจ้งเตือน LINE

✅ ระบบทำงานปกติ
📱 Anajak HR System
🕐 ${new Date().toLocaleString("th-TH", { timeZone: TH_TIMEZONE })}

หากคุณเห็นข้อความนี้ แสดงว่าการตั้งค่า LINE Messaging API สำเร็จแล้ว!`;

    const response = await fetch(LINE_MESSAGING_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: recipient,
        messages: [{ type: "text", text: testMessage }],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return Response.json(
        { success: false, error: error.message || "LINE API error" },
        { status: response.status }
      );
    }

    return Response.json({ success: true, message: "ส่งข้อความทดสอบสำเร็จ" });
  } catch (error: unknown) {
    console.error("Error testing LINE:", error);
    const errorMessage = error instanceof Error ? error.message : "เกิดข้อผิดพลาด";
    return Response.json({ success: false, error: errorMessage }, { status: 500 });
  }
});
