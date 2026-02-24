/**
 * WFH (Work From Home) Service
 * =============================================
 * Service for WFH Request operations
 */

import { supabase } from "@/lib/supabase/client";
import { getTodayTH } from "@/lib/utils/date";
import { Result, success, error as resultError } from "@/lib/types/result";
import { updateRequestStatus } from "./request-status.service";
import type { WFHRequest } from "@/lib/types";

/**
 * Request WFH
 */
export async function requestWFH(
    employeeId: string,
    data: {
        date: string;
        reason: string;
    }
): Promise<Result<WFHRequest>> {
    try {
        const { data: result, error } = await supabase
            .from("wfh_requests")
            .insert({
                employee_id: employeeId,
                date: data.date,
                reason: data.reason,
                status: "pending",
            })
            .select()
            .single();

        if (error) throw error;
        return success(result as WFHRequest);
    } catch (err: any) {
        console.error("Error requesting WFH:", err);
        return resultError(err.message || "Failed to submit WFH request");
    }
}

/**
 * Get WFH request by ID
 */
export async function getWFHRequest(wfhId: string): Promise<WFHRequest | null> {
    try {
        const { data, error } = await supabase
            .from("wfh_requests")
            .select("*, employee:employees(*)")
            .eq("id", wfhId)
            .maybeSingle();

        if (error) throw error;

        return data as WFHRequest | null;
    } catch (error) {
        console.error("Error fetching WFH request:", error);
        return null;
    }
}

/**
 * Get WFH history for an employee
 */
export async function getWFHHistory(
    employeeId: string,
    startDate: string,
    endDate: string
): Promise<WFHRequest[]> {
    try {
        const { data, error } = await supabase
            .from("wfh_requests")
            .select("*")
            .eq("employee_id", employeeId)
            .gte("date", startDate)
            .lte("date", endDate)
            .order("date", { ascending: false });

        if (error) throw error;

        return (data || []) as WFHRequest[];
    } catch (error) {
        console.error("Error fetching WFH history:", error);
        return [];
    }
}

/**
 * Get pending WFH requests for an employee
 */
export async function getPendingWFH(employeeId: string): Promise<WFHRequest[]> {
    try {
        const today = getTodayTH();

        const { data, error } = await supabase
            .from("wfh_requests")
            .select("*")
            .eq("employee_id", employeeId)
            .eq("status", "pending")
            .gte("date", today)
            .order("date", { ascending: true });

        if (error) throw error;

        return (data || []) as WFHRequest[];
    } catch (error) {
        console.error("Error fetching pending WFH:", error);
        return [];
    }
}

/**
 * Approve WFH request (admin)
 */
export async function approveWFH(wfhId: string, adminId: string): Promise<Result<true>> {
    return updateRequestStatus("wfh_requests", wfhId, "approved", adminId);
}

/**
 * Reject WFH request (admin)
 */
export async function rejectWFH(wfhId: string, adminId: string): Promise<Result<true>> {
    return updateRequestStatus("wfh_requests", wfhId, "rejected", adminId);
}

/**
 * Get all WFH requests (admin)
 */
export async function getAllWFHRequests(
    startDate: string,
    endDate: string,
    status?: string
): Promise<WFHRequest[]> {
    try {
        let query = supabase
            .from("wfh_requests")
            .select("*, employee:employees(*)")
            .gte("date", startDate)
            .lte("date", endDate)
            .order("date", { ascending: false });

        if (status) {
            query = query.eq("status", status);
        }

        const { data, error } = await query;

        if (error) throw error;

        return (data || []) as WFHRequest[];
    } catch (error) {
        console.error("Error fetching all WFH requests:", error);
        return [];
    }
}

/**
 * Cancel WFH request
 */
export async function cancelWFH(wfhId: string): Promise<Result<true>> {
    return updateRequestStatus("wfh_requests", wfhId, "cancelled");
}

/**
 * Check if today is WFH for an employee
 */
export async function isTodayWFH(employeeId: string): Promise<boolean> {
    try {
        const today = getTodayTH();

        const { data, error } = await supabase
            .from("wfh_requests")
            .select("id")
            .eq("employee_id", employeeId)
            .eq("date", today)
            .eq("status", "approved")
            .maybeSingle();

        if (error) throw error;

        return !!data;
    } catch (error) {
        console.error("Error checking WFH status:", error);
        return false;
    }
}
