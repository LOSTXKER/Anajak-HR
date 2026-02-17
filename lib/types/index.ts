/**
 * Central Type Definitions for Anajak HR
 * =============================================
 * All shared types/interfaces should be defined here
 */

// Result type for service operations
export * from "./result";

// =============================================
// DATABASE ENTITIES
// =============================================

export interface Employee {
    id: string;
    name: string;
    email: string;
    role: "admin" | "employee";
    branch_id: string | null;
    base_salary: number;
    commission: number;
    is_system_account?: boolean;
    phone?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Branch {
    id: string;
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    radius_meters?: number;
    created_at?: string;
}

export interface AttendanceLog {
    id: string;
    employee_id: string;
    work_date: string;
    clock_in_time: string | null;
    clock_out_time: string | null;
    clock_in_location?: { lat: number; lng: number } | null;
    clock_out_location?: { lat: number; lng: number } | null;
    clock_in_photo_url?: string | null;
    clock_out_photo_url?: string | null;
    is_late?: boolean;
    late_minutes?: number;
    created_at?: string;
    // Joined data
    employee?: Employee;
}

export interface OTRequest {
    id: string;
    employee_id: string;
    request_date: string;
    requested_start_time: string;
    requested_end_time: string;
    approved_start_time?: string | null;
    approved_end_time?: string | null;
    reason: string;
    status: "pending" | "approved" | "rejected" | "cancelled" | "completed";
    before_photo_url?: string | null;
    after_photo_url?: string | null;
    actual_start_time?: string | null;
    actual_end_time?: string | null;
    actual_ot_hours?: number | null;
    ot_type?: "workday" | "weekend" | "holiday";
    ot_rate?: number | null;
    ot_amount?: number | null;
    approved_by?: string | null;
    approved_at?: string | null;
    cancelled_by?: string | null;
    cancelled_at?: string | null;
    cancel_reason?: string | null;
    created_at?: string;
    // Joined data
    employee?: Employee;
}

export interface LeaveRequest {
    id: string;
    employee_id: string;
    leave_type: "annual" | "sick" | "personal" | "maternity" | "other";
    start_date: string;
    end_date: string;
    is_half_day: boolean;
    reason: string;
    status: "pending" | "approved" | "rejected" | "cancelled";
    approved_by?: string | null;
    approved_at?: string | null;
    cancelled_by?: string | null;
    cancelled_at?: string | null;
    cancel_reason?: string | null;
    created_at?: string;
    // Joined data
    employee?: Employee;
}

export interface WFHRequest {
    id: string;
    employee_id: string;
    request_date: string;
    reason: string;
    status: "pending" | "approved" | "rejected" | "cancelled";
    approved_by?: string | null;
    approved_at?: string | null;
    cancelled_by?: string | null;
    cancelled_at?: string | null;
    cancel_reason?: string | null;
    created_at?: string;
    // Joined data
    employee?: Employee;
}

export interface LateRequest {
    id: string;
    employee_id: string;
    request_date: string;
    reason: string;
    status: "pending" | "approved" | "rejected" | "cancelled";
    approved_by?: string | null;
    approved_at?: string | null;
    cancelled_by?: string | null;
    cancelled_at?: string | null;
    cancel_reason?: string | null;
    created_at?: string;
    // Joined data
    employee?: Employee;
}

export interface Holiday {
    id: string;
    name: string;
    date: string;
    type: "public" | "company" | "branch";
    branch_id?: string | null;
    is_active: boolean;
    created_at?: string;
}

export interface SystemSetting {
    id: string;
    setting_key: string;
    setting_value: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
}

// =============================================
// SETTINGS TYPES
// =============================================

export interface WorkSettings {
    workStartTime: string;
    workEndTime: string;
    hoursPerDay: number;
    checkinTimeStart: string;
    checkinTimeEnd: string;
    checkoutTimeStart: string;
    checkoutTimeEnd: string;
    lateThreshold: number;
    workingDays: number[];
}

export interface OTSettings {
    otRateWorkday: number;
    otRateWeekend: number;
    otRateHoliday: number;
    requireCheckinWorkday: boolean;
    requireCheckinWeekend: boolean;
    requireCheckinHoliday: boolean;
}

export interface AllSettings extends WorkSettings, OTSettings {
    requirePhoto: boolean;
    requireGPS: boolean;
    requireAccountApproval: boolean;
    enableNotifications: boolean;
    latePenaltyPerMinute: number;
    daysPerMonth: number;
}

// =============================================
// DAY / HOLIDAY TYPES
// =============================================

export type DayType = "holiday" | "weekend" | "workday";

export interface DayInfo {
    type: DayType;
    holidayName?: string;
}

export interface OTRateInfo {
    rate: number;
    type: DayType;
    typeName: string;
    requireCheckin: boolean;
    holidayName?: string;
}

// =============================================
// PAYROLL TYPES
// =============================================

export interface PayrollData {
    employee: Employee;
    workDays: number;
    totalWorkHours: number;
    lateDays: number;
    lateMinutes: number;
    leaveDays: number;
    // OT breakdown
    ot1xHours: number;
    ot1xAmount: number;
    ot15xHours: number;
    ot15xAmount: number;
    ot2xHours: number;
    ot2xAmount: number;
    otTotalAmount: number;
    // Summary
    basePay: number;
    commission: number;
    latePenalty: number;
    totalPay: number;
}

export interface OTDetailData {
    id: string;
    request_date: string;
    actual_ot_hours: number;
    ot_amount: number;
    ot_rate: number;
    ot_type: string;
}

export interface PayrollFilters {
    employeeId?: string;
    branchId?: string;
    searchTerm?: string;
}

export interface PayrollSummary {
    totalEmployees: number;
    totalBasePay: number;
    totalCommission: number;
    totalOT: number;
    totalDeductions: number;
    grandTotal: number;
}

// =============================================
// DASHBOARD / STATS TYPES
// =============================================

export interface DashboardStats {
    totalEmployees: number;
    present: number;
    absent: number;
    pendingOT: number;
    pendingLeave: number;
    pendingWFH: number;
}

export interface MonitorStats {
    totalEmployees: number;
    checkedIn: number;
    checkedOut: number;
    notCheckedIn: number;
    late: number;
    onOT: number;
    pendingOT: number;
    pendingLeave: number;
    pendingWFH: number;
}

// =============================================
// API / RESPONSE TYPES
// =============================================

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// =============================================
// LOCATION TYPES
// =============================================

export interface Location {
    lat: number;
    lng: number;
}

export interface LocationWithAccuracy extends Location {
    accuracy?: number;
}

// =============================================
// FORM DATA TYPES
// =============================================

export interface OTRequestFormData {
    date: string;
    startTime: string;
    endTime: string;
    reason: string;
}

export interface LeaveRequestFormData {
    leaveType: LeaveRequest["leave_type"];
    startDate: string;
    endDate: string;
    isHalfDay: boolean;
    reason: string;
}

export interface WFHRequestFormData {
    date: string;
    reason: string;
}

// =============================================
// API RESPONSE TYPES (additional)
// =============================================

export type { ServiceResult } from "./api";
