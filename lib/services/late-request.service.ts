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
import { Result, success, error as resultError } from "@/lib/types/result";
import { updateRequestStatus } from "./request-status.service";
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

/**
 * Get late requests for an employee
 */
export async function getLateRequests(
  employeeId: string,
  limit = 20
): Promise<Result<LateRequest[]>> {
  try {
    const { data, error } = await supabase
      .from("late_requests")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return success(data || []);
  } catch (err: any) {
    return resultError(err.message || "Failed to fetch late requests");
  }
}

/**
 * Get late attendances (for selecting which date to request)
 */
export async function getLateAttendances(
  employeeId: string,
  daysBack = 30
): Promise<Result<LateAttendance[]>> {
  try {
    const startDate = format(subDays(new Date(), daysBack), "yyyy-MM-dd");

    const { data: attendanceData, error: attendanceError } = await supabase
      .from("attendance_logs")
      .select("id, work_date, clock_in_time, is_late, late_minutes")
      .eq("employee_id", employeeId)
      .eq("is_late", true)
      .gte("work_date", startDate)
      .order("work_date", { ascending: false });

    if (attendanceError) throw attendanceError;

    const { data: existingRequests, error: requestsError } = await supabase
      .from("late_requests")
      .select("request_date")
      .eq("employee_id", employeeId)
      .in("status", ["approved", "pending"]);

    if (requestsError) throw requestsError;

    const approvedDates = new Set(
      (existingRequests || []).map((r: { request_date: string }) => r.request_date)
    );

    return success(
      (attendanceData || []).filter((a: LateAttendance) => !approvedDates.has(a.work_date))
    );
  } catch (err: any) {
    return resultError(err.message || "Failed to fetch late attendances");
  }
}

/**
 * Create a late request with auto-approve support
 */
export async function createLateRequest(
  data: CreateLateRequestData
): Promise<Result<LateRequest>> {
  try {
    const isAutoApprove = await checkAutoApprove(AUTO_APPROVE_SETTINGS.LATE);

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
    return success(result as LateRequest);
  } catch (err: any) {
    return resultError(err.message || "Failed to create late request");
  }
}

/**
 * Cancel a late request (by employee)
 */
export async function cancelLateRequest(
  requestId: string,
  employeeId: string
): Promise<Result<true>> {
  try {
    const { error } = await supabase
      .from("late_requests")
      .update({ status: "cancelled" })
      .eq("id", requestId)
      .eq("employee_id", employeeId)
      .eq("status", "pending");

    if (error) throw error;
    return success(true as const);
  } catch (err: any) {
    return resultError(err.message || "Failed to cancel late request");
  }
}

/**
 * Approve a late request (admin)
 */
export async function approveLateRequest(
  requestId: string,
  adminId: string,
  note?: string
): Promise<Result<true>> {
  const extraFields = note ? { admin_note: note } : undefined;
  return updateRequestStatus("late_requests", requestId, "approved", adminId, extraFields);
}

/**
 * Reject a late request (admin)
 */
export async function rejectLateRequest(
  requestId: string,
  adminId: string,
  note?: string
): Promise<Result<true>> {
  const extraFields = note ? { admin_note: note } : undefined;
  return updateRequestStatus("late_requests", requestId, "rejected", adminId, extraFields);
}
