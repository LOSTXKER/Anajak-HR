/**
 * Admin Requests Hook
 * =============================================
 * Composing hook that combines request fetching, actions, and filters
 */

import {
  RequestItem,
  RequestType,
  RequestStatus,
  RequestStats,
  Employee,
  Holiday,
  OTSettings,
  OTRateInfo,
  CreateFormData,
} from "@/components/admin/requests/types";
import { useRequestFetching } from "./use-request-fetching";
import { useRequestActions } from "./use-request-actions";
import { useRequestFilters } from "./use-request-filters";

interface UseAdminRequestsOptions {
  dateRange?: {
    start: string;
    end: string;
  };
}

interface UseAdminRequestsReturn {
  // Data
  requests: RequestItem[];
  filteredRequests: RequestItem[];
  stats: RequestStats;
  employees: Employee[];
  holidays: Holiday[];
  otSettings: OTSettings;
  workingDays: number[];
  loading: boolean;
  processing: boolean;
  detectedOTInfo: OTRateInfo | null;

  // Filters
  activeType: RequestType | "all";
  activeStatus: RequestStatus;
  searchTerm: string;
  setActiveType: (type: RequestType | "all") => void;
  setActiveStatus: (status: RequestStatus) => void;
  setSearchTerm: (term: string) => void;

  // Actions
  fetchRequests: () => Promise<void>;
  handleApprove: (request: RequestItem, adminId: string) => Promise<boolean>;
  handleReject: (request: RequestItem, adminId: string) => Promise<boolean>;
  handleCancel: (
    request: RequestItem,
    adminId: string,
    cancelReason: string
  ) => Promise<boolean>;
  handleCreateRequest: (
    type: RequestType,
    formData: CreateFormData,
    adminId: string
  ) => Promise<boolean>;
  handleEditRequest: (
    request: RequestItem,
    editData: any,
    adminId: string
  ) => Promise<boolean>;
  detectOTRate: (dateStr: string) => OTRateInfo;
}

export function useAdminRequests(
  options: UseAdminRequestsOptions = {}
): UseAdminRequestsReturn {
  // Use the fetching hook
  const {
    requests,
    employees,
    holidays,
    otSettings,
    workingDays,
    loading,
    detectedOTInfo,
    fetchRequests,
    detectOTRate,
  } = useRequestFetching({ dateRange: options.dateRange });

  // Use the actions hook
  const {
    processing,
    handleApprove,
    handleReject,
    handleCancel,
    handleCreateRequest,
    handleEditRequest,
  } = useRequestActions({
    employees,
    onSuccess: fetchRequests,
  });

  // Use the filters hook
  const {
    activeType,
    activeStatus,
    searchTerm,
    setActiveType,
    setActiveStatus,
    setSearchTerm,
    filteredRequests,
    stats,
  } = useRequestFilters({ requests });

  return {
    // Data
    requests,
    filteredRequests,
    stats,
    employees,
    holidays,
    otSettings,
    workingDays,
    loading,
    processing,
    detectedOTInfo,

    // Filters
    activeType,
    activeStatus,
    searchTerm,
    setActiveType,
    setActiveStatus,
    setSearchTerm,

    // Actions
    fetchRequests,
    handleApprove,
    handleReject,
    handleCancel,
    handleCreateRequest,
    handleEditRequest,
    detectOTRate,
  };
}
