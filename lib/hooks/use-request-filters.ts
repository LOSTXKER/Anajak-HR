/**
 * use-request-filters
 * =============================================
 * Client-side filtering, searching and stats aggregation over RequestItems.
 */

import { useState, useMemo } from "react";
import { RequestItem, RequestType, RequestStatus, RequestStats } from "@/lib/types/request";

// ─── Shared permission helpers ────────────────────────────

export function canCancelRequest(status: string): boolean {
  return status === "pending" || status === "approved" || status === "completed";
}

export function canEditRequest(status: string): boolean {
  return status === "pending" || status === "approved" || status === "completed";
}

// ─── Hook ─────────────────────────────────────────────────

interface UseRequestFiltersReturn {
  activeType: RequestType | "all";
  activeStatus: RequestStatus;
  searchTerm: string;
  setActiveType: (type: RequestType | "all") => void;
  setActiveStatus: (status: RequestStatus) => void;
  setSearchTerm: (term: string) => void;
  filtered: RequestItem[];
  stats: RequestStats;
}

export function useRequestFilters(requests: RequestItem[]): UseRequestFiltersReturn {
  const [activeType, setActiveType] = useState<RequestType | "all">("all");
  const [activeStatus, setActiveStatus] = useState<RequestStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const stats = useMemo<RequestStats>(() => {
    const counts: RequestStats = {
      ot: 0, leave: 0, wfh: 0, late: 0, field_work: 0,
      pending: 0, approved: 0, completed: 0, rejected: 0, cancelled: 0,
    };
    requests.forEach((r) => {
      if (r.type in counts) (counts as any)[r.type]++;
      if (r.status in counts) (counts as any)[r.status]++;
    });
    return counts;
  }, [requests]);

  const filtered = useMemo(
    () =>
      requests.filter((r) => {
        if (activeType !== "all" && r.type !== activeType) return false;
        if (activeStatus !== "all" && r.status !== activeStatus) return false;
        if (searchTerm && !r.employeeName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
      }),
    [requests, activeType, activeStatus, searchTerm]
  );

  return {
    activeType, activeStatus, searchTerm,
    setActiveType, setActiveStatus, setSearchTerm,
    filtered, stats,
  };
}
