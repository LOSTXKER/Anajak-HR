/**
 * Late Request Service
 * =============================================
 * Handles all late request operations
 */

import { supabase } from "@/lib/supabase/client";
import {
  checkAutoApprove,
  applyAutoApproveFields,
  AUTO_APPROVE_SETTINGS,
} from "@/lib/utils/auto-approve";
import { format, subDays } from "date-fns";

// Types
export interface LateRequest {
  id: string;
  employee_id: string;
  request_date: string;
  reason: string;
  status: string;
  actual_late_minutes: number | null;
  admin_note: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface LateAttendance {
  id: string;
  work_date: string;
  clock_in_time: string;
  is_late: boolean;
  late_minutes: number | null;
}

export interface CreateLateRequestData {
  employee_id: string;
  request_date: string;
  reason: string;
  actual_late_minutes?: number | null;
}

// Result types
interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

/**
 * Get late requests for an employee
 */
export async function getLateRequests(
  employeeId: string,
  limit = 20
): Promise<ServiceResult<LateRequest[]>> {
  try {
    const { data, error } = await supabase
      .from("late_requests")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch late requests";
    return { data: null, error: message };
  }
}

/**
 * Get late attendances (for selecting which date to request)
 */
export async function getLateAttendances(
  employeeId: string,
  daysBack = 30
): Promise<ServiceResult<LateAttendance[]>> {
  try {
    const startDate = format(subDays(new Date(), daysBack), "yyyy-MM-dd");

    // Get late attendances
    const { data: attendanceData, error: attendanceError } = await supabase
      .from("attendance_logs")
      .select("id, work_date, clock_in_time, is_late, late_minutes")
      .eq("employee_id", employeeId)
      .eq("is_late", true)
      .gte("work_date", startDate)
      .order("work_date", { ascending: false });

    if (attendanceError) throw attendanceError;

    // Get existing pending/approved late requests
    const { data: existingRequests, error: requestsError } = await supabase
      .from("late_requests")
      .select("request_date")
      .eq("employee_id", employeeId)
      .in("status", ["approved", "pending"]);

    if (requestsError) throw requestsError;

    // Filter out dates that already have a request
    const approvedDates = new Set(
      (existingRequests || []).map((r: { request_date: string }) => r.request_date)
    );

    const filteredAttendances = (attendanceData || []).filter(
      (a: LateAttendance) => !approvedDates.has(a.work_date)
    );

    return { data: filteredAttendances, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch late attendances";
    return { data: null, error: message };
  }
}

/**
 * Create a late request with auto-approve support
 */
export async function createLateRequest(
  data: CreateLateRequestData
): Promise<ServiceResult<LateRequest>> {
  try {
    // Check auto approve setting
    const isAutoApprove = await checkAutoApprove(AUTO_APPROVE_SETTINGS.LATE);

    // Build insert data with auto-approve fields
    const baseData = {
      employee_id: data.employee_id,
      request_date: data.request_date,
      reason: data.reason,
      actual_late_minutes: data.actual_late_minutes || null,
    };

    const insertData = await applyAutoApproveFields(baseData, isAutoApprove);

    const { data: result, error } = await supabase
      .from("late_requests")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return { data: result, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create late request";
    return { data: null, error: message };
  }
}

/**
 * Cancel a late request (by employee)
 */
export async function cancelLateRequest(
  requestId: string,
  employeeId: string
): Promise<ServiceResult<boolean>> {
  try {
    const { error } = await supabase
      .from("late_requests")
      .update({ status: "cancelled" })
      .eq("id", requestId)
      .eq("employee_id", employeeId);

    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cancel late request";
    return { data: null, error: message };
  }
}

/**
 * Approve a late request (admin)
 */
export async function approveLateRequest(
  requestId: string,
  adminId: string,
  note?: string
): Promise<ServiceResult<boolean>> {
  try {
    const updateData: Record<string, unknown> = {
      status: "approved",
      approved_by: adminId,
      approved_at: new Date().toISOString(),
    };

    if (note) {
      updateData.admin_note = note;
    }

    const { error } = await supabase
      .from("late_requests")
      .update(updateData)
      .eq("id", requestId);

    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to approve late request";
    return { data: null, error: message };
  }
}

/**
 * Reject a late request (admin)
 */
export async function rejectLateRequest(
  requestId: string,
  adminId: string,
  note?: string
): Promise<ServiceResult<boolean>> {
  try {
    const updateData: Record<string, unknown> = {
      status: "rejected",
      approved_by: adminId,
      approved_at: new Date().toISOString(),
    };

    if (note) {
      updateData.admin_note = note;
    }

    const { error } = await supabase
      .from("late_requests")
      .update(updateData)
      .eq("id", requestId);

    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reject late request";
    return { data: null, error: message };
  }
}
