/**
 * Unread Announcements Hook
 * =============================================
 * Hook to track unread announcement count for employees
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

interface UseUnreadAnnouncementsOptions {
  employeeId?: string;
  refreshInterval?: number; // in milliseconds
}

interface UseUnreadAnnouncementsReturn {
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and track unread announcement count
 * @param options - Configuration options
 */
export function useUnreadAnnouncements(
  options: UseUnreadAnnouncementsOptions = {}
): UseUnreadAnnouncementsReturn {
  const { employeeId, refreshInterval = 60000 } = options;

  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!employeeId) {
      setUnreadCount(0);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get all published announcements for this user
      const { data: announcements, error: announcementsError } = await supabase
        .from("announcements")
        .select("id")
        .eq("published", true)
        .is("deleted_at", null)
        .lte("published_at", new Date().toISOString())
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      if (announcementsError) throw announcementsError;

      if (!announcements || announcements.length === 0) {
        setUnreadCount(0);
        return;
      }

      // Get read announcements
      const { data: reads, error: readsError } = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("employee_id", employeeId);

      if (readsError) throw readsError;

      const readIds = new Set(
        reads?.map((r: { announcement_id: string }) => r.announcement_id) || []
      );
      const count = announcements.filter(
        (a: { id: string }) => !readIds.has(a.id)
      ).length;

      setUnreadCount(count);
    } catch (err: any) {
      console.error("Error fetching unread announcement count:", err);
      setError(err.message || "Failed to fetch unread count");
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchUnreadCount();

    // Set up refresh interval
    if (refreshInterval > 0) {
      const interval = setInterval(fetchUnreadCount, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchUnreadCount, refreshInterval]);

  return {
    unreadCount,
    isLoading,
    error,
    refetch: fetchUnreadCount,
  };
}
