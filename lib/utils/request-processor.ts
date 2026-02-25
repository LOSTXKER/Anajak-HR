/**
 * Request Processor Utility
 * =============================================
 * Transforms raw database records into RequestItem format
 */

import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { RequestItem, leaveTypeLabels } from "@/lib/types/request";

/**
 * Process OT request raw data into RequestItem
 */
export function processOTRequest(r: any): RequestItem | null {
  if (!r.employee?.id) return null;

  // For completed OT, prefer actual times; otherwise use requested times
  const isCompleted = r.status === "completed" || !!r.actual_end_time;
  const displayStart = isCompleted && r.actual_start_time
    ? r.actual_start_time
    : r.requested_start_time;
  const displayEnd = isCompleted && r.actual_end_time
    ? r.actual_end_time
    : r.requested_end_time;
  const displayHours: number = isCompleted && r.actual_ot_hours != null
    ? r.actual_ot_hours
    : r.approved_ot_hours != null
      ? r.approved_ot_hours
      : Math.round(
          ((new Date(r.requested_end_time).getTime() - new Date(r.requested_start_time).getTime()) / 3600000) * 100
        ) / 100;

  const startTime = format(parseISO(displayStart), "HH:mm");
  const endTime = format(parseISO(displayEnd), "HH:mm");

  return {
    id: r.id,
    type: "ot",
    employeeId: r.employee.id,
    employeeName: r.employee.name,
    employeeEmail: r.employee.email || "",
    date: r.request_date,
    title: `OT ${startTime} - ${endTime}`,
    subtitle: format(parseISO(r.request_date), "EEEE d MMM yyyy", {
      locale: th,
    }),
    details: `เวลา: ${startTime} - ${endTime}\nชั่วโมง: ${displayHours.toFixed(2)} ชม.`,
    reason: r.reason,
    status: r.status,
    createdAt: r.created_at,
    approvedBy: r.approved_by,
    approvedAt: r.approved_at,
    cancelledBy: r.cancelled_by,
    cancelledAt: r.cancelled_at,
    cancelReason: r.cancel_reason,
    rawData: r,
  };
}

/**
 * Process Leave request raw data into RequestItem
 */
export function processLeaveRequest(r: any): RequestItem | null {
  if (!r.employee?.id) return null;

  return {
    id: r.id,
    type: "leave",
    employeeId: r.employee.id,
    employeeName: r.employee.name,
    employeeEmail: r.employee.email || "",
    date: r.start_date,
    title: leaveTypeLabels[r.leave_type] || r.leave_type,
    subtitle: r.is_half_day
      ? `${format(parseISO(r.start_date), "d MMM", { locale: th })} (ครึ่งวัน)`
      : `${format(parseISO(r.start_date), "d MMM", { locale: th })} - ${format(
          parseISO(r.end_date),
          "d MMM yyyy",
          { locale: th }
        )}`,
    details: `ประเภท: ${leaveTypeLabels[r.leave_type] || r.leave_type}\n${
      r.is_half_day ? "ครึ่งวัน" : `${r.start_date} ถึง ${r.end_date}`
    }`,
    reason: r.reason,
    status: r.status,
    createdAt: r.created_at,
    approvedBy: r.approved_by,
    approvedAt: r.approved_at,
    cancelledBy: r.cancelled_by,
    cancelledAt: r.cancelled_at,
    cancelReason: r.cancel_reason,
    rawData: r,
  };
}

/**
 * Process WFH request raw data into RequestItem
 */
export function processWFHRequest(r: any): RequestItem | null {
  if (!r.employee?.id) return null;

  return {
    id: r.id,
    type: "wfh",
    employeeId: r.employee.id,
    employeeName: r.employee.name,
    employeeEmail: r.employee.email || "",
    date: r.date,
    title: r.is_half_day ? "WFH ครึ่งวัน" : "WFH เต็มวัน",
    subtitle: format(parseISO(r.date), "EEEE d MMM yyyy", { locale: th }),
    details: `วันที่: ${format(parseISO(r.date), "d MMM yyyy", { locale: th })}\n${
      r.is_half_day ? "ครึ่งวัน" : "เต็มวัน"
    }`,
    reason: r.reason,
    status: r.status,
    createdAt: r.created_at,
    approvedBy: r.approved_by,
    approvedAt: r.approved_at,
    cancelledBy: r.cancelled_by,
    cancelledAt: r.cancelled_at,
    cancelReason: r.cancel_reason,
    rawData: r,
  };
}

