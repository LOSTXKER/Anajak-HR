import { NextRequest, NextResponse } from "next/server";

// Known organizations seeded in Phase B Step 1 migration
// Fixed UUIDs match supabase/migrations/20260517000000_phase_b_step1_organizations.sql
const KNOWN_ORG_SLUGS: Record<string, string> = {
  anajak:  "00000000-0000-0000-0000-000000000001",
  ibear:   "00000000-0000-0000-0000-000000000002",
  meecard: "00000000-0000-0000-0000-000000000003",
  meelike: "00000000-0000-0000-0000-000000000004",
  channel: "00000000-0000-0000-0000-000000000005",
};

const ANAJAK_ORG_ID = KNOWN_ORG_SLUGS.anajak;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { org_id?: string; org_slug?: string };
    const { org_id, org_slug } = body;

    // Resolve org_id from slug if provided
    let resolvedOrgId = org_id;
    if (!resolvedOrgId && org_slug) {
      resolvedOrgId = KNOWN_ORG_SLUGS[org_slug];
    }

    if (!resolvedOrgId) {
      return NextResponse.json(
        { error: "org_id or org_slug required" },
        { status: 400 }
      );
    }

    // Validate the org_id is a known organization
    const validOrgIds = Object.values(KNOWN_ORG_SLUGS);
    if (!validOrgIds.includes(resolvedOrgId)) {
      return NextResponse.json(
        { error: "Unknown organization" },
        { status: 403 }
      );
    }

    // Set org cookie (30-day expiry, httpOnly for security)
    const response = NextResponse.json({
      ok: true,
      org_id: resolvedOrgId,
      slug: Object.keys(KNOWN_ORG_SLUGS).find(
        (k) => KNOWN_ORG_SLUGS[k] === resolvedOrgId
      ),
    });

    response.cookies.set("selected_org_id", resolvedOrgId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  // Return current selected org from cookie (or default to Anajak)
  const cookie = request.cookies.get("selected_org_id");
  const orgId = cookie?.value ?? ANAJAK_ORG_ID;

  const slug = Object.keys(KNOWN_ORG_SLUGS).find(
    (k) => KNOWN_ORG_SLUGS[k] === orgId
  ) ?? "anajak";

  return NextResponse.json({ org_id: orgId, slug });
}
