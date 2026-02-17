/**
 * Request Filters Hook
 * =============================================
 * Hook for filtering and searching requests
 */

import { useState, useMemo } from "react";
import {
  RequestItem,
  RequestType,
  RequestStatus,
  RequestStats,
} from "@/lib/types/request";

interface UseRequestFiltersOptions {
  requests: RequestItem[];
}

interface UseRequestFiltersReturn {
  // Filter state
  activeType: RequestType | "all";
  activeStatus: RequestStatus;
  searchTerm: string;

  // Setters
  setActiveType: (type: RequestType | "all") => void;
  setActiveStatus: (status: RequestStatus) => void;
  setSearchTerm: (term: string) => void;

  // Computed
  filteredRequests: RequestItem[];
  stats: RequestStats;
}

export function useRequestFilters(
  options: UseRequestFiltersOptions
): UseRequestFiltersReturn {
  const { requests } = options;

  // Filter state
  const [activeType, setActiveType] = useState<RequestType | "all">("all");
  const [activeStatus, setActiveStatus] = useState<RequestStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (activeType !== "all" && r.type !== activeType) return false;
      if (activeStatus !== "all" && r.status !== activeStatus) return false;
      if (
        searchTerm &&
        !r.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
      )
        return false;
      return true;
    });
  }, [requests, activeType, activeStatus, searchTerm]);

  // Stats
  const stats = useMemo<RequestStats>(() => {
    const counts: RequestStats = {
      ot: 0,
      leave: 0,
      wfh: 0,
      late: 0,
      field_work: 0,
      pending: 0,
      approved: 0,
      completed: 0,
      rejected: 0,
      cancelled: 0,
    };

    requests.forEach((r) => {
      counts[r.type]++;
      if (r.status in counts) (counts as any)[r.status]++;
    });

    return counts;
  }, [requests]);

  return {
    // Filter state
    activeType,
    activeStatus,
    searchTerm,

    // Setters
    setActiveType,
    setActiveStatus,
    setSearchTerm,

    // Computed
    filteredRequests,
    stats,
  };
}
