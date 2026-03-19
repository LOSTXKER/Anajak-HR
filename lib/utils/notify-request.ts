/**
 * notify-request
 * =============================================
 * Centralised helper for sending request notifications to /api/notifications.
 * Previously copy-pasted inside every form's handleSubmit.
 */

import { authFetch } from "@/lib/utils/auth-fetch";

type NotificationPayload = {
  type: string;
  data: Record<string, unknown>;
};

/**
 * Fire-and-forget wrapper around the notifications API.
 * Errors are logged but never re-thrown so they never block the UI.
 */
export async function sendRequestNotification(payload: NotificationPayload): Promise<void> {
  try {
    await authFetch("/api/notifications", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Failed to send request notification:", err);
  }
}

// ─── Typed helpers per request type ─────────────────────

export function notifyNewLeaveRequest(data: {
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
}) {
  return sendRequestNotification({ type: "new_leave_request", data });
}

export function notifyNewWFHRequest(data: {
  employeeName: string;
  date: string;
}) {
  return sendRequestNotification({ type: "new_wfh_request", data });
}

export function notifyNewOTRequest(data: {
  employeeName: string;
  date: string;
  startTime: string;
  endTime: string;
}) {
  return sendRequestNotification({ type: "new_ot_request", data });
}

export function notifyNewFieldWorkRequest(data: {
  employeeName: string;
  date: string;
  location: string;
}) {
  return sendRequestNotification({ type: "new_field_work_request", data });
}

export function notifyNewLateRequest(data: {
  employeeName: string;
  date: string;
  lateMinutes: number;
}) {
  return sendRequestNotification({ type: "late_request", data });
}
