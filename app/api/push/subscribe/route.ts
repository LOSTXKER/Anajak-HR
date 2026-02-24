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
    const { subscription, employeeId } = body;

    if (!subscription || !employeeId) {
      return Response.json({ error: "Subscription data and employeeId required" }, { status: 400 });
    }

    // Verify user can only subscribe their own device
    try {
      verifyOwnership(auth, employeeId);
    } catch (error) {
      return handleAuthError(error);
    }

    // Store subscription in database
    const { error } = await supabaseServer
      .from("push_subscriptions")
      .upsert({
        employee_id: employeeId,
        subscription: subscription,
        user_agent: request.headers.get("user-agent") || "unknown",
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "employee_id",
      });

    if (error) {
      console.error("Error storing push subscription:", error);
      return Response.json({ error: "Failed to store subscription" }, { status: 500 });
    }

    console.debug(`Push subscription saved for employee ${employeeId}`);

    return Response.json({ 
      success: true,
      message: "Subscription saved successfully" 
    });

  } catch (error: any) {
    console.error("Error in push subscribe endpoint:", error);
    return Response.json(
      { error: error.message || "Failed to subscribe" },
      { status: 500 }
    );
  }
}

