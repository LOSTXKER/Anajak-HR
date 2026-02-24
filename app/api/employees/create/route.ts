import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  requireAdmin,
  handleAuthError,
  AuthResult,
} from "@/lib/auth/api-middleware";
import { z } from "zod";

const createEmployeeSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อ"),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
  phone: z.string().min(9, "เบอร์โทรต้องมีอย่างน้อย 9 หลัก").max(15),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
  role: z.enum(["staff", "admin", "supervisor"], { message: "ตำแหน่งไม่ถูกต้อง" }),
  branch_id: z.string().uuid().nullable().optional(),
  base_salary: z.number().min(0).optional().default(0),
  commission: z.number().min(0).optional().default(0),
  is_system_account: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  let auth: AuthResult;
  try {
    auth = await requireAdmin(request);
  } catch (error) {
    return handleAuthError(error);
  }

  try {
    const body = await request.json();
    const parsed = createEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { name, email, phone, password, role, branch_id, base_salary, commission, is_system_account } = parsed.data;

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
        branch_id: branch_id || null,
        base_salary: base_salary || 15000,
        commission: commission || 0,
        is_system_account: is_system_account || false,
        account_status: "approved",
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

