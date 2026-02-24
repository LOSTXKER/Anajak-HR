import { NextRequest } from "next/server";
import { requireAdmin, handleAuthError } from "@/lib/auth/api-middleware";
import { approveGoal, rejectGoal } from "@/lib/services/kpi.service";

export async function PUT(request: NextRequest) {
  let auth;
  try {
    auth = await requireAdmin(request);
  } catch (error) {
    return handleAuthError(error);
  }

  const segments = request.nextUrl.pathname.split("/");
  const goalId = segments[segments.length - 2];

  try {
    const { action, reason } = await request.json();

    if (action === "approve") {
      const goal = await approveGoal(goalId, auth.user.id);
      return Response.json({ data: goal });
    } else if (action === "reject") {
      if (!reason) {
        return Response.json({ error: "กรุณาระบุเหตุผลในการปฏิเสธ" }, { status: 400 });
      }
      const goal = await rejectGoal(goalId, reason);
      return Response.json({ data: goal });
    } else {
      return Response.json({ error: "action ต้องเป็น approve หรือ reject" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error approving/rejecting goal:", error);
    return Response.json({ error: "ไม่สามารถดำเนินการได้" }, { status: 500 });
  }
}
