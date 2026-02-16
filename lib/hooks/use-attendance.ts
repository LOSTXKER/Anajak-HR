/**
 * Attendance Hooks
 * =============================================
 * SWR hooks for attendance data fetching
 */

import useSWR from "swr";
import { format } from "date-fns";
import {
    getTodayAttendance,
    getAttendanceForDate,
    getAttendanceForRange,
    calculateWorkHours,
    calculateWorkProgress,
    formatWorkDuration,
} from "@/lib/services/attendance.service";
import { getSystemSettings } from "@/lib/services/settings.service";
import type { AttendanceLog } from "@/lib/types";

/**
 * Hook to get today's attendance for an employee
 * @param employeeId - Employee ID
 */
export function useTodayAttendance(employeeId: string | undefined) {
    const { data, error, isLoading, mutate } = useSWR(
        employeeId ? `attendance:today:${employeeId}` : null,
        () => (employeeId ? getTodayAttendance(employeeId) : null),
        {
            refreshInterval: 30000, // Refresh every 30 seconds
            revalidateOnFocus: true,
        }
    );

    return {
        attendance: data,
        isLoading,
        error,
        refetch: mutate,
    };
}

/**
 * Hook to get attendance for a specific date
 * @param employeeId - Employee ID
 * @param date - Date string in format 'YYYY-MM-DD'
 */
export function useAttendanceForDate(
    employeeId: string | undefined,
    date: string | undefined
) {
    const key = employeeId && date ? `attendance:date:${employeeId}:${date}` : null;

    const { data, error, isLoading, mutate } = useSWR(
        key,
        () => (employeeId && date ? getAttendanceForDate(employeeId, date) : null),
        {
            revalidateOnFocus: false,
        }
    );

    return {
        attendance: data,
        isLoading,
        error,
        refetch: mutate,
    };
}

/**
 * Hook to get attendance history for a date range
 * @param employeeId - Employee ID
 * @param startDate - Start date in format 'YYYY-MM-DD'
 * @param endDate - End date in format 'YYYY-MM-DD'
 */
export function useAttendanceHistory(
    employeeId: string | undefined,
    startDate: string | undefined,
    endDate: string | undefined
) {
    const key =
        employeeId && startDate && endDate
            ? `attendance:range:${employeeId}:${startDate}:${endDate}`
            : null;

    const { data, error, isLoading, mutate } = useSWR(
        key,
        () =>
            employeeId && startDate && endDate
                ? getAttendanceForRange(employeeId, startDate, endDate)
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
 * Hook to get live work stats (for dashboard)
 * @param employeeId - Employee ID
 */
export function useWorkStats(employeeId: string | undefined, hoursPerDay: number = 8) {
    const { attendance, isLoading, error, refetch } = useTodayAttendance(employeeId);

    // Calculate work stats
    const workHours = attendance ? calculateWorkHours(attendance) : 0;
    const workProgress = attendance ? calculateWorkProgress(attendance, hoursPerDay) : 0;
    const workDuration = attendance ? formatWorkDuration(attendance) : "00:00:00";

    // Check if overtime
    const isOvertime = workHours > hoursPerDay;

    // Calculate time remaining
    let timeRemaining: string | null = null;
    if (attendance && !attendance.clock_out_time) {
        const remainingHours = Math.max(0, hoursPerDay - workHours);
        if (isOvertime) {
            const overtimeHours = workHours - hoursPerDay;
            const hours = Math.floor(overtimeHours);
            const minutes = Math.round((overtimeHours - hours) * 60);
            timeRemaining = `ทำงานเกินมา ${hours} ชม. ${minutes} นาที`;
        } else {
            const hours = Math.floor(remainingHours);
            const minutes = Math.round((remainingHours - hours) * 60);
            timeRemaining = `เหลืออีก ${hours} ชม. ${minutes} นาที`;
        }
    }

    return {
        attendance,
        workHours,
        workProgress,
        workDuration,
        isOvertime,
        timeRemaining,
        isLoading,
        error,
        refetch,
    };
}
