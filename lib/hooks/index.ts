/**
 * Hooks Index
 * =============================================
 * Re-export all hooks for easy importing
 */

// Settings Hooks
export {
    useSettings,
    useWorkSettings,
    useOTSettings,
} from "./use-settings";

// Attendance Hooks
export {
    useTodayAttendance,
    useAttendanceForDate,
    useAttendanceHistory,
    useWorkStats,
} from "./use-attendance";

// OT Hooks
export {
    useActiveOT,
    usePendingOT,
    useOTRequest,
    useOTHistory,
    useOTStatus,
} from "./use-ot";

// Holiday Hooks
export {
    useTodayHoliday,
    useUpcomingHolidays,
    useHolidaysForMonth,
    useDayType,
    useTodayDayType,
} from "./use-holidays";

// Dashboard Hook (combined)
export { useDashboard } from "./use-dashboard";
