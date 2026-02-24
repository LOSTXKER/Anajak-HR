import { NextRequest } from "next/server";
import { requireAdmin, handleAuthError, withAuth } from "@/lib/auth/api-middleware";
import { calculateAllAutoMetrics, getAutoMetrics, calculateAutoMetrics } from "@/lib/services/kpi.service";

export const GET = withAuth(async (request: NextRequest, auth) => {
  const periodId = request.nextUrl.pathname.split("/").pop()!;
  const employeeId = request.nextUrl.searchParams.get("employee_id") || auth.user.id;

  try {
    const metrics = await getAutoMetrics(employeeId, periodId);
    return Response.json({ data: metrics });
  } catch (error) {
    console.error("Error fetching auto metrics:", error);
    return Response.json({ error: "ไม่สามารถดึงข้อมูลตัวชี้วัดได้" }, { status: 500 });
  }
});

export async function POST(request: NextRequest) {
  let auth;
  try {
    auth = await requireAdmin(request);
  } catch (error) {
    return handleAuthError(error);
  }

  const periodId = request.nextUrl.pathname.split("/").pop()!;

  try {
    const body = await request.json().catch(() => ({}));
    const employeeId = body.employee_id;

    if (employeeId) {
      const metrics = await calculateAutoMetrics(employeeId, periodId);
      return Response.json({ data: metrics, message: "คำนวณเสร็จสิ้น" });
    }

    const count = await calculateAllAutoMetrics(periodId);
    return Response.json({
      data: { calculated_count: count },
      message: `คำนวณตัวชี้วัดสำเร็จ ${count} คน`,
    });
  } catch (error) {
    console.error("Error calculating auto metrics:", error);
    return Response.json({ error: "ไม่สามารถคำนวณตัวชี้วัดได้" }, { status: 500 });
  }
}
