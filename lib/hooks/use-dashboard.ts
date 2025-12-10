/**
 * Employee Dashboard Hook
 * =============================================
 * Combined hook for all dashboard data
 * This replaces the inline data fetching in page.tsx
 */

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useTodayAttendance, useWorkStats } from "./use-attendance";
import { useActiveOT, usePendingOT } from "./use-ot";
import { useTodayHoliday, useUpcomingHolidays } from "./use-holidays";
import { useWorkSettings } from "./use-settings";
import { formatOTDuration } from "@/lib/services/ot.service";

/**
 * Combined hook for employee dashboard
 * Provides all data needed for the homepage
 */
export function useDashboard() {
    const { user, employee, loading, signOut } = useAuth();

    // Fetch all dashboard data with new hooks
    const { settings: workSettings, isLoading: loadingSettings } = useWorkSettings();
    const { attendance, workHours, workProgress, workDuration, isOvertime, timeRemaining, isLoading: loadingAttendance, refetch: refetchAttendance } = useWorkStats(employee?.id);
    const { activeOT, isLoading: loadingActiveOT, refetch: refetchActiveOT } = useActiveOT(employee?.id);
    const { pendingOT, isLoading: loadingPendingOT, refetch: refetchPendingOT } = usePendingOT(employee?.id);
    const { holiday: todayHoliday, isLoading: loadingTodayHoliday } = useTodayHoliday();
    const { holidays: upcomingHolidays, isLoading: loadingUpcoming } = useUpcomingHolidays(30, 3);

    // Live OT duration (updates every second)
    const [otDuration, setOtDuration] = useState("00:00:00");

    useEffect(() => {
        if (!activeOT?.actual_start_time) {
            setOtDuration("00:00:00");
            return;
        }

        const updateOTDuration = () => {
            setOtDuration(formatOTDuration(activeOT.actual_start_time as string));
        };

        updateOTDuration();
        const interval = setInterval(updateOTDuration, 1000);
        return () => clearInterval(interval);
    }, [activeOT]);

    // Refresh all data
    const refetchAll = async () => {
        await Promise.all([
            refetchAttendance(),
            refetchActiveOT(),
            refetchPendingOT(),
        ]);
    };

    // Combined loading state
    const isLoading = loadingSettings || loadingAttendance || loadingActiveOT || loadingPendingOT || loadingTodayHoliday || loadingUpcoming;

    return {
        // Auth
        user,
        employee,
        loading,
        signOut,

        // Attendance
        todayAttendance: attendance,
        workDuration,
        workProgress,
        isOvertime,
        timeRemaining,

        // OT
        activeOT,
        pendingOT,
        otDuration,

        // Holiday
        todayHoliday,
        upcomingHolidays,

        // Settings
        workSettings: workSettings || {
            workStartTime: "09:00",
            workEndTime: "18:00",
            hoursPerDay: 8,
            checkinTimeStart: "06:00",
            checkinTimeEnd: "12:00",
            checkoutTimeStart: "12:00",
            checkoutTimeEnd: "23:59",
            lateThreshold: 15,
            workingDays: [1, 2, 3, 4, 5],
        },

        // Status
        isLoading,
        refetchAll,
    };
}

// Re-export for backward compatibility
export {
    useTodayAttendance,
    useWorkStats,
    useActiveOT,
    usePendingOT,
    useTodayHoliday,
    useUpcomingHolidays,
    useWorkSettings,
};
