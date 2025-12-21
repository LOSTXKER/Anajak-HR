/**
 * Employee Dashboard Hook
 * =============================================
 * Combined hook for all dashboard data
 * This replaces the inline data fetching in page.tsx
 */

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useTodayAttendance, useWorkStats } from "./use-attendance";
import { useActiveOT, usePendingOT, useOTHistory } from "./use-ot";
import { useTodayHoliday, useUpcomingHolidays, useTodayDayType } from "./use-holidays";
import { useWorkSettings } from "./use-settings";
import { formatOTDuration } from "@/lib/services/ot.service";
import { supabase } from "@/lib/supabase/client";
import { startOfMonth, endOfMonth, format } from "date-fns";

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
    const { dayInfo: todayDayInfo, isWeekend: isTodayWeekend, isLoading: loadingDayType } = useTodayDayType(employee?.branch_id ?? undefined);
    const { holidays: upcomingHolidays, isLoading: loadingUpcoming } = useUpcomingHolidays(30, 3);
    
    // ถ้าเป็น weekend หรือ holiday ถือว่าเป็น "วันหยุด" ทั้งหมด
    const isRestDay = !!todayHoliday || isTodayWeekend;

    // Monthly OT summary state
    const [monthlyOT, setMonthlyOT] = useState({ hours: 0, amount: 0 });
    const [loadingMonthlyOT, setLoadingMonthlyOT] = useState(false);

    // Leave balance state
    const [leaveBalance, setLeaveBalance] = useState<{
        annual_remaining: number;
        sick_remaining: number;
        personal_remaining: number;
    } | null>(null);
    const [loadingLeaveBalance, setLoadingLeaveBalance] = useState(false);

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

    // Fetch monthly OT summary
    useEffect(() => {
        if (!employee?.id) return;

        const fetchMonthlyOT = async () => {
            setLoadingMonthlyOT(true);
            try {
                const now = new Date();
                const startDate = format(startOfMonth(now), "yyyy-MM-dd");
                const endDate = format(endOfMonth(now), "yyyy-MM-dd");

                const { data } = await supabase
                    .from("ot_requests")
                    .select("actual_ot_hours, ot_amount")
                    .eq("employee_id", employee.id)
                    .in("status", ["approved", "started", "completed"])
                    .gte("request_date", startDate)
                    .lte("request_date", endDate);

                if (data) {
                    const totalHours = data.reduce((sum: number, ot: any) => sum + (ot.actual_ot_hours || 0), 0);
                    const totalAmount = data.reduce((sum: number, ot: any) => sum + (ot.ot_amount || 0), 0);
                    setMonthlyOT({ hours: totalHours, amount: totalAmount });
                }
            } catch (error) {
                console.error("Error fetching monthly OT:", error);
            } finally {
                setLoadingMonthlyOT(false);
            }
        };

        fetchMonthlyOT();
    }, [employee?.id]);

    // Fetch leave balance
    useEffect(() => {
        if (!employee?.id) return;

        const fetchLeaveBalance = async () => {
            setLoadingLeaveBalance(true);
            try {
                const currentYear = new Date().getFullYear();
                const { data } = await supabase
                    .from("leave_balances")
                    .select("annual_leave_remaining, sick_leave_remaining, personal_leave_remaining")
                    .eq("employee_id", employee.id)
                    .eq("year", currentYear)
                    .single();

                if (data) {
                    setLeaveBalance({
                        annual_remaining: data.annual_leave_remaining || 0,
                        sick_remaining: data.sick_leave_remaining || 0,
                        personal_remaining: data.personal_leave_remaining || 0,
                    });
                }
            } catch (error) {
                console.error("Error fetching leave balance:", error);
            } finally {
                setLoadingLeaveBalance(false);
            }
        };

        fetchLeaveBalance();
    }, [employee?.id]);

    // Refresh all data
    const refetchAll = async () => {
        await Promise.all([
            refetchAttendance(),
            refetchActiveOT(),
            refetchPendingOT(),
        ]);
    };

    // Combined loading state
    const isLoading = loadingSettings || loadingAttendance || loadingActiveOT || loadingPendingOT || loadingTodayHoliday || loadingDayType || loadingUpcoming || loadingMonthlyOT || loadingLeaveBalance;

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
        monthlyOT,

        // Leave
        leaveBalance,

        // Holiday / Rest Day
        todayHoliday,
        isRestDay, // true ถ้าเป็นวันหยุดหรือ weekend
        isTodayWeekend,
        todayDayInfo,
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
    useTodayDayType,
    useUpcomingHolidays,
    useWorkSettings,
};
