/**
 * Centralized Notification Service
 * =============================================
 * Handles all notification sending (LINE + Push) in one place.
 * Replaces duplicate notification logic across hooks.
 */

import { supabase } from "@/lib/supabase/client";

interface NotificationPayload {
  type: string;
  data: Record<string, any>;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
  } catch {
    // Continue without auth header
  }
  return headers;
}

/**
 * Send a LINE notification for request events
 */
export async function sendRequestNotification(payload: NotificationPayload): Promise<boolean> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch (error) {
    console.error("Failed to send request notification:", error);
    return false;
  }
}

/**
 * Send a check-in notification
 */
export async function sendCheckinNotification(data: {
  employeeName: string;
  time: string;
  location: string;
  isLate: boolean;
}): Promise<boolean> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch("/api/checkin-notification", {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    return response.ok;
  } catch (error) {
    console.error("Failed to send check-in notification:", error);
    return false;
  }
}

/**
 * Send a check-out notification
 */
export async function sendCheckoutNotification(data: {
  employeeName: string;
  time: string;
  totalHours: number;
  location: string;
}): Promise<boolean> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch("/api/checkout-notification", {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    return response.ok;
  } catch (error) {
    console.error("Failed to send check-out notification:", error);
    return false;
  }
}

/**
 * Send a push notification
 */
export async function sendPushNotification(data: {
  title: string;
  body: string;
  employeeId?: string;
  url?: string;
}): Promise<boolean> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch("/api/push/send", {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    return response.ok;
  } catch (error) {
    console.error("Failed to send push notification:", error);
    return false;
  }
}
