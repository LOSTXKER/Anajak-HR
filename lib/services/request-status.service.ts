/**
 * Request Status Service
 * =============================================
 * Generic helper for updating request status (approve/reject/cancel)
 * across OT, leave, WFH, field work, and late request tables.
 */

import { supabase } from "@/lib/supabase/client";
import { Result, success, error as resultError } from "@/lib/types/result";

type RequestTable =
    | "ot_requests"
    | "leave_requests"
    | "wfh_requests"
    | "field_work_requests"
    | "late_requests";

export async function updateRequestStatus(
    table: RequestTable,
    id: string,
    status: "approved" | "rejected" | "cancelled",
    actorId?: string,
    extraFields?: Record<string, unknown>
): Promise<Result<true>> {
    try {
        const updateData: Record<string, unknown> = { status, ...extraFields };

        if (status === "approved" || status === "rejected") {
            updateData.approved_by = actorId;
            updateData.approved_at = new Date().toISOString();
        } else if (status === "cancelled") {
            updateData.cancelled_by = actorId;
            updateData.cancelled_at = new Date().toISOString();
        }

        const { error } = await supabase.from(table).update(updateData).eq("id", id);

        if (error) throw error;
        return success(true as const);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to update status";
        console.error(`Error updating ${table} status to ${status}:`, err);
        return resultError(message);
    }
}
