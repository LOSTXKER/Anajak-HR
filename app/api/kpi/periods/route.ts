import { NextRequest } from "next/server";
import { withAuth, withAdmin } from "@/lib/auth/api-middleware";
import { getKPIPeriods, createKPIPeriod } from "@/lib/services/kpi.service";

export const GET = withAuth(async () => {
  try {
    const periods = await getKPIPeriods();
    return Response.json({ data: periods });
  } catch (error) {
    console.error("Error fetching KPI periods:", error);
    return Response.json({ error: "ไม่สามารถดึงข้อมูลรอบประเมินได้" }, { status: 500 });
  }
});

export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    const body = await request.json();
    const period = await createKPIPeriod({
      ...body,
      created_by: auth.user.id,
    });
    return Response.json({ data: period }, { status: 201 });
  } catch (error) {
    console.error("Error creating KPI period:", error);
    return Response.json({ error: "ไม่สามารถสร้างรอบประเมินได้" }, { status: 500 });
  }
});
