/**
 * Leave Service
 * =============================================
 * Service for Leave Request operations
 */

import { supabase } from "@/lib/supabase/client";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { getWorkingDays, getHolidaysInRange } from "./holiday.service";
import { checkAutoApprove, applyAutoApproveFields, AUTO_APPROVE_SETTINGS } from "@/lib/utils/auto-approve";
import { Result, success, error as resultError } from "@/lib/types/result";
import { updateRequestStatus } from "./request-status.service";
import type { LeaveRequest } from "@/lib/types";

/**
 * Request new leave (legacy - always pending)
 */
export async function requestLeave(
    employeeId: string,
    data: {
        leaveType: LeaveRequest["leave_type"];
        startDate: string;
        endDate: string;
        isHalfDay: boolean;
        reason: string;
    }
): Promise<Result<LeaveRequest>> {
    try {
        const { data: result, error } = await supabase
            .from("leave_requests")
            .insert({
                employee_id: employeeId,
                leave_type: data.leaveType,
                start_date: data.startDate,
                end_date: data.endDate,
                is_half_day: data.isHalfDay,
                reason: data.reason,
                status: "pending",
            })
            .select()
            .single();

        if (error) throw error;
        return success(result as LeaveRequest);
    } catch (err: any) {
        console.error("Error requesting leave:", err);
        return resultError(err.message || "Failed to submit leave request");
    }
}

/**
 * Create leave request with auto-approve support
 */
export async function createLeaveRequest(
    employeeId: string,
    data: {
        leaveType: LeaveRequest["leave_type"];
        startDate: string;
        endDate: string;
        isHalfDay: boolean;
        reason: string;
        attachmentUrl?: string | null;
    }
): Promise<Result<LeaveRequest & { isAutoApproved: boolean }>> {
    try {
        const isAutoApprove = await checkAutoApprove(AUTO_APPROVE_SETTINGS.LEAVE);

        const baseData = {
            employee_id: employeeId,
            leave_type: data.leaveType,
            start_date: data.startDate,
            end_date: data.endDate,
            is_half_day: data.isHalfDay,
            reason: data.reason,
            attachment_url: data.attachmentUrl || null,
        };

        const insertData = await applyAutoApproveFields(baseData, isAutoApprove);

        const { data: result, error } = await supabase
            .from("leave_requests")
            .insert(insertData)
            .select()
            .single();

        if (error) throw error;
        return success({ ...(result as LeaveRequest), isAutoApproved: isAutoApprove });
    } catch (err: any) {
        console.error("Error creating leave request:", err);
        return resultError(err.message || "Failed to submit leave request");
    }
}

/**
 * Get leave request by ID
 */
export async function getLeaveRequest(leaveId: string): Promise<LeaveRequest | null> {
    try {
        const { data, error } = await supabase
            .from("leave_requests")
            .select("*, employee:employees(*)")
            .eq("id", leaveId)
            .maybeSingle();

        if (error) throw error;

        return data as LeaveRequest | null;
    } catch (error) {
        console.error("Error fetching leave request:", error);
        return null;
    }
}

/**
 * Get leave history for an employee
 */
export async function getLeaveHistory(
    employeeId: string,
    startDate: string,
    endDate: string
): Promise<LeaveRequest[]> {
    try {
        const { data, error } = await supabase
            .from("leave_requests")
            .select("*")
            .eq("employee_id", employeeId)
            .gte("start_date", startDate)
            .lte("end_date", endDate)
            .order("start_date", { ascending: false });

        if (error) throw error;

        return (data || []) as LeaveRequest[];
    } catch (error) {
        console.error("Error fetching leave history:", error);
        return [];
    }
}

/**
 * Get pending leave requests for an employee
 */
export async function getPendingLeave(employeeId: string): Promise<LeaveRequest[]> {
    try {
        const { data, error } = await supabase
            .from("leave_requests")
            .select("*")
            .eq("employee_id", employeeId)
            .eq("status", "pending")
            .order("start_date", { ascending: true });

        if (error) throw error;

        return (data || []) as LeaveRequest[];
    } catch (error) {
        console.error("Error fetching pending leave:", error);
        return [];
    }
}

/**
 * Approve leave request (admin)
 */
export async function approveLeave(leaveId: string, adminId: string): Promise<Result<true>> {
    return updateRequestStatus("leave_requests", leaveId, "approved", adminId);
}

/**
 * Reject leave request (admin)
 */
export async function rejectLeave(leaveId: string, adminId: string): Promise<Result<true>> {
    return updateRequestStatus("leave_requests", leaveId, "rejected", adminId);
}

/**
 * Calculate working days between two dates (excluding weekends and holidays)
 */
export async function calculateLeaveDays(
    startDate: string,
    endDate: string,
    isHalfDay: boolean = false,
    branchId?: string
): Promise<number> {
    if (isHalfDay) {
        return 0.5;
    }

    const start = parseISO(startDate);
    const end = parseISO(endDate);

    const [workingDays, holidays] = await Promise.all([
        getWorkingDays(),
        getHolidaysInRange(startDate, endDate, branchId),
    ]);

    const holidayDates = new Set(holidays.map((h) => h.date));
    const days = eachDayOfInterval({ start, end });

    let count = 0;
    for (const day of days) {
        const dayOfWeek = day.getDay();
        const ourDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

        if (!workingDays.includes(ourDayOfWeek)) continue;

        const dateStr = format(day, "yyyy-MM-dd");
        if (holidayDates.has(dateStr)) continue;

        count++;
    }

    return count;
}

/**
 * Get all leave requests (admin)
 */
export async function getAllLeaveRequests(
    startDate: string,
    endDate: string,
    status?: string
): Promise<LeaveRequest[]> {
    try {
        let query = supabase
            .from("leave_requests")
            .select("*, employee:employees(*)")
            .gte("start_date", startDate)
            .lte("end_date", endDate)
            .order("start_date", { ascending: false });

        if (status) {
            query = query.eq("status", status);
        }

        const { data, error } = await query;

        if (error) throw error;

        return (data || []) as LeaveRequest[];
    } catch (error) {
        console.error("Error fetching all leave requests:", error);
        return [];
    }
}

/**
 * Cancel leave request
 */
export async function cancelLeave(leaveId: string): Promise<Result<true>> {
    try {
        const { error } = await supabase
            .from("leave_requests")
            .update({ status: "cancelled" })
            .eq("id", leaveId);

        if (error) throw error;
        return success(true as const);
    } catch (err: any) {
        console.error("Error cancelling leave:", err);
        return resultError(err.message || "Failed to cancel leave");
    }
}
