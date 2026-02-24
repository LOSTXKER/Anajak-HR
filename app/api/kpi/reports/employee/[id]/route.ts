import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth/api-middleware";
import { getEmployeeKPIHistory } from "@/lib/services/kpi.service";

export const GET = withAuth(async (request: NextRequest, auth) => {
  const id = request.nextUrl.pathname.split("/").pop()!;

  if (
    id !== auth.user.id &&
    !["admin", "supervisor"].includes(auth.employee.role || "")
  ) {
    return Response.json({ error: "ไม่มีสิทธิ์ดูข้อมูลนี้" }, { status: 403 });
  }

  try {
    const history = await getEmployeeKPIHistory(id);
    return Response.json({ data: history });
  } catch (error) {
    console.error("Error fetching employee KPI history:", error);
    return Response.json({ error: "ไม่สามารถดึงประวัติ KPI ได้" }, { status: 500 });
  }
});
