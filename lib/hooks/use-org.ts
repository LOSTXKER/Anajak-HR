"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

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
  const [switching, setSwitching] = useState(false);

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
    setSwitching(true);
    setCurrentOrg(org);

    try {
      // 1. Get current access token to authenticate the switch-org API call
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      // 2. Call switch-org: updates Supabase user app_metadata (server-side)
      const res = await fetch("/api/auth/switch-org", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ org_id: org.id }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("switch-org error:", err);
        setSwitching(false);
        return;
      }

      // 3. Refresh JWT so new app_metadata.selected_org_id is in the token.
      //    Without this, RLS current_user_org() still sees the OLD org
      //    even though app_metadata was updated on the server.
      await supabase.auth.refreshSession();

      // 4. Hard reload so all server components + hooks re-fetch with new org
      window.location.reload();
    } catch (err) {
      console.error("switchOrg unexpected error:", err);
      setSwitching(false);
    }
  }, []);

  return { currentOrg, loading, switching, switchOrg, organizations: ORGANIZATIONS };
}
