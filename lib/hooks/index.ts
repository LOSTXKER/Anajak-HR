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

// Camera Hooks
export { useCameraCapture } from "./use-camera-capture";

// Announcement Hooks
export { useUnreadAnnouncements } from "./use-unread-announcements";

// Admin Request Hooks (unified)
export { useRequests } from "./use-requests";
// Legacy hooks (kept for backward compatibility)
export { useAdminRequests } from "./use-admin-requests";
export { useRequestFetching } from "./use-request-fetching";
export { useRequestActions } from "./use-request-actions";
export { useRequestFilters } from "./use-request-filters";

// Admin Employee Hooks
export { useEmployees } from "./use-employees";

// Admin Approval Hooks (deprecated, redirects to /admin/requests)
export { useApprovals } from "./use-approvals";

// Admin Employee Detail Hook
export { useEmployeeDetail } from "./use-employee-detail";

// Admin Report Data Hook
export { useReportData } from "./use-report-data";

// Admin Attendance Hook
export { useAttendanceAdmin } from "./use-attendance-admin";

// Admin Payroll Hook
export { usePayroll } from "./use-payroll";

// Admin Monitor Hook
export { useMonitor } from "./use-monitor";
