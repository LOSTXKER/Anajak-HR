import { NextRequest } from "next/server";
import { requireAdmin, handleAuthError, withAuth } from "@/lib/auth/api-middleware";
import { getKPIPeriod, updateKPIPeriod, updatePeriodTemplates } from "@/lib/services/kpi.service";

export const GET = withAuth(async (request: NextRequest, auth) => {
  const id = request.nextUrl.pathname.split("/").pop()!;
  try {
    const period = await getKPIPeriod(id);
    if (!period) {
      return Response.json({ error: "ไม่พบรอบประเมิน" }, { status: 404 });
    }
    return Response.json({ data: period });
  } catch (error) {
    console.error("Error fetching KPI period:", error);
    return Response.json({ error: "ไม่สามารถดึงข้อมูลรอบประเมินได้" }, { status: 500 });
  }
});

export async function PUT(request: NextRequest) {
  let auth;
  try {
    auth = await requireAdmin(request);
  } catch (error) {
    return handleAuthError(error);
  }

  const id = request.nextUrl.pathname.split("/").pop()!;

  try {
    const body = await request.json();
    const { templates, ...periodData } = body;

    const period = await updateKPIPeriod(id, periodData);

    if (templates) {
      await updatePeriodTemplates(id, templates);
    }

    const updated = await getKPIPeriod(id);
    return Response.json({ data: updated });
  } catch (error) {
    console.error("Error updating KPI period:", error);
    return Response.json({ error: "ไม่สามารถแก้ไขรอบประเมินได้" }, { status: 500 });
  }
}
