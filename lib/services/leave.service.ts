/**
 * Leave Service
 * =============================================
 * Service for Leave Request operations
 */

import { supabase } from "@/lib/supabase/client";
import { format, differenceInCalendarDays, parseISO, eachDayOfInterval, isWeekend } from "date-fns";
import { isHoliday, getWorkingDays } from "./holiday.service";
import type { LeaveRequest } from "@/lib/types";

/**
 * Request new leave
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
): Promise<{ success: boolean; data?: LeaveRequest; error?: string }> {
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

        return { success: true, data: result as LeaveRequest };
    } catch (error) {
        console.error("Error requesting leave:", error);
        return { success: false, error: "Failed to submit leave request" };
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
export async function approveLeave(
    leaveId: string,
    adminId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from("leave_requests")
            .update({
                status: "approved",
                approved_by: adminId,
                approved_at: new Date().toISOString(),
            })
            .eq("id", leaveId);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error("Error approving leave:", error);
        return { success: false, error: "Failed to approve leave" };
    }
}

/**
 * Reject leave request (admin)
 */
export async function rejectLeave(
    leaveId: string,
    adminId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from("leave_requests")
            .update({
                status: "rejected",
                approved_by: adminId,
                approved_at: new Date().toISOString(),
            })
            .eq("id", leaveId);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error("Error rejecting leave:", error);
        return { success: false, error: "Failed to reject leave" };
    }
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
    const workingDays = await getWorkingDays();

    // Get all days in range
    const days = eachDayOfInterval({ start, end });

    let count = 0;
    for (const day of days) {
        const dayOfWeek = day.getDay();
        const ourDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

        // Skip if not a working day
        if (!workingDays.includes(ourDayOfWeek)) {
            continue;
        }

        // Skip if holiday
        const dateStr = format(day, "yyyy-MM-dd");
        const holiday = await isHoliday(dateStr, branchId);
        if (holiday) {
            continue;
        }

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
export async function cancelLeave(leaveId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from("leave_requests")
            .update({ status: "cancelled" })
            .eq("id", leaveId);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error("Error cancelling leave:", error);
        return { success: false, error: "Failed to cancel leave" };
    }
}
