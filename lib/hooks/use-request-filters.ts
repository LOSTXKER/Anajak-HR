/**
 * use-request-filters
 * =============================================
 * Responsible only for client-side filtering, searching and stats aggregation
 * over a list of RequestItems. Extracted from use-requests.ts.
 */

import { useState, useMemo } from "react";
import { RequestItem, RequestType, RequestStatus, RequestStats } from "@/lib/types/request";

interface PendingStats {
  ot: number;
  leave: number;
  wfh: number;
  late: number;
  field_work: number;
  total: number;
}

interface UseRequestFiltersReturn {
  // Pending filters
  pendingType: RequestType | "all";
  setPendingType: (type: RequestType | "all") => void;
  filteredPending: RequestItem[];
  pendingStats: PendingStats;

  // All-requests filters
  activeType: RequestType | "all";
  activeStatus: RequestStatus;
  searchTerm: string;
  setActiveType: (type: RequestType | "all") => void;
  setActiveStatus: (status: RequestStatus) => void;
  setSearchTerm: (term: string) => void;
  filteredAll: RequestItem[];
  allStats: RequestStats;
}

export function useRequestFilters(
  pendingRequests: RequestItem[],
  allRequests: RequestItem[],
  initialType: RequestType | "all" = "all"
): UseRequestFiltersReturn {
  const [pendingType, setPendingType] = useState<RequestType | "all">(initialType);
  const [activeType, setActiveType] = useState<RequestType | "all">("all");
  const [activeStatus, setActiveStatus] = useState<RequestStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const pendingStats = useMemo<PendingStats>(() => {
    const counts: PendingStats = { ot: 0, leave: 0, wfh: 0, late: 0, field_work: 0, total: 0 };
    pendingRequests.forEach((r) => {
      counts[r.type]++;
    });
    counts.total = pendingRequests.length;
    return counts;
  }, [pendingRequests]);

  const filteredPending = useMemo(
    () => (pendingType === "all" ? pendingRequests : pendingRequests.filter((r) => r.type === pendingType)),
    [pendingRequests, pendingType]
  );

  const allStats = useMemo<RequestStats>(() => {
    const counts: RequestStats = {
      ot: 0, leave: 0, wfh: 0, late: 0, field_work: 0,
      pending: 0, approved: 0, completed: 0, rejected: 0, cancelled: 0,
    };
    allRequests.forEach((r) => {
      counts[r.type]++;
      if (r.status in counts) (counts as any)[r.status]++;
    });
    return counts;
  }, [allRequests]);

  const filteredAll = useMemo(
    () =>
      allRequests.filter((r) => {
        if (activeType !== "all" && r.type !== activeType) return false;
        if (activeStatus !== "all" && r.status !== activeStatus) return false;
        if (searchTerm && !r.employeeName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
      }),
    [allRequests, activeType, activeStatus, searchTerm]
  );

  return {
    pendingType, setPendingType, filteredPending, pendingStats,
    activeType, activeStatus, searchTerm,
    setActiveType, setActiveStatus, setSearchTerm,
    filteredAll, allStats,
  };
}
