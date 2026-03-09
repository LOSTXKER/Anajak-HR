import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  requireAdmin,
  handleAuthError,
  AuthResult,
} from "@/lib/auth/api-middleware";
import { z } from "zod";

const resetPasswordSchema = z.object({
  employeeId: z.string().uuid("รหัสพนักงานไม่ถูกต้อง"),
  newPassword: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
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
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { employeeId, newPassword } = parsed.data;

    // Verify employee exists and is not deleted
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from("employees")
      .select("id, name, email, deleted_at")
      .eq("id", employeeId)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลพนักงาน" },
        { status: 404 }
      );
    }

    if (employee.deleted_at) {
      return NextResponse.json(
        { error: "พนักงานคนนี้ถูกลบออกจากระบบแล้ว" },
        { status: 400 }
      );
    }

    // Update password via Supabase Admin
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(employeeId, {
        password: newPassword,
      });

    if (updateError) {
      console.error("Reset password error:", updateError);
      return NextResponse.json(
        { error: "ไม่สามารถรีเซ็ตรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `รีเซ็ตรหัสผ่านของ ${employee.name} สำเร็จ`,
    });
  } catch (error: any) {
    console.error("Admin reset password API error:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน" },
      { status: 500 }
    );
  }
}
