/**
 * Gamification Hooks
 * =============================================
 * SWR hooks for gamification data via API routes
 */

import useSWR from "swr";
import { useAuth } from "@/lib/auth/auth-context";
import { supabase } from "@/lib/supabase/client";
import type {
  GameProfile,
  BadgeWithProgress,
  LeaderboardEntry,
} from "@/lib/services/gamification.service";

async function apiFetcher<T>(url: string): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(url, {
    headers: session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {},
  });
  if (!res.ok) throw new Error("API request failed");
  return res.json();
}

/**
 * Hook for current user's game profile
 */
export function useGameProfile() {
  const { employee } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<GameProfile>(
    employee?.id ? "/api/gamification/profile" : null,
    apiFetcher<GameProfile>,
    { refreshInterval: 60000, dedupingInterval: 10000 }
  );

  return {
    profile: data || null,
    isLoading,
    error,
    refetch: mutate,
  };
}

/**
 * Hook for leaderboard data
 */
export function useLeaderboard(
  period: "monthly" | "alltime" = "monthly",
  branchId?: string
) {
  const { employee } = useAuth();
  const params = new URLSearchParams({ period });
  if (branchId) params.set("branch", branchId);
  const url = `/api/gamification/leaderboard?${params}`;

  const { data, error, isLoading, mutate } = useSWR<{ leaderboard: LeaderboardEntry[]; currentUserId: string }>(
    employee?.id ? url : null,
    apiFetcher<{ leaderboard: LeaderboardEntry[]; currentUserId: string }>,
    { refreshInterval: 120000, dedupingInterval: 30000 }
  );

  return {
    leaderboard: data?.leaderboard || [],
    currentUserId: data?.currentUserId || employee?.id,
    isLoading,
    error,
    refetch: mutate,
  };
}

/**
 * Hook for all badges with progress
 */
export function useBadges() {
  const { employee } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<{ badges: BadgeWithProgress[] }>(
    employee?.id ? "/api/gamification/badges" : null,
    apiFetcher<{ badges: BadgeWithProgress[] }>,
    { refreshInterval: 120000, dedupingInterval: 30000 }
  );

  return {
    badges: data?.badges || [],
    isLoading,
    error,
    refetch: mutate,
  };
}
