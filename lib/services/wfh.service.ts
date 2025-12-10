/**
 * WFH (Work From Home) Service
 * =============================================
 * Service for WFH Request operations
 */

import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";
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
): Promise<{ success: boolean; data?: WFHRequest; error?: string }> {
    try {
        const { data: result, error } = await supabase
            .from("wfh_requests")
            .insert({
                employee_id: employeeId,
                request_date: data.date,
                reason: data.reason,
                status: "pending",
            })
            .select()
            .single();

        if (error) throw error;

        return { success: true, data: result as WFHRequest };
    } catch (error) {
        console.error("Error requesting WFH:", error);
        return { success: false, error: "Failed to submit WFH request" };
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
            .gte("request_date", startDate)
            .lte("request_date", endDate)
            .order("request_date", { ascending: false });

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
        const today = format(new Date(), "yyyy-MM-dd");

        const { data, error } = await supabase
            .from("wfh_requests")
            .select("*")
            .eq("employee_id", employeeId)
            .eq("status", "pending")
            .gte("request_date", today)
            .order("request_date", { ascending: true });

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
export async function approveWFH(
    wfhId: string,
    adminId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from("wfh_requests")
            .update({
                status: "approved",
                approved_by: adminId,
                approved_at: new Date().toISOString(),
            })
            .eq("id", wfhId);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error("Error approving WFH:", error);
        return { success: false, error: "Failed to approve WFH" };
    }
}

/**
 * Reject WFH request (admin)
 */
export async function rejectWFH(
    wfhId: string,
    adminId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from("wfh_requests")
            .update({
                status: "rejected",
                approved_by: adminId,
                approved_at: new Date().toISOString(),
            })
            .eq("id", wfhId);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error("Error rejecting WFH:", error);
        return { success: false, error: "Failed to reject WFH" };
    }
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
            .gte("request_date", startDate)
            .lte("request_date", endDate)
            .order("request_date", { ascending: false });

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
export async function cancelWFH(wfhId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from("wfh_requests")
            .update({ status: "cancelled" })
            .eq("id", wfhId);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error("Error cancelling WFH:", error);
        return { success: false, error: "Failed to cancel WFH" };
    }
}

/**
 * Check if today is WFH for an employee
 */
export async function isTodayWFH(employeeId: string): Promise<boolean> {
    try {
        const today = format(new Date(), "yyyy-MM-dd");

        const { data, error } = await supabase
            .from("wfh_requests")
            .select("id")
            .eq("employee_id", employeeId)
            .eq("request_date", today)
            .eq("status", "approved")
            .maybeSingle();

        if (error) throw error;

        return !!data;
    } catch (error) {
        console.error("Error checking WFH status:", error);
        return false;
    }
}
