/**
 * OT Service
 * =============================================
 * Service for Overtime (OT) operations
 */

import { supabase } from "@/lib/supabase/client";
import { format, differenceInMinutes } from "date-fns";
import { getOTRateForDate } from "./holiday.service";
import { createOrUpdateAttendance } from "./attendance.service";
import { getSystemSettings } from "./settings.service";
import { checkAutoApprove, applyAutoApproveFields, AUTO_APPROVE_SETTINGS } from "@/lib/utils/auto-approve";
import { Result, success, error as resultError } from "@/lib/types/result";
import type { OTRequest, Location } from "@/lib/types";

/**
 * Get active OT session for an employee
 */
export async function getActiveOT(employeeId: string): Promise<OTRequest | null> {
    const today = format(new Date(), "yyyy-MM-dd");
    try {
        const { data, error } = await supabase
            .from("ot_requests")
            .select("*")
            .eq("employee_id", employeeId)
            .eq("request_date", today)
            .eq("status", "approved")
            .not("actual_start_time", "is", null)
            .is("actual_end_time", null)
            .maybeSingle();

        if (error) throw error;
        return data as OTRequest | null;
    } catch {
        return null;
    }
}

/**
 * Get pending OT requests ready to start (approved, not yet started)
 */
export async function getPendingOT(employeeId: string, date?: string): Promise<OTRequest[]> {
    const targetDate = date || format(new Date(), "yyyy-MM-dd");
    try {
        const { data, error } = await supabase
            .from("ot_requests")
            .select("*")
            .eq("employee_id", employeeId)
            .eq("request_date", targetDate)
            .eq("status", "approved")
            .is("actual_start_time", null)
            .order("requested_start_time", { ascending: true });

        if (error) throw error;
        return (data || []) as OTRequest[];
    } catch {
        return [];
    }
}

/**
 * Get OT request by ID
 */
export async function getOTRequest(otId: string): Promise<OTRequest | null> {
    try {
        const { data, error } = await supabase
            .from("ot_requests")
            .select("*")
            .eq("id", otId)
            .maybeSingle();

        if (error) throw error;
        return data as OTRequest | null;
    } catch {
        return null;
    }
}

/**
 * Request new OT (legacy - always pending)
 */
export async function requestOT(
    employeeId: string,
    data: { date: string; startTime: string; endTime: string; reason: string }
): Promise<Result<OTRequest>> {
    try {
        const { data: result, error } = await supabase
            .from("ot_requests")
            .insert({
                employee_id: employeeId,
                request_date: data.date,
                requested_start_time: `${data.date}T${data.startTime}:00`,
                requested_end_time: `${data.date}T${data.endTime}:00`,
                reason: data.reason,
                status: "pending",
            })
            .select()
            .single();

        if (error) throw error;
        return success(result as OTRequest);
    } catch (err: any) {
        return resultError(err.message || "Failed to submit OT request");
    }
}

/**
 * Create OT request with auto-approve support
 */
export async function createOTRequest(
    employeeId: string,
    data: { date: string; startTime: string; endTime: string; reason: string }
): Promise<Result<OTRequest & { isAutoApproved: boolean }>> {
    try {
        const isAutoApprove = await checkAutoApprove(AUTO_APPROVE_SETTINGS.OT);

        const startDateTime = new Date(`${data.date}T${data.startTime}:00`);
        const endDateTime = new Date(`${data.date}T${data.endTime}:00`);

        const baseData: Record<string, unknown> = {
            employee_id: employeeId,
            request_date: data.date,
            requested_start_time: startDateTime.toISOString(),
            requested_end_time: endDateTime.toISOString(),
            reason: data.reason,
        };

        if (isAutoApprove) {
            baseData.approved_start_time = startDateTime.toISOString();
            baseData.approved_end_time = endDateTime.toISOString();
        }

        const insertData = await applyAutoApproveFields(baseData, isAutoApprove);

        const { data: result, error } = await supabase
            .from("ot_requests")
            .insert(insertData)
            .select()
            .single();

        if (error) throw error;
        return success({ ...(result as OTRequest), isAutoApproved: isAutoApprove });
    } catch (err: any) {
        return resultError(err.message || "Failed to submit OT request");
    }
}

/**
 * Start an OT session (using atomic RPC to prevent race conditions)
 */
export async function startOT(
    otId: string,
    photoUrl: string,
    location?: Location | null
): Promise<Result<OTRequest>> {
    const now = new Date();
    const nowTime = now.toISOString();

    try {
        const otRequest = await getOTRequest(otId);
        if (!otRequest) return resultError("OT request not found");

        const rateInfo = await getOTRateForDate(otRequest.request_date);

        if (!rateInfo.requireCheckin) {
            await createOrUpdateAttendance(
                otRequest.employee_id,
                otRequest.request_date,
                nowTime,
                location,
                photoUrl
            );
        }

        const { data: result, error } = await supabase.rpc("atomic_start_ot", {
            p_ot_id: otId,
            p_actual_start_time: nowTime,
            p_before_photo_url: photoUrl,
            p_ot_type: rateInfo.type,
            p_ot_rate: rateInfo.rate,
            p_start_location: location || null,
        });

        if (error) throw error;
        if (!result.success) return resultError(result.error);

        return success(result.data as OTRequest);
    } catch (err: any) {
        return resultError(err.message || "Failed to start OT");
    }
}

