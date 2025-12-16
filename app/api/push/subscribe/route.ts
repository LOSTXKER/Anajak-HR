import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription, employeeId } = body;

    if (!subscription || !employeeId) {
      return Response.json({ error: "Subscription data and employeeId required" }, { status: 400 });
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

    console.log(`Push subscription saved for employee ${employeeId}`);

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

