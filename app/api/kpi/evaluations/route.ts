import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth/api-middleware";
import { getEvaluation, submitEvaluation } from "@/lib/services/kpi.service";

export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const periodId = request.nextUrl.searchParams.get("period_id");
    const employeeId = request.nextUrl.searchParams.get("employee_id") || auth.user.id;
    const evaluationType = request.nextUrl.searchParams.get("type") || "self";

    if (!periodId) {
      return Response.json({ error: "กรุณาระบุ period_id" }, { status: 400 });
    }

    if (
      employeeId !== auth.user.id &&
      !["admin", "supervisor"].includes(auth.employee.role || "")
    ) {
      return Response.json({ error: "ไม่มีสิทธิ์ดูข้อมูลนี้" }, { status: 403 });
    }

    const evaluation = await getEvaluation(employeeId, periodId, evaluationType);
    return Response.json({ data: evaluation });
  } catch (error) {
    console.error("Error fetching evaluation:", error);
    return Response.json({ error: "ไม่สามารถดึงข้อมูลการประเมินได้" }, { status: 500 });
  }
});

export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json();
    const { isDraft, ...evalData } = body;

    if (evalData.evaluation_type === "supervisor" && !["admin", "supervisor"].includes(auth.employee.role || "")) {
      return Response.json({ error: "เฉพาะหัวหน้าหรือ Admin เท่านั้นที่ประเมินได้" }, { status: 403 });
    }

    const evaluation = await submitEvaluation(
      {
        ...evalData,
        evaluator_id: auth.user.id,
        employee_id: evalData.employee_id || auth.user.id,
      },
      isDraft
    );

    return Response.json({ data: evaluation }, { status: 201 });
  } catch (error) {
    console.error("Error submitting evaluation:", error);
    return Response.json({ error: "ไม่สามารถบันทึกการประเมินได้" }, { status: 500 });
  }
});