/**
 * End an OT session (using atomic RPC to prevent race conditions)
 */
export async function endOT(
    otId: string,
    photoUrl: string,
    location?: Location | null
): Promise<Result<OTRequest>> {
    const nowTime = new Date().toISOString();

    try {
        const otRequest = await getOTRequest(otId);
        if (!otRequest) return resultError("OT request not found");
        if (!otRequest.actual_start_time) return resultError("OT has not started");

        const startTime = new Date(otRequest.actual_start_time);
        const endTime = new Date(nowTime);
        const otHours = Math.max(0, differenceInMinutes(endTime, startTime) / 60);

        const { data: employee } = await supabase
            .from("employees")
            .select("base_salary")
            .eq("id", otRequest.employee_id)
            .single();

        const settings = await getSystemSettings();
        const divisor = settings.daysPerMonth * settings.hoursPerDay;
        const hourlyRate = divisor > 0 ? (employee?.base_salary || 0) / divisor : 0;
        const otRate = otRequest.ot_rate || 1.5;
        const otAmount = otHours * hourlyRate * otRate;

        const { data: result, error } = await supabase.rpc("atomic_end_ot", {
            p_ot_id: otId,
            p_actual_end_time: nowTime,
            p_after_photo_url: photoUrl,
            p_actual_ot_hours: Math.round(otHours * 100) / 100,
            p_ot_amount: Math.round(otAmount * 100) / 100,
            p_end_location: location || null,
        });

        if (error) throw error;
        if (!result.success) return resultError(result.error);

        return success(result.data as OTRequest);
    } catch (err: any) {
        return resultError(err.message || "Failed to end OT");
    }
}

/**
 * Approve an OT request (admin)
 */
export async function approveOT(
    otId: string,
    adminId: string,
    modifications?: { approvedStartTime?: string; approvedEndTime?: string }
): Promise<Result<true>> {
    try {
        const updateData: any = {
            status: "approved",
            approved_by: adminId,
            approved_at: new Date().toISOString(),
            ...(modifications?.approvedStartTime ? { approved_start_time: modifications.approvedStartTime } : {}),
            ...(modifications?.approvedEndTime ? { approved_end_time: modifications.approvedEndTime } : {}),
        };

        const { error } = await supabase.from("ot_requests").update(updateData).eq("id", otId);
        if (error) throw error;

        return success(true as const);
    } catch (err: any) {
        return resultError(err.message || "Failed to approve OT");
    }
}

/**
 * Reject an OT request (admin)
 */
export async function rejectOT(otId: string, adminId: string, reason?: string): Promise<Result<true>> {
    try {
        const { error } = await supabase
            .from("ot_requests")
            .update({
                status: "rejected",
                approved_by: adminId,
                approved_at: new Date().toISOString(),
            })
            .eq("id", otId);

        if (error) throw error;
        return success(true as const);
    } catch (err: any) {
        return resultError(err.message || "Failed to reject OT");
    }
}

/**
 * Get OT history for an employee
 */
export async function getOTHistory(
    employeeId: string,
    startDate: string,
    endDate: string
): Promise<OTRequest[]> {
    try {
        const { data, error } = await supabase
            .from("ot_requests")
            .select("*")
            .eq("employee_id", employeeId)
            .gte("request_date", startDate)
            .lte("request_date", endDate)
            .order("request_date", { ascending: false });

        if (error) throw error;
        return (data || []) as OTRequest[];
    } catch {
        return [];
    }
}

/**
 * Get all OT requests for a date range (admin)
 */
export async function getAllOTRequests(
    startDate: string,
    endDate: string,
    status?: string
): Promise<OTRequest[]> {
    try {
        let query = supabase
            .from("ot_requests")
            .select("*, employee:employees(*)")
            .gte("request_date", startDate)
            .lte("request_date", endDate)
            .order("request_date", { ascending: false });

        if (status) query = query.eq("status", status);

        const { data, error } = await query;
        if (error) throw error;

        return (data || []) as OTRequest[];
    } catch {
        return [];
    }
}

/**
 * Get completed OT records for payroll calculation
 */
export async function getCompletedOTForPayroll(
    employeeId: string,
    startDate: string,
    endDate: string
): Promise<OTRequest[]> {
    try {
        const { data, error } = await supabase
            .from("ot_requests")
            .select("*")
            .eq("employee_id", employeeId)
            .eq("status", "completed")
            .gte("request_date", startDate)
            .lte("request_date", endDate)
            .not("actual_ot_hours", "is", null)
            .order("request_date", { ascending: true });

        if (error) throw error;
        return (data || []) as OTRequest[];
    } catch {
        return [];
    }
}

/**
 * Format OT duration string (HH:MM:SS) for active OT
 */
export function formatOTDuration(startTime: string): string {
    const start = new Date(startTime);
    const now = new Date();

    const totalSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
