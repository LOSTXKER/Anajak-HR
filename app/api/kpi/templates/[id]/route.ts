import { NextRequest } from "next/server";
import { requireAdmin, handleAuthError } from "@/lib/auth/api-middleware";
import { updateKPITemplate, deleteKPITemplate } from "@/lib/services/kpi.service";

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch (error) {
    return handleAuthError(error);
  }

  const id = request.nextUrl.pathname.split("/").pop()!;

  try {
    const body = await request.json();
    const template = await updateKPITemplate(id, body);
    return Response.json({ data: template });
  } catch (error) {
    console.error("Error updating KPI template:", error);
    return Response.json({ error: "ไม่สามารถแก้ไข template ได้" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch (error) {
    return handleAuthError(error);
  }

  const id = request.nextUrl.pathname.split("/").pop()!;

  try {
    await deleteKPITemplate(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting KPI template:", error);
    return Response.json({ error: "ไม่สามารถลบ template ได้" }, { status: 500 });
  }
}
