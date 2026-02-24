import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth/api-middleware";
import { getGoal, updateGoal } from "@/lib/services/kpi.service";

export const GET = withAuth(async (request: NextRequest, auth) => {
  const id = request.nextUrl.pathname.split("/").pop()!;

  try {
    const goal = await getGoal(id);
    if (!goal) {
      return Response.json({ error: "ไม่พบเป้าหมาย" }, { status: 404 });
    }

    if (
      goal.employee_id !== auth.user.id &&
      !["admin", "supervisor"].includes(auth.employee.role || "")
    ) {
      return Response.json({ error: "ไม่มีสิทธิ์ดูเป้าหมายนี้" }, { status: 403 });
    }

    return Response.json({ data: goal });
  } catch (error) {
    console.error("Error fetching goal:", error);
    return Response.json({ error: "ไม่สามารถดึงข้อมูลเป้าหมายได้" }, { status: 500 });
  }
});

export const PUT = withAuth(async (request: NextRequest, auth) => {
  const id = request.nextUrl.pathname.split("/").pop()!;

  try {
    const goal = await getGoal(id);
    if (!goal) {
      return Response.json({ error: "ไม่พบเป้าหมาย" }, { status: 404 });
    }

    if (
      goal.employee_id !== auth.user.id &&
      !["admin", "supervisor"].includes(auth.employee.role || "")
    ) {
      return Response.json({ error: "ไม่มีสิทธิ์แก้ไขเป้าหมายนี้" }, { status: 403 });
    }

    const body = await request.json();
    const updated = await updateGoal(id, body);
    return Response.json({ data: updated });
  } catch (error) {
    console.error("Error updating goal:", error);
    return Response.json({ error: "ไม่สามารถแก้ไขเป้าหมายได้" }, { status: 500 });
  }
});
