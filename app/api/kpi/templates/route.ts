import { NextRequest } from "next/server";
import { requireAdmin, handleAuthError, withAuth } from "@/lib/auth/api-middleware";
import { getKPITemplates, createKPITemplate } from "@/lib/services/kpi.service";

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const activeOnly = request.nextUrl.searchParams.get("active") === "true";
    const templates = await getKPITemplates(activeOnly);
    return Response.json({ data: templates });
  } catch (error) {
    console.error("Error fetching KPI templates:", error);
    return Response.json({ error: "ไม่สามารถดึงข้อมูล template ได้" }, { status: 500 });
  }
});

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch (error) {
    return handleAuthError(error);
  }

  try {
    const body = await request.json();
    const template = await createKPITemplate(body);
    return Response.json({ data: template }, { status: 201 });
  } catch (error) {
    console.error("Error creating KPI template:", error);
    return Response.json({ error: "ไม่สามารถสร้าง template ได้" }, { status: 500 });
  }
}
