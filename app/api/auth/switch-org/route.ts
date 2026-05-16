import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

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

/**
 * Get a Supabase client that authenticates as the calling user.
 * Used to verify identity + check role without trusting the request body.
 */
function getUserClient(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient<Database>(url, anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Get a Supabase admin client (service role).
 * Used to update user metadata — requires SUPABASE_SERVICE_ROLE_KEY.
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) {
    throw new Error("Supabase service role not configured");
  }
  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Extract access token from Authorization header or cookie.
 */
function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) return auth.substring(7);
  return req.cookies.get("sb-access-token")?.value ?? null;
}

// ─── POST /api/auth/switch-org ────────────────────────────────
// Body: { org_id?: string; org_slug?: string }
// Requires: authenticated admin user
// Effect:
//   1. Validates org_id is known
//   2. Confirms caller is admin (role = 'admin')
//   3. Updates auth.users.app_metadata.selected_org_id via service role
//   4. Sets cookie as UI hint
// The client must call supabase.auth.refreshSession() after this
// so the new JWT (with updated app_metadata) is used for RLS.
export async function POST(request: NextRequest) {
  // ── 1. Resolve org_id ──────────────────────────────────────
  let body: { org_id?: string; org_slug?: string };
  try {
    body = (await request.json()) as { org_id?: string; org_slug?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { org_id, org_slug } = body;
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
  const validOrgIds = Object.values(KNOWN_ORG_SLUGS);
  if (!validOrgIds.includes(resolvedOrgId)) {
    return NextResponse.json({ error: "Unknown organization" }, { status: 403 });
  }

  // ── 2. Authenticate caller ─────────────────────────────────
  const token = extractToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userClient = getUserClient(token);
  const {
    data: { user },
    error: authErr,
  } = await userClient.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // ── 3. Security: only admin can switch orgs ────────────────
  const { data: emp, error: empErr } = await userClient
    .from("employees")
    .select("role")
    .eq("id", user.id)
    .single();

  if (empErr || !emp) {
    return NextResponse.json({ error: "Employee record not found" }, { status: 403 });
  }

  if (emp.role !== "admin") {
    return NextResponse.json(
      { error: "เฉพาะ admin เท่านั้นที่สามารถ switch org ได้" },
      { status: 403 }
    );
  }

  // ── 4. Update user app_metadata via service role ───────────
  // This embeds selected_org_id into the JWT so Postgres
  // current_user_org() can read it from auth.jwt() -> 'app_metadata'.
  const adminClient = getAdminClient();
  const { error: updateErr } = await adminClient.auth.admin.updateUserById(
    user.id,
    {
      app_metadata: { selected_org_id: resolvedOrgId },
    }
  );

  if (updateErr) {
    console.error("Failed to update user app_metadata:", updateErr);
    return NextResponse.json(
      { error: "ไม่สามารถ update org context ได้" },
      { status: 500 }
    );
  }

  // ── 5. Set cookie (UI hint only — actual isolation via JWT) ─
  const slug =
    Object.keys(KNOWN_ORG_SLUGS).find((k) => KNOWN_ORG_SLUGS[k] === resolvedOrgId) ??
    "anajak";

  const response = NextResponse.json({
    ok: true,
    org_id: resolvedOrgId,
    slug,
    // Signal to client: call supabase.auth.refreshSession() to get new JWT
    requires_session_refresh: true,
  });

  response.cookies.set("selected_org_id", resolvedOrgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  return response;
}

// ─── GET /api/auth/switch-org ─────────────────────────────────
// Returns current selected org from cookie (or default Anajak).
// Used by useOrg hook on mount.
export async function GET(request: NextRequest) {
  const cookie = request.cookies.get("selected_org_id");
  const orgId = cookie?.value ?? ANAJAK_ORG_ID;

  const slug =
    Object.keys(KNOWN_ORG_SLUGS).find((k) => KNOWN_ORG_SLUGS[k] === orgId) ??
    "anajak";

  return NextResponse.json({ org_id: orgId, slug });
}
