/**
 * OT Hooks
 * =============================================
 * SWR hooks for OT data fetching
 */

import useSWR from "swr";
import { format } from "date-fns";
import {
    getActiveOT,
    getPendingOT,
    getOTRequest,
    getOTHistory,
    formatOTDuration,
} from "@/lib/services/ot.service";
import type { OTRequest } from "@/lib/types";

/**
 * Hook to get active OT session
 * @param employeeId - Employee ID
 */
export function useActiveOT(employeeId: string | undefined) {
    const { data, error, isLoading, mutate } = useSWR(
        employeeId ? `ot:active:${employeeId}` : null,
        () => (employeeId ? getActiveOT(employeeId) : null),
        {
            refreshInterval: 30000, // Refresh every 30 seconds
            revalidateOnFocus: true,
        }
    );

    // Calculate live OT duration
    const otDuration = data?.actual_start_time
        ? formatOTDuration(data.actual_start_time)
        : "00:00:00";

    return {
        activeOT: data,
        otDuration,
        isLoading,
        error,
        refetch: mutate,
    };
}

/**
 * Hook to get pending OT requests (approved, not started)
 * @param employeeId - Employee ID
 * @param date - Optional date (default: today)
 */
export function usePendingOT(employeeId: string | undefined, date?: string) {
    const targetDate = date || format(new Date(), "yyyy-MM-dd");

    const { data, error, isLoading, mutate } = useSWR(
        employeeId ? `ot:pending:${employeeId}:${targetDate}` : null,
        () => (employeeId ? getPendingOT(employeeId, targetDate) : []),
        {
            refreshInterval: 60000, // Refresh every minute
            revalidateOnFocus: true,
        }
    );

    return {
        pendingOT: data || [],
        isLoading,
        error,
        refetch: mutate,
    };
}

/**
 * Hook to get a specific OT request
 * @param otId - OT request ID
 */
export function useOTRequest(otId: string | undefined) {
    const { data, error, isLoading, mutate } = useSWR(
        otId ? `ot:request:${otId}` : null,
        () => (otId ? getOTRequest(otId) : null),
        {
            revalidateOnFocus: false,
        }
    );

    return {
        otRequest: data,
        isLoading,
        error,
        refetch: mutate,
    };
}

/**
 * Hook to get OT history for a date range
 * @param employeeId - Employee ID
 * @param startDate - Start date in format 'YYYY-MM-DD'
 * @param endDate - End date in format 'YYYY-MM-DD'
 */
export function useOTHistory(
    employeeId: string | undefined,
    startDate: string | undefined,
    endDate: string | undefined
) {
    const key =
        employeeId && startDate && endDate
            ? `ot:history:${employeeId}:${startDate}:${endDate}`
            : null;

    const { data, error, isLoading, mutate } = useSWR(
        key,
        () =>
            employeeId && startDate && endDate
                ? getOTHistory(employeeId, startDate, endDate)
                : [],
        {
            revalidateOnFocus: false,
        }
    );

    return {
        history: data || [],
        isLoading,
        error,
        refetch: mutate,
    };
}

/**
 * Hook to get combined OT status for dashboard
 * @param employeeId - Employee ID
 */
export function useOTStatus(employeeId: string | undefined) {
    const { activeOT, otDuration, isLoading: loadingActive, refetch: refetchActive } = useActiveOT(employeeId);
    const { pendingOT, isLoading: loadingPending, refetch: refetchPending } = usePendingOT(employeeId);

    const isLoading = loadingActive || loadingPending;

    const refetch = async () => {
        await Promise.all([refetchActive(), refetchPending()]);
    };

    return {
        activeOT,
        pendingOT,
        otDuration,
        hasActiveOT: !!activeOT,
        hasPendingOT: pendingOT.length > 0,
        isLoading,
        refetch,
    };
}
