"use client";

import { useState, useEffect, useCallback } from "react";

export interface OrgOption {
  id: string;
  slug: string;
  name: string;
}

// Must match fixed UUIDs in migration 20260517000000_phase_b_step1_organizations.sql
export const ORGANIZATIONS: OrgOption[] = [
  { id: "00000000-0000-0000-0000-000000000001", slug: "anajak",  name: "Anajak" },
  { id: "00000000-0000-0000-0000-000000000002", slug: "ibear",   name: "iBear" },
  { id: "00000000-0000-0000-0000-000000000003", slug: "meecard", name: "Meecard" },
  { id: "00000000-0000-0000-0000-000000000004", slug: "meelike", name: "Meelike" },
  { id: "00000000-0000-0000-0000-000000000005", slug: "channel", name: "Best Channel" },
];

const DEFAULT_ORG = ORGANIZATIONS[0]; // Anajak

export function useOrg() {
  const [currentOrg, setCurrentOrg] = useState<OrgOption>(DEFAULT_ORG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch current org from cookie via API
    fetch("/api/auth/switch-org")
      .then((r) => r.json())
      .then((data: { org_id: string; slug: string }) => {
        const found = ORGANIZATIONS.find((o) => o.id === data.org_id);
        if (found) setCurrentOrg(found);
      })
      .catch(() => {
        // Default to Anajak on error (safe fallback)
        setCurrentOrg(DEFAULT_ORG);
      })
      .finally(() => setLoading(false));
  }, []);

  const switchOrg = useCallback(async (org: OrgOption) => {
    setCurrentOrg(org);
    await fetch("/api/auth/switch-org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_id: org.id }),
    });
    // Reload to pick up new org context in server components
    window.location.reload();
  }, []);

  return { currentOrg, loading, switchOrg, organizations: ORGANIZATIONS };
}
