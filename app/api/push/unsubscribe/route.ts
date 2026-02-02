import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  requireAuth,
  verifyOwnership,
  handleAuthError,
  AuthResult,
} from "@/lib/auth/api-middleware";

export async function POST(request: NextRequest) {
  // Verify authentication
  let auth: AuthResult;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return handleAuthError(error);
  }

  try {
    const body = await request.json();
    const { employeeId } = body;

    if (!employeeId) {
      return Response.json({ error: "employeeId required" }, { status: 400 });
    }

    // Verify user can only unsubscribe their own device
    try {
      verifyOwnership(auth, employeeId);
    } catch (error) {
      return handleAuthError(error);
    }

    // Delete subscription from database
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

  } catch (error: any) {
    console.error("Error in push unsubscribe endpoint:", error);
    return Response.json(
      { error: error.message || "Failed to unsubscribe" },
      { status: 500 }
    );
  }
}

