import { NextRequest } from "next/server";
import { withAdmin } from "@/lib/auth/api-middleware";
import { recalculateEmployeePoints } from "@/lib/services/gamification.service";
import { supabaseServer } from "@/lib/supabase/server";

export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    const body = await request.json();
    const { employeeId } = body;

    if (employeeId) {
      await recalculateEmployeePoints(employeeId);
      return Response.json({ success: true, message: "Recalculated for 1 employee" });
    }

    const { data: employees } = await supabaseServer
      .from("employees")
      .select("id")
      .eq("account_status", "approved")
      .is("deleted_at", null)
      .eq("is_system_account", false);

    let processed = 0;
    for (const emp of employees || []) {
      await recalculateEmployeePoints(emp.id);
      processed++;
    }

    return Response.json({ success: true, message: `Recalculated for ${processed} employees` });
  } catch (error) {
    console.error("Error recalculating points:", error);
    return Response.json({ error: "Failed to recalculate" }, { status: 500 });
  }
});
