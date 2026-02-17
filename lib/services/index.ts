/**
 * Services Index
 * =============================================
 * Re-export all services for easy importing
 */

// Settings Service
export {
    getSystemSettings,
    getWorkSettings,
    getOTSettings,
    updateSetting,
    updateSettings,
    invalidateSettingsCache,
    getSetting,
} from "./settings.service";

// Holiday Service
export {
    getWorkingDays,
    isWeekend,
    isHoliday,
    getDayType,
    getOTRateForDate,
    getHolidaysInRange,
    getTodayHoliday,
    getUpcomingHolidays,
    isWorkingDay,
    calculateOTAmount,
    invalidateHolidayCache,
} from "./holiday.service";

// Attendance Service
export {
    getTodayAttendance,
    getAttendanceForDate,
    getAttendanceForRange,
    checkIn,
    checkOut,
    calculateWorkHours,
    calculateWorkProgress,
    formatWorkDuration,
    getAllAttendanceForDate,
    createOrUpdateAttendance,
} from "./attendance.service";

// OT Service
export {
    getActiveOT,
    getPendingOT,
    getOTRequest,
    requestOT,
    createOTRequest,
    startOT,
    endOT,
    approveOT,
    rejectOT,
    getOTHistory,
    getAllOTRequests,
    getCompletedOTForPayroll,
    formatOTDuration,
} from "./ot.service";

// Leave Service
export {
    requestLeave,
    createLeaveRequest,
    getLeaveRequest,
    getLeaveHistory,
    getPendingLeave,
    approveLeave,
    rejectLeave,
    calculateLeaveDays,
    getAllLeaveRequests,
    cancelLeave,
} from "./leave.service";

// WFH Service
export {
    requestWFH,
    getWFHRequest,
    getWFHHistory,
    getPendingWFH,
    approveWFH,
    rejectWFH,
    getAllWFHRequests,
    cancelWFH,
    isTodayWFH,
} from "./wfh.service";

// Late Request Service
export {
    getLateRequests,
    getLateAttendances,
    createLateRequest,
    cancelLateRequest,
    approveLateRequest,
    rejectLateRequest,
} from "./late-request.service";
export type { LateRequest, LateAttendance, CreateLateRequestData } from "./late-request.service";

// Field Work Service
export {
    getFieldWorkRequests,
    checkExistingFieldWorkRequest,
    createFieldWorkRequest,
    cancelFieldWorkRequest,
    approveFieldWorkRequest,
    rejectFieldWorkRequest,
} from "./field-work.service";
export type { FieldWorkRequest, CreateFieldWorkRequestData } from "./field-work.service";

// Announcement Service
export {
    getActiveAnnouncements,
    getAllAnnouncements,
    getAnnouncementsWithReadStatus,
    getAnnouncementById,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    toggleAnnouncementActive,
    markAnnouncementAsRead,
    getUnreadAnnouncementCount,
} from "./announcement.service";
export type { Announcement, AnnouncementWithReadStatus, CreateAnnouncementData } from "./announcement.service";

// Notification Service (centralized)
export {
    sendRequestNotification,
    sendCheckinNotification,
    sendCheckoutNotification,
    sendPushNotification,
} from "./notification.service";
