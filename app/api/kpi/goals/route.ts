import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth/api-middleware";
import { getEmployeeGoals, createGoal, getPendingGoals } from "@/lib/services/kpi.service";

export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const periodId = request.nextUrl.searchParams.get("period_id");
    const employeeId = request.nextUrl.searchParams.get("employee_id") || auth.user.id;
    const pending = request.nextUrl.searchParams.get("pending") === "true";

    if (pending && ["admin", "supervisor"].includes(auth.employee.role || "")) {
      const goals = await getPendingGoals(periodId || undefined);
      return Response.json({ data: goals });
    }

    if (!periodId) {
      return Response.json({ error: "กรุณาระบุ period_id" }, { status: 400 });
    }

    if (employeeId !== auth.user.id && !["admin", "supervisor"].includes(auth.employee.role || "")) {
      return Response.json({ error: "ไม่มีสิทธิ์ดูเป้าหมายของผู้อื่น" }, { status: 403 });
    }

    const goals = await getEmployeeGoals(employeeId, periodId);
    return Response.json({ data: goals });
  } catch (error) {
    console.error("Error fetching goals:", error);
    return Response.json({ error: "ไม่สามารถดึงข้อมูลเป้าหมายได้" }, { status: 500 });
  }
});

export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json();
    const goal = await createGoal({
      ...body,
      employee_id: body.employee_id || auth.user.id,
    });
    return Response.json({ data: goal }, { status: 201 });
  } catch (error) {
    console.error("Error creating goal:", error);
    return Response.json({ error: "ไม่สามารถสร้างเป้าหมายได้" }, { status: 500 });
  }
});
