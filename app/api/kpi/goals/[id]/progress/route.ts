import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth/api-middleware";
import { addGoalProgress, getGoal } from "@/lib/services/kpi.service";

export const POST = withAuth(async (request: NextRequest, auth) => {
  const segments = request.nextUrl.pathname.split("/");
  const goalId = segments[segments.length - 2];

  try {
    const goal = await getGoal(goalId);
    if (!goal) {
      return Response.json({ error: "ไม่พบเป้าหมาย" }, { status: 404 });
    }

    if (
      goal.employee_id !== auth.user.id &&
      !["admin", "supervisor"].includes(auth.employee.role || "")
    ) {
      return Response.json({ error: "ไม่มีสิทธิ์อัพเดทเป้าหมายนี้" }, { status: 403 });
    }

    const { progress_value, progress_percent, note, attachment_url } = await request.json();

    const progress = await addGoalProgress(
      goalId,
      progress_value,
      progress_percent,
      note,
      auth.user.id,
      attachment_url
    );

    return Response.json({ data: progress }, { status: 201 });
  } catch (error) {
    console.error("Error adding progress:", error);
    return Response.json({ error: "ไม่สามารถอัพเดทความคืบหน้าได้" }, { status: 500 });
  }
});
