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
