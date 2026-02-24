import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth/api-middleware";
import { getEvaluationById, submitEvaluation } from "@/lib/services/kpi.service";

export const GET = withAuth(async (request: NextRequest, auth) => {
  const id = request.nextUrl.pathname.split("/").pop()!;

  try {
    const evaluation = await getEvaluationById(id);
    if (!evaluation) {
      return Response.json({ error: "ไม่พบข้อมูลการประเมิน" }, { status: 404 });
    }

    if (
      evaluation.employee_id !== auth.user.id &&
      evaluation.evaluator_id !== auth.user.id &&
      !["admin", "supervisor"].includes(auth.employee.role || "")
    ) {
      return Response.json({ error: "ไม่มีสิทธิ์ดูข้อมูลนี้" }, { status: 403 });
    }

    return Response.json({ data: evaluation });
  } catch (error) {
    console.error("Error fetching evaluation:", error);
    return Response.json({ error: "ไม่สามารถดึงข้อมูลการประเมินได้" }, { status: 500 });
  }
});

export const PUT = withAuth(async (request: NextRequest, auth) => {
  const id = request.nextUrl.pathname.split("/").pop()!;

  try {
    const existing = await getEvaluationById(id);
    if (!existing) {
      return Response.json({ error: "ไม่พบข้อมูลการประเมิน" }, { status: 404 });
    }

    if (
      existing.evaluator_id !== auth.user.id &&
      !["admin", "supervisor"].includes(auth.employee.role || "")
    ) {
      return Response.json({ error: "ไม่มีสิทธิ์แก้ไขการประเมินนี้" }, { status: 403 });
    }

    const body = await request.json();
    const { isDraft, ...evalData } = body;

    const evaluation = await submitEvaluation(
      {
        employee_id: existing.employee_id,
        period_id: existing.period_id,
        evaluator_id: auth.user.id,
        evaluation_type: existing.evaluation_type as "self" | "supervisor",
        ...evalData,
      },
      isDraft
    );

    return Response.json({ data: evaluation });
  } catch (error) {
    console.error("Error updating evaluation:", error);
    return Response.json({ error: "ไม่สามารถแก้ไขการประเมินได้" }, { status: 500 });
  }
});
