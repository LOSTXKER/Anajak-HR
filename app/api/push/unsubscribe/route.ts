import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
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

    // Delete subscription from database
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("employee_id", employee.id);

    if (error) {
      console.error("Error deleting push subscription:", error);
      return Response.json({ error: "Failed to delete subscription" }, { status: 500 });
    }

    console.log(`Push subscription removed for employee ${employee.id}`);

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

