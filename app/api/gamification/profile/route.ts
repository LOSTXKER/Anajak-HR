import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth/api-middleware";
import { getEmployeeGameProfile, getBadgesWithProgress } from "@/lib/services/gamification.service";
import { supabase } from "@/lib/supabase/client";

export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId") || auth.user.id;

    const profile = await getEmployeeGameProfile(employeeId);

    if (employeeId !== auth.user.id) {
      const { data: emp } = await supabase
        .from("employees")
        .select("name")
        .eq("id", employeeId)
        .maybeSingle();

      const badges = await getBadgesWithProgress(employeeId);
      const earnedBadges = badges.filter((b) => b.earned);

      return Response.json({ ...profile, employeeName: emp?.name || "", badges: earnedBadges });
    }

    return Response.json(profile);
  } catch (error) {
    console.error("Error fetching game profile:", error);
    return Response.json({ error: "Failed to fetch game profile" }, { status: 500 });
  }
});
