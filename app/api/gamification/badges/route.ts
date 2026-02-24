import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth/api-middleware";
import { getBadgesWithProgress } from "@/lib/services/gamification.service";

export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const badges = await getBadgesWithProgress(auth.user.id);
    return Response.json({ badges });
  } catch (error) {
    console.error("Error fetching badges:", error);
    return Response.json({ error: "Failed to fetch badges" }, { status: 500 });
  }
});
