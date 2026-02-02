/**
 * Status Constants
 * =============================================
 * Status values used throughout the application
 */

/**
 * Request status values
 * Used for: OT, Leave, WFH, Field Work, Late requests
 */
export const REQUEST_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
} as const;

export type RequestStatus = typeof REQUEST_STATUS[keyof typeof REQUEST_STATUS];

/**
 * Account status values
 * Used for: Employee account approval
 */
export const ACCOUNT_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  SUSPENDED: "suspended",
  REJECTED: "rejected",
} as const;

export type AccountStatus = typeof ACCOUNT_STATUS[keyof typeof ACCOUNT_STATUS];

/**
 * Employee roles
 */
export const EMPLOYEE_ROLE = {
  ADMIN: "admin",
  SUPERVISOR: "supervisor",
  STAFF: "staff",
} as const;

export type EmployeeRole = typeof EMPLOYEE_ROLE[keyof typeof EMPLOYEE_ROLE];

/**
 * Leave types
 */
export const LEAVE_TYPE = {
  SICK: "sick",
  PERSONAL: "personal",
  ANNUAL: "annual",
  MATERNITY: "maternity",
  MILITARY: "military",
  OTHER: "other",
} as const;

export type LeaveType = typeof LEAVE_TYPE[keyof typeof LEAVE_TYPE];

/**
 * OT types
 */
export const OT_TYPE = {
  WORKDAY: "workday",
  WEEKEND: "weekend",
  HOLIDAY: "holiday",
} as const;

export type OTType = typeof OT_TYPE[keyof typeof OT_TYPE];

/**
 * Day types
 */
export const DAY_TYPE = {
  WORKDAY: "workday",
  WEEKEND: "weekend",
  HOLIDAY: "holiday",
} as const;

export type DayType = typeof DAY_TYPE[keyof typeof DAY_TYPE];

/**
 * Announcement priority levels
 */
export const ANNOUNCEMENT_PRIORITY = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  URGENT: "urgent",
} as const;

export type AnnouncementPriority = typeof ANNOUNCEMENT_PRIORITY[keyof typeof ANNOUNCEMENT_PRIORITY];

/**
 * Announcement categories
 */
export const ANNOUNCEMENT_CATEGORY = {
  GENERAL: "general",
  HR: "hr",
  PAYROLL: "payroll",
  HOLIDAY: "holiday",
  URGENT: "urgent",
} as const;

export type AnnouncementCategory = typeof ANNOUNCEMENT_CATEGORY[keyof typeof ANNOUNCEMENT_CATEGORY];

/**
 * Holiday types
 */
export const HOLIDAY_TYPE = {
  PUBLIC: "public",
  COMPANY: "company",
  BRANCH: "branch",
} as const;

export type HolidayType = typeof HOLIDAY_TYPE[keyof typeof HOLIDAY_TYPE];
