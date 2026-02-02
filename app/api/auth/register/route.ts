import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendLineMessage } from "@/lib/line/messaging";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, password } = body;

    // Validate input
    if (!name || !email || !phone || !password) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบถ้วน" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" },
        { status: 400 }
      );
    }

    // เช็คว่าต้องอนุมัติบัญชีหรือไม่ และเช็คการตั้งค่าแจ้งเตือน
    let requireApproval = true; // Default to true
    let enableNotifications = false;
    let enableEmployeeRegistrationNotifications = false;
    try {
      const { data: settingsData } = await supabaseAdmin
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", [
          "require_account_approval",
          "enable_notifications",
          "enable_employee_registration_notifications",
        ]);

      if (settingsData) {
        const settingsMap: Record<string, string> = {};
        settingsData.forEach((s: { setting_key: string; setting_value: string }) => {
          settingsMap[s.setting_key] = s.setting_value;
        });
        
        requireApproval = settingsMap.require_account_approval !== "false";
        enableNotifications = settingsMap.enable_notifications === "true";
        enableEmployeeRegistrationNotifications = settingsMap.enable_employee_registration_notifications === "true";
      }
    } catch (e) {
      console.log("Could not fetch settings, using defaults");
    }

    // 1. สร้าง user ใน Auth (ใช้ Admin Client)
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto confirm
        user_metadata: {
          name,
        },
      });

    if (authError) {
      console.error("Auth error:", authError);

      if (authError.message.includes("already registered")) {
        return NextResponse.json(
          { error: "อีเมลนี้ถูกใช้งานแล้ว" },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: authError.message || "ไม่สามารถสร้างบัญชีได้" },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "ไม่สามารถสร้างบัญชีได้" },
        { status: 400 }
      );
    }

    // 2. เพิ่มข้อมูลใน employees table (ใช้ Admin Client ข้าม RLS)
    const { error: employeeError } = await supabaseAdmin
      .from("employees")
      .insert({
        id: authData.user.id,
        name,
        email,
        phone,
        role: "staff",
        base_salary_rate: 20000,
        ot_rate_1_5x: 1.5,
        ot_rate_2x: 2.0,
        account_status: requireApproval ? "pending" : "approved", // ตามการตั้งค่า
      });

    if (employeeError) {
      console.error("Employee insert error:", employeeError);

      // ถ้า insert employee ไม่ได้ ให้ลบ user ที่สร้างไปด้วย
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      return NextResponse.json(
        { error: "ไม่สามารถสร้างข้อมูลพนักงานได้" },
        { status: 400 }
      );
    }

    // Send LINE notification to admin about new registration
    // Only send if notifications are enabled AND employee registration notifications are enabled
    if (requireApproval && enableNotifications && enableEmployeeRegistrationNotifications) {
      try {
        const message = `👤 พนักงานใหม่ลงทะเบียน

📧 อีเมล: ${email}
👤 ชื่อ: ${name}
📱 โทร: ${phone}

กรุณาตรวจสอบและอนุมัติบัญชีในระบบ`;
        await sendLineMessage(message);
      } catch (notifError) {
        console.error("Error sending registration notification:", notifError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: requireApproval
          ? "สมัครสมาชิกสำเร็จ รอการอนุมัติจาก Admin"
          : "สมัครสมาชิกสำเร็จ",
        requireApproval,
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Register API error:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก" },
      { status: 500 }
    );
  }
}

