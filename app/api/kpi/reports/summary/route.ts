import { NextRequest } from "next/server";
import { requireAdmin, handleAuthError } from "@/lib/auth/api-middleware";
import { getKPIReportSummary, getTeamKPISummary } from "@/lib/services/kpi.service";

export async function GET(request: NextRequest) {
  let auth;
  try {
    auth = await requireAdmin(request);
  } catch (error) {
    return handleAuthError(error);
  }

  try {
    const periodId = request.nextUrl.searchParams.get("period_id");
    const branchId = request.nextUrl.searchParams.get("branch_id");

    if (!periodId) {
      return Response.json({ error: "กรุณาระบุ period_id" }, { status: 400 });
    }

    const type = request.nextUrl.searchParams.get("type");

    if (type === "team") {
      const data = await getTeamKPISummary(periodId, branchId || undefined);
      return Response.json({ data });
    }

    const report = await getKPIReportSummary(periodId);
    return Response.json({ data: report });
  } catch (error) {
    console.error("Error generating report:", error);
    return Response.json({ error: "ไม่สามารถสร้างรายงานได้" }, { status: 500 });
  }
}
