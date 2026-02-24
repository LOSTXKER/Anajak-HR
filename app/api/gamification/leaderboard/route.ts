import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth/api-middleware";
import { getLeaderboard } from "@/lib/services/gamification.service";

export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "monthly") as "monthly" | "alltime";
    const branchId = searchParams.get("branch") || undefined;

    const leaderboard = await getLeaderboard(period, branchId);
    return Response.json({ leaderboard, currentUserId: auth.user.id });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return Response.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
});
