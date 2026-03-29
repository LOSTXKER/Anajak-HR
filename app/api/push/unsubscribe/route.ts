import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { withAuth, verifyOwnership } from "@/lib/auth/api-middleware";

export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json();
    const { employeeId } = body;

    if (!employeeId) {
      return Response.json({ error: "employeeId required" }, { status: 400 });
    }

    verifyOwnership(auth, employeeId);

    const { error } = await supabaseServer
      .from("push_subscriptions")
      .delete()
      .eq("employee_id", employeeId);

    if (error) {
      console.error("Error deleting push subscription:", error);
      return Response.json({ error: "Failed to delete subscription" }, { status: 500 });
    }

    console.log(`Push subscription removed for employee ${employeeId}`);

    return Response.json({ 
      success: true,
      message: "Subscription removed successfully" 
    });

  } catch (error: unknown) {
    console.error("Error in push unsubscribe endpoint:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to unsubscribe";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
});
