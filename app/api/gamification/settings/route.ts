import { NextRequest } from "next/server";
import { withAuth, withAdmin } from "@/lib/auth/api-middleware";
import { getGamificationSettings } from "@/lib/services/gamification.service";
import { supabaseServer } from "@/lib/supabase/server";

export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const settings = await getGamificationSettings();
    return Response.json({ settings });
  } catch (error) {
    return Response.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
});

export const PUT = withAdmin(async (request: NextRequest, auth) => {
  try {
    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== "object") {
      return Response.json({ error: "Invalid settings data" }, { status: 400 });
    }

    for (const [key, value] of Object.entries(settings)) {
      if (!key.startsWith("gamify_")) continue;

      await supabaseServer
        .from("system_settings")
        .upsert(
          { setting_key: key, setting_value: String(value) },
          { onConflict: "setting_key" }
        );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error updating settings:", error);
    return Response.json({ error: "Failed to update settings" }, { status: 500 });
  }
});