/**
 * Process Late request raw data into RequestItem
 */
export function processLateRequest(r: any): RequestItem | null {
  if (!r.employee?.id) return null;

  let title = "ขออนุมัติมาสาย";
  if (r.status === "approved") {
    title = r.actual_late_minutes
      ? `มาสาย ${r.actual_late_minutes} นาที (อนุมัติ - ไม่หักเงิน)`
      : "มาสาย (อนุมัติ - ไม่หักเงิน)";
  } else if (r.status === "pending") {
    title = r.actual_late_minutes
      ? `ขออนุมัติมาสาย ${r.actual_late_minutes} นาที`
      : "ขออนุมัติมาสาย";
  } else if (r.status === "rejected") {
    title = r.actual_late_minutes
      ? `มาสาย ${r.actual_late_minutes} นาที (ไม่อนุมัติ - หักเงิน)`
      : "มาสาย (ไม่อนุมัติ - หักเงิน)";
  } else if (r.status === "cancelled") {
    title = "มาสาย (ยกเลิก)";
  }

  return {
    id: r.id,
    type: "late",
    employeeId: r.employee.id,
    employeeName: r.employee.name,
    employeeEmail: r.employee.email || "",
    date: r.request_date,
    title: title,
    subtitle: format(parseISO(r.request_date), "EEEE d MMM yyyy", {
      locale: th,
    }),
    details: `วันที่: ${format(parseISO(r.request_date), "d MMM yyyy", { locale: th })}${
      r.actual_late_minutes ? `\nสาย: ${r.actual_late_minutes} นาที` : ""
    }\n\n${
      r.status === "approved"
        ? "อนุมัติแล้ว - ไม่นับเป็นสาย ไม่หักเงิน"
        : r.status === "rejected"
        ? "ไม่อนุมัติ - นับเป็นสาย หักเงิน"
        : ""
    }`,
    reason: r.reason,
    status: r.status,
    createdAt: r.created_at,
    approvedBy: r.approved_by,
    approvedAt: r.approved_at,
    cancelledBy: r.cancelled_by,
    cancelledAt: r.cancelled_at,
    cancelReason: r.cancel_reason,
    rawData: r,
  };
}

/**
 * Process Field Work request raw data into RequestItem
 */
export function processFieldWorkRequest(r: any): RequestItem | null {
  if (!r.employee?.id) return null;

  return {
    id: r.id,
    type: "field_work",
    employeeId: r.employee.id,
    employeeName: r.employee.name,
    employeeEmail: r.employee.email || "",
    date: r.date,
    title: r.is_half_day
      ? "งานนอกสถานที่ ครึ่งวัน"
      : "งานนอกสถานที่ เต็มวัน",
    subtitle: `${format(parseISO(r.date), "d MMM", { locale: th })} • ${r.location}`,
    details: `วันที่: ${format(parseISO(r.date), "d MMM yyyy", { locale: th })}\nสถานที่: ${r.location}\n${
      r.is_half_day ? "ครึ่งวัน" : "เต็มวัน"
    }`,
    reason: r.reason,
    status: r.status,
    createdAt: r.created_at,
    approvedBy: r.approved_by,
    approvedAt: r.approved_at,
    cancelledBy: r.cancelled_by,
    cancelledAt: r.cancelled_at,
    cancelReason: r.cancel_reason,
    rawData: r,
  };
}

/**
 * Process all raw requests into RequestItem array
 */
export function processAllRequests(
  otData: any[],
  leaveData: any[],
  wfhData: any[],
  lateData: any[],
  fieldWorkData: any[]
): RequestItem[] {
  const allRequests: RequestItem[] = [];

  // Process each type
  otData.forEach((r) => {
    const processed = processOTRequest(r);
    if (processed) allRequests.push(processed);
  });

  leaveData.forEach((r) => {
    const processed = processLeaveRequest(r);
    if (processed) allRequests.push(processed);
  });

  wfhData.forEach((r) => {
    const processed = processWFHRequest(r);
    if (processed) allRequests.push(processed);
  });

  lateData.forEach((r) => {
    const processed = processLateRequest(r);
    if (processed) allRequests.push(processed);
  });

  fieldWorkData.forEach((r) => {
    const processed = processFieldWorkRequest(r);
    if (processed) allRequests.push(processed);
  });

  // Sort by creation date descending
  allRequests.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return allRequests;
}
