import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription } = body;

    if (!subscription) {
      return Response.json({ error: "Subscription data required" }, { status: 400 });
    }

    // Get current user from session
    const cookieStore = cookies();
    const supabase = supabaseServer(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get employee ID
    const { data: employee } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!employee) {
      return Response.json({ error: "Employee not found" }, { status: 404 });
    }

    // Store subscription in database
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert({
        employee_id: employee.id,
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

    console.log(`Push subscription saved for employee ${employee.id}`);

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

