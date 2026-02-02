/**
 * Auto-Approve Utilities
 * =============================================
 * Shared functions for auto-approve logic across
 * OT, Leave, WFH, Field Work, and Late requests
 */

import { supabase } from "@/lib/supabase/client";
import { SYSTEM_USER_EMAIL } from "@/lib/constants/system";

/**
 * Check if auto-approve is enabled for a specific request type
 * @param settingKey - Setting key in system_settings table
 * @returns true if auto-approve is enabled
 */
export async function checkAutoApprove(settingKey: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", settingKey)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error checking auto-approve setting:", error);
      return false;
    }

    return data?.setting_value === "true";
  } catch (error) {
    console.error("Error checking auto-approve:", error);
    return false;
  }
}

/**
 * Get the system user ID (for auto-approved requests)
 * @returns System user ID or null if not found
 */
export async function getSystemUserId(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("employees")
      .select("id")
      .eq("email", SYSTEM_USER_EMAIL)
      .single();

    if (error) {
      console.error("Error getting system user:", error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error("Error getting system user:", error);
    return null;
  }
}

/**
 * Apply auto-approve fields to insert data
 * @param data - The data object to modify
 * @param isAutoApprove - Whether auto-approve is enabled
 * @returns Modified data with auto-approve fields if enabled
 */
export async function applyAutoApproveFields<T extends Record<string, unknown>>(
  data: T,
  isAutoApprove: boolean
): Promise<T & { status: string; approved_at?: string; approved_by?: string }> {
  const result: Record<string, unknown> = {
    ...data,
    status: isAutoApprove ? "approved" : "pending",
  };

  if (isAutoApprove) {
    result.approved_at = new Date().toISOString();
    const systemUserId = await getSystemUserId();
    if (systemUserId) {
      result.approved_by = systemUserId;
    }
  }

  return result as T & { status: string; approved_at?: string; approved_by?: string };
}

/**
 * Setting keys for different request types
 */
export const AUTO_APPROVE_SETTINGS = {
  OT: "auto_approve_ot",
  LEAVE: "auto_approve_leave",
  WFH: "auto_approve_wfh",
  FIELD_WORK: "auto_approve_field_work",
  LATE: "auto_approve_late",
} as const;
