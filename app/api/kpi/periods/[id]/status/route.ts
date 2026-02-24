import { NextRequest } from "next/server";
import { requireAdmin, handleAuthError } from "@/lib/auth/api-middleware";
import { updatePeriodStatus } from "@/lib/services/kpi.service";

const VALID_STATUSES = ["draft", "goal_setting", "in_progress", "evaluating", "closed"];

export async function PUT(request: NextRequest) {
  let auth;
  try {
    auth = await requireAdmin(request);
  } catch (error) {
    return handleAuthError(error);
  }

  const segments = request.nextUrl.pathname.split("/");
  const id = segments[segments.length - 2];

  try {
    const { status } = await request.json();

    if (!VALID_STATUSES.includes(status)) {
      return Response.json(
        { error: `สถานะไม่ถูกต้อง ต้องเป็น: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const period = await updatePeriodStatus(id, status);
    return Response.json({ data: period });
  } catch (error) {
    console.error("Error updating period status:", error);
    return Response.json({ error: "ไม่สามารถเปลี่ยนสถานะได้" }, { status: 500 });
  }
}
