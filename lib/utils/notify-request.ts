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

// ─── Auto-approve approval notifications ─────────────────
// When auto-approve is enabled, also send the *_approval notification
// so the LINE channel shows the same approval message as manual approval.

export function notifyAutoApprovedLeave(data: {
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
}) {
  return sendRequestNotification({ type: "leave_approval", data: { ...data, approved: true } });
}

export function notifyAutoApprovedWFH(data: {
  employeeName: string;
  date: string;
}) {
  return sendRequestNotification({ type: "wfh_approval", data: { ...data, approved: true } });
}

export function notifyAutoApprovedOT(data: {
  employeeName: string;
  date: string;
  startTime: string;
  endTime: string;
}) {
  return sendRequestNotification({ type: "ot_approval", data: { ...data, approved: true } });
}

export function notifyAutoApprovedFieldWork(data: {
  employeeName: string;
  date: string;
  location: string;
}) {
  return sendRequestNotification({ type: "field_work_approval", data: { ...data, approved: true } });
}

export function notifyAutoApprovedLate(data: {
  employeeName: string;
  date: string;
  lateMinutes: number;
}) {
  return sendRequestNotification({ type: "late_approval", data: { ...data, approved: true } });
}
