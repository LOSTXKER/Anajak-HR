import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeId } = body;

    if (!employeeId) {
      return Response.json({ error: "employeeId required" }, { status: 400 });
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

