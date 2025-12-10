/**
 * Holiday Hooks
 * =============================================
 * SWR hooks for holiday data fetching
 */

import useSWR from "swr";
import { format } from "date-fns";
import {
    getTodayHoliday,
    getUpcomingHolidays,
    getHolidaysInRange,
    getDayType,
} from "@/lib/services/holiday.service";
import type { Holiday, DayInfo } from "@/lib/types";

/**
 * Hook to get today's holiday (if any)
 * @param branchId - Optional branch ID
 */
export function useTodayHoliday(branchId?: string) {
    const key = branchId ? `holiday:today:${branchId}` : "holiday:today";

    const { data, error, isLoading, mutate } = useSWR(
        key,
        () => getTodayHoliday(branchId),
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000, // 1 minute
        }
    );

    return {
        holiday: data,
        isHoliday: !!data,
        isLoading,
        error,
        refetch: mutate,
    };
}

/**
 * Hook to get upcoming holidays
 * @param days - Number of days to look ahead (default: 30)
 * @param limit - Maximum results (default: 5)
 * @param branchId - Optional branch ID
 */
export function useUpcomingHolidays(
    days: number = 30,
    limit: number = 5,
    branchId?: string
) {
    const key = `holiday:upcoming:${days}:${limit}${branchId ? `:${branchId}` : ""}`;

    const { data, error, isLoading, mutate } = useSWR(
        key,
        () => getUpcomingHolidays(days, limit, branchId),
        {
            revalidateOnFocus: false,
            dedupingInterval: 300000, // 5 minutes
        }
    );

    return {
        holidays: data || [],
        isLoading,
        error,
        refetch: mutate,
    };
}

/**
 * Hook to get holidays for a month
 * @param month - Month date
 * @param branchId - Optional branch ID
 */
export function useHolidaysForMonth(month: Date, branchId?: string) {
    const year = month.getFullYear();
    const monthNum = month.getMonth();
    const startDate = format(new Date(year, monthNum, 1), "yyyy-MM-dd");
    const endDate = format(new Date(year, monthNum + 1, 0), "yyyy-MM-dd");

    const key = `holiday:month:${startDate}:${endDate}${branchId ? `:${branchId}` : ""}`;

    const { data, error, isLoading, mutate } = useSWR(
        key,
        () => getHolidaysInRange(startDate, endDate, branchId),
        {
            revalidateOnFocus: false,
            dedupingInterval: 300000, // 5 minutes
        }
    );

    return {
        holidays: data || [],
        isLoading,
        error,
        refetch: mutate,
    };
}

/**
 * Hook to get day type for a specific date
 * @param date - Date string in format 'YYYY-MM-DD'
 * @param branchId - Optional branch ID
 */
export function useDayType(date: string | undefined, branchId?: string) {
    const key = date ? `daytype:${date}${branchId ? `:${branchId}` : ""}` : null;

    const { data, error, isLoading, mutate } = useSWR<DayInfo>(
        key,
        () => (date ? getDayType(date, branchId) : { type: "workday" as const }),
        {
            revalidateOnFocus: false,
        }
    );

    return {
        dayInfo: data || { type: "workday" as const },
        isHoliday: data?.type === "holiday",
        isWeekend: data?.type === "weekend",
        isWorkday: data?.type === "workday",
        holidayName: data?.holidayName,
        isLoading,
        error,
        refetch: mutate,
    };
}

/**
 * Hook to check if today is a working day
 * @param branchId - Optional branch ID
 */
export function useTodayDayType(branchId?: string) {
    const today = format(new Date(), "yyyy-MM-dd");
    return useDayType(today, branchId);
}
