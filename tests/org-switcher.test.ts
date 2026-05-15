/**
 * Tests for Phase B Org switching logic
 * - ORGANIZATIONS constant: 5 entries, correct UUIDs
 * - switch-org API validation logic (unit-tested without HTTP)
 */

import { describe, it, expect } from "vitest";
import { ORGANIZATIONS } from "@/lib/hooks/use-org";

// Mirror of KNOWN_ORG_SLUGS in route.ts (keep in sync manually until Step 3)
const KNOWN_ORG_SLUGS: Record<string, string> = {
  anajak:  "00000000-0000-0000-0000-000000000001",
  ibear:   "00000000-0000-0000-0000-000000000002",
  meecard: "00000000-0000-0000-0000-000000000003",
  meelike: "00000000-0000-0000-0000-000000000004",
  channel: "00000000-0000-0000-0000-000000000005",
};

// ─── ORGANIZATIONS constant ─────────────────────────────────

describe("ORGANIZATIONS constant", () => {
  it("has exactly 5 organizations", () => {
    expect(ORGANIZATIONS).toHaveLength(5);
  });

  it("includes anajak as first entry", () => {
    expect(ORGANIZATIONS[0].slug).toBe("anajak");
  });

  it("every org has id, slug, name", () => {
    for (const org of ORGANIZATIONS) {
      expect(org.id).toBeTruthy();
      expect(org.slug).toBeTruthy();
      expect(org.name).toBeTruthy();
    }
  });

  it("org UUIDs match KNOWN_ORG_SLUGS in route.ts", () => {
    for (const org of ORGANIZATIONS) {
      expect(KNOWN_ORG_SLUGS[org.slug]).toBe(org.id);
    }
  });

  it("slugs match expected set", () => {
    const slugs = ORGANIZATIONS.map((o) => o.slug).sort();
    expect(slugs).toEqual(["anajak", "channel", "ibear", "meecard", "meelike"]);
  });

  it("all IDs are valid UUID-like strings", () => {
    for (const org of ORGANIZATIONS) {
      expect(org.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    }
  });
});

// ─── switch-org route validation logic ─────────────────────

describe("switch-org: validation logic", () => {
  const validOrgIds = Object.values(KNOWN_ORG_SLUGS);

  function resolveOrgId(body: {
    org_id?: string;
    org_slug?: string;
  }): string | null {
    let resolved = body.org_id;
    if (!resolved && body.org_slug) {
      resolved = KNOWN_ORG_SLUGS[body.org_slug];
    }
    return resolved ?? null;
  }

  function isValid(orgId: string | null): boolean {
    if (!orgId) return false;
    return validOrgIds.includes(orgId);
  }

  it("resolves org from org_id", () => {
    const orgId = resolveOrgId({
      org_id: "00000000-0000-0000-0000-000000000001",
    });
    expect(orgId).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("resolves org from slug", () => {
    const orgId = resolveOrgId({ org_slug: "ibear" });
    expect(orgId).toBe("00000000-0000-0000-0000-000000000002");
  });

  it("rejects unknown slug", () => {
    const orgId = resolveOrgId({ org_slug: "unknown-biz" });
    expect(isValid(orgId)).toBe(false);
  });

  it("rejects empty body", () => {
    const orgId = resolveOrgId({});
    expect(orgId).toBeNull();
    expect(isValid(orgId)).toBe(false);
  });

  it("rejects spoofed UUID not in known list", () => {
    const orgId = resolveOrgId({
      org_id: "ffffffff-ffff-ffff-ffff-ffffffffffff",
    });
    expect(isValid(orgId)).toBe(false);
  });

  it("all 5 known orgs pass validation", () => {
    for (const [slug, id] of Object.entries(KNOWN_ORG_SLUGS)) {
      expect(isValid(resolveOrgId({ org_slug: slug }))).toBe(true);
      expect(isValid(resolveOrgId({ org_id: id }))).toBe(true);
    }
  });
});
