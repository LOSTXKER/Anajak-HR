import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth/api-middleware";
import { getEmployeeGameProfile } from "@/lib/services/gamification.service";

export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const profile = await getEmployeeGameProfile(auth.user.id);
    return Response.json(profile);
  } catch (error) {
    console.error("Error fetching game profile:", error);
    return Response.json({ error: "Failed to fetch game profile" }, { status: 500 });
  }
});
