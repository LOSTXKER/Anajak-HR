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

// Admin Hooks
export { useAdminRedirect } from "./use-admin-redirect";
export { usePendingCounts } from "./use-pending-counts";

// Camera & Location Hooks
export { useCamera } from "./use-camera";
export { useLocation } from "./use-location";

// Form Hooks
export { useFormSubmit } from "./use-form-submit";

// Announcement Hooks
export { useUnreadAnnouncements } from "./use-unread-announcements";

// Admin Request Hooks
export { useRequests } from "./use-requests";
export { useRequestsQuery } from "./use-requests-query";
export { useRequestFilters } from "./use-request-filters";

// Admin Employee Hooks
export { useEmployees } from "./use-employees";
export { useEmployeeDetail } from "./use-employee-detail";

// Admin Report Data Hook
export { useReportData } from "./use-report-data";

// Admin Attendance Hook
export { useAttendanceAdmin } from "./use-attendance-admin";

// Admin Payroll Hook
export { usePayroll } from "./use-payroll";

// Admin Monitor Hook
export { useMonitor } from "./use-monitor";
