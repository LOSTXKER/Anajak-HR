/**
 * Gamification Hooks
 * =============================================
 * SWR hooks for gamification data
 */

import useSWR from "swr";
import { useAuth } from "@/lib/auth/auth-context";
import {
  getEmployeeGameProfile,
  getBadgesWithProgress,
  getLeaderboard,
} from "@/lib/services/gamification.service";
import type {
  GameProfile,
  BadgeWithProgress,
  LeaderboardEntry,
} from "@/lib/services/gamification.service";

/**
 * Hook for current user's game profile
 */
export function useGameProfile() {
  const { employee } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<GameProfile>(
    employee?.id ? `gamification:profile:${employee.id}` : null,
    () => getEmployeeGameProfile(employee!.id),
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

  const { data, error, isLoading, mutate } = useSWR<LeaderboardEntry[]>(
    employee?.id ? `gamification:leaderboard:${period}:${branchId || "all"}` : null,
    () => getLeaderboard(period, branchId),
    { refreshInterval: 120000, dedupingInterval: 30000 }
  );

  return {
    leaderboard: data || [],
    currentUserId: employee?.id,
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

  const { data, error, isLoading, mutate } = useSWR<BadgeWithProgress[]>(
    employee?.id ? `gamification:badges:${employee.id}` : null,
    () => getBadgesWithProgress(employee!.id),
    { refreshInterval: 120000, dedupingInterval: 30000 }
  );

  return {
    badges: data || [],
    isLoading,
    error,
    refetch: mutate,
  };
}
