import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, password, role } = body;

    // Validate input
    if (!name || !email || !phone || !password || !role) {
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
        role,
        base_salary_rate: 20000,
        ot_rate_1_5x: 1.5,
        ot_rate_2x: 2.0,
        account_status: "approved", // Admin สร้างเอง ไม่ต้องรออนุมัติ
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

    return NextResponse.json(
      {
        success: true,
        message: "เพิ่มพนักงานสำเร็จ",
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create employee API error:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาดในการเพิ่มพนักงาน" },
      { status: 500 }
    );
  }
}

