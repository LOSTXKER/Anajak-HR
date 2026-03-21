import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin, handleAuthError, AuthResult } from "@/lib/auth/api-middleware";
import { z } from "zod";

const cancelRequestSchema = z.object({
  requestId: z.string().uuid(),
  requestType: z.enum(["ot", "leave", "wfh", "late", "field_work"]),
  cancelReason: z.string().min(1, "กรุณาระบุเหตุผลในการยกเลิก"),
  currentStatus: z.string().optional(),
  employeeId: z.string().uuid().optional(),
});

const tableMap: Record<string, string> = {
  ot: "ot_requests",
  leave: "leave_requests",
  wfh: "wfh_requests",
  late: "late_requests",
  field_work: "field_work_requests",
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export async function POST(request: NextRequest) {
  let auth: AuthResult;
  try {
    auth = await requireAdmin(request);
  } catch (error) {
    return handleAuthError(error);
  }

  try {
    const body = await request.json();
    const parsed = cancelRequestSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { requestId, requestType, cancelReason, currentStatus, employeeId } = parsed.data;
    const table = tableMap[requestType];
    const adminId = auth.user.id;

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from(table)
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "ไม่พบคำขอที่ต้องการยกเลิก" }, { status: 404 });
    }

    const status = existing.status;
    if (!["pending", "approved", "completed"].includes(status)) {
      return NextResponse.json(
        { error: `ไม่สามารถยกเลิกคำขอที่มีสถานะ "${status}" ได้` },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from(table)
      .update({
        status: "cancelled",
        cancelled_by: adminId,
        cancelled_at: new Date().toISOString(),
        cancel_reason: cancelReason.trim(),
      })
      .eq("id", requestId);

    if (updateError) {
      console.error("Cancel request DB error:", updateError);
      return NextResponse.json(
        { error: updateError.message || "ไม่สามารถอัปเดตสถานะได้" },
        { status: 500 }
      );
    }

    // Restore leave balance when cancelling an approved leave
    if (requestType === "leave" && status === "approved") {
      try {
        const leaveType = existing.leave_type as string;
        const year = new Date(existing.start_date).getFullYear();
        let daysToRestore = 0;

        if (existing.is_half_day) {
          daysToRestore = 0.5;
        } else {
          const start = new Date(existing.start_date);
          const end = new Date(existing.end_date);
          daysToRestore = Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
        }

        const columnMap: Record<string, { used: string; remaining: string }> = {
          annual: { used: "annual_leave_used", remaining: "annual_leave_remaining" },
          sick: { used: "sick_leave_used", remaining: "sick_leave_remaining" },
          personal: { used: "personal_leave_used", remaining: "personal_leave_remaining" },
        };

        const cols = columnMap[leaveType];
        if (cols) {
          const { data: balance } = await supabaseAdmin
            .from("leave_balances")
            .select("*")
            .eq("employee_id", existing.employee_id)
            .eq("year", year)
            .maybeSingle();

          if (balance) {
            const currentUsed = (balance as any)[cols.used] || 0;
            const currentRemaining = (balance as any)[cols.remaining] || 0;
            await supabaseAdmin
              .from("leave_balances")
              .update({
                [cols.used]: Math.max(0, currentUsed - daysToRestore),
                [cols.remaining]: currentRemaining + daysToRestore,
              })
              .eq("employee_id", existing.employee_id)
              .eq("year", year);
          }
        }
      } catch (balanceError) {
        console.error("Error restoring leave balance:", balanceError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "ยกเลิกคำขอสำเร็จ",
    });
  } catch (error: any) {
    console.error("Cancel request API error:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาดในการยกเลิกคำขอ" },
      { status: 500 }
    );
  }
}
