/**
 * Field Work Service
 * =============================================
 * Handles all field work request operations
 */

import { supabase } from "@/lib/supabase/client";
import {
  checkAutoApprove,
  applyAutoApproveFields,
  AUTO_APPROVE_SETTINGS,
} from "@/lib/utils/auto-approve";

// Types
export interface FieldWorkRequest {
  id: string;
  employee_id: string;
  date: string;
  is_half_day: boolean;
  reason: string;
  location: string;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface CreateFieldWorkRequestData {
  employee_id: string;
  date: string;
  is_half_day: boolean;
  reason: string;
  location: string;
}

// Result types
interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

/**
 * Get field work requests for an employee
 */
export async function getFieldWorkRequests(
  employeeId: string,
  limit = 20
): Promise<ServiceResult<FieldWorkRequest[]>> {
  try {
    const { data, error } = await supabase
      .from("field_work_requests")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch field work requests";
    return { data: null, error: message };
  }
}

/**
 * Check if a field work request already exists for a date
 */
export async function checkExistingFieldWorkRequest(
  employeeId: string,
  date: string
): Promise<ServiceResult<boolean>> {
  try {
    const { data, error } = await supabase
      .from("field_work_requests")
      .select("id")
      .eq("employee_id", employeeId)
      .eq("date", date)
      .in("status", ["pending", "approved"]);

    if (error) throw error;
    return { data: (data?.length || 0) > 0, error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to check existing request";
    return { data: null, error: message };
  }
}

/**
 * Create a field work request with auto-approve support
 */
export async function createFieldWorkRequest(
  data: CreateFieldWorkRequestData
): Promise<ServiceResult<FieldWorkRequest>> {
  try {
    // Check for existing request
    const existingResult = await checkExistingFieldWorkRequest(
      data.employee_id,
      data.date
    );
    if (existingResult.data) {
      return { data: null, error: "มีคำขอปฏิบัติงานนอกสถานที่ในวันนี้แล้ว" };
    }

    // Check auto approve setting
    const isAutoApprove = await checkAutoApprove(AUTO_APPROVE_SETTINGS.FIELD_WORK);

    // Build insert data with auto-approve fields
    const baseData = {
      employee_id: data.employee_id,
      date: data.date,
      is_half_day: data.is_half_day,
      reason: data.reason,
      location: data.location,
    };

    const insertData = await applyAutoApproveFields(baseData, isAutoApprove);

    const { data: result, error } = await supabase
      .from("field_work_requests")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return { data: result, error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create field work request";
    return { data: null, error: message };
  }
}

/**
 * Cancel a field work request (by employee)
 */
export async function cancelFieldWorkRequest(
  requestId: string,
  employeeId: string
): Promise<ServiceResult<boolean>> {
  try {
    const { error } = await supabase
      .from("field_work_requests")
      .update({ status: "cancelled" })
      .eq("id", requestId)
      .eq("employee_id", employeeId);

    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel field work request";
    return { data: null, error: message };
  }
}

/**
 * Approve a field work request (admin)
 */
export async function approveFieldWorkRequest(
  requestId: string,
  adminId: string
): Promise<ServiceResult<boolean>> {
  try {
    const { error } = await supabase
      .from("field_work_requests")
      .update({
        status: "approved",
        approved_by: adminId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to approve field work request";
    return { data: null, error: message };
  }
}

/**
 * Reject a field work request (admin)
 */
export async function rejectFieldWorkRequest(
  requestId: string,
  adminId: string
): Promise<ServiceResult<boolean>> {
  try {
    const { error } = await supabase
      .from("field_work_requests")
      .update({
        status: "rejected",
        approved_by: adminId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reject field work request";
    return { data: null, error: message };
  }
}
