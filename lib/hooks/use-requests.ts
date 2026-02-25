/**
 * Unified Requests Hook
 * =============================================
 * Orchestrates: data fetching, filtering, and CRUD actions.
 */

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { getDay } from "date-fns";
import {
  RequestItem,
  RequestType,
  RequestStatus,
  RequestStats,
  Employee,
  Holiday,
  OTSettings,
  OTRateInfo,
  CreateFormData,
  tableMap,
} from "@/lib/types/request";
import { useRequestsQuery } from "./use-requests-query";
import { useRequestFilters } from "./use-request-filters";
import { calculateOTAmount, buildLocalISO } from "@/lib/utils/ot-calculator";
import { TIME_CONSTANTS } from "@/lib/constants";

// ─── Options & Return Types ──────────────────────────────

interface DateRange {
  start: string;
  end: string;
}

interface UseRequestsOptions {
  dateRange?: DateRange | null;
}

interface UseRequestsReturn {
  requests: RequestItem[];
  filtered: RequestItem[];
  stats: RequestStats;

  employees: Employee[];
  holidays: Holiday[];
  otSettings: OTSettings;
  detectedOTInfo: OTRateInfo | null;

  loading: boolean;
  processing: boolean;

  activeType: RequestType | "all";
  activeStatus: RequestStatus;
  searchTerm: string;
  setActiveType: (type: RequestType | "all") => void;
  setActiveStatus: (status: RequestStatus) => void;
  setSearchTerm: (term: string) => void;

  fetchAll: () => Promise<void>;
  handleApprove: (request: RequestItem, adminId: string) => Promise<boolean>;
  handleReject: (request: RequestItem, adminId: string, reason?: string) => Promise<boolean>;
  handleCancel: (request: RequestItem, adminId: string, cancelReason: string) => Promise<boolean>;
  handleCreateRequest: (type: RequestType, formData: CreateFormData, adminId: string) => Promise<boolean>;
  handleEditRequest: (request: RequestItem, editData: any, adminId: string) => Promise<boolean>;
  detectOTRate: (dateStr: string) => OTRateInfo;
  fetchEmployees: () => Promise<void>;
}

// ─── Notification Helper ─────────────────────────────────

async function sendNotification(type: string, data: Record<string, unknown>) {
  try {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, data }),
    });
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}

function sendRequestNotification(request: RequestItem, approved: boolean) {
  const employeeName = request.employeeName || "ไม่ระบุ";
  switch (request.type) {
    case "ot":
      sendNotification("ot_approval", { employeeName, date: request.rawData.request_date, startTime: request.rawData.requested_start_time, endTime: request.rawData.requested_end_time, approved });
      break;
    case "leave":
      sendNotification("leave_approval", { employeeName, leaveType: request.rawData.leave_type, startDate: request.rawData.start_date, endDate: request.rawData.end_date, approved });
      break;
    case "wfh":
      sendNotification("wfh_approval", { employeeName, date: request.rawData.date, approved });
      break;
    case "late":
      sendNotification("late_approval", { employeeName, date: request.rawData.request_date, lateMinutes: request.rawData.actual_late_minutes, approved });
      break;
    case "field_work":
      sendNotification("field_work_approval", { employeeName, date: request.rawData.date, location: request.rawData.location, approved });
      break;
  }
}

// ─── Hook ────────────────────────────────────────────────

export function useRequests(options: UseRequestsOptions = {}): UseRequestsReturn {
  const { dateRange = null } = options;

  const query = useRequestsQuery();
  const filters = useRequestFilters(query.requests);

  const [detectedOTInfo, setDetectedOTInfo] = useState<OTRateInfo | null>(null);
  const [processing, setProcessing] = useState(false);

  // ── Detect OT Rate ──────────────────────────────────

  const detectOTRate = useCallback(
    (dateStr: string): OTRateInfo => {
      const date = new Date(dateStr);
      const dayOfWeek = getDay(date);
      const dayOfWeekISO = dayOfWeek === 0 ? 7 : dayOfWeek;

      const holiday = query.holidays.find((h) => h.date === dateStr);
      if (holiday) {
        const info: OTRateInfo = { rate: query.otSettings.holiday, type: "holiday", typeName: `วันหยุดนักขัตฤกษ์ (${holiday.name})`, holidayName: holiday.name };
        setDetectedOTInfo(info);
        return info;
      }

      if (!query.workingDays.includes(dayOfWeekISO)) {
        const info: OTRateInfo = { rate: query.otSettings.weekend, type: "weekend", typeName: "วันหยุดสุดสัปดาห์" };
        setDetectedOTInfo(info);
        return info;
      }

      const info: OTRateInfo = { rate: query.otSettings.workday, type: "workday", typeName: "วันทำงานปกติ" };
      setDetectedOTInfo(info);
      return info;
    },
    [query.holidays, query.otSettings, query.workingDays]
  );

  // ── Approve ─────────────────────────────────────────

  const handleApprove = useCallback(
    async (request: RequestItem, adminId: string): Promise<boolean> => {
      setProcessing(true);
      try {
        const updateData: Record<string, unknown> = {
          status: "approved",
          approved_by: adminId,
          approved_at: new Date().toISOString(),
        };

        if (request.type === "ot") {
          updateData.approved_start_time = request.rawData.requested_start_time;
          updateData.approved_end_time = request.rawData.requested_end_time;
          const hours = (new Date(request.rawData.requested_end_time).getTime() - new Date(request.rawData.requested_start_time).getTime()) / TIME_CONSTANTS.MS_PER_HOUR;
          updateData.approved_ot_hours = Math.round(hours * 100) / 100;
        }

        const { error } = await supabase.from(tableMap[request.type]).update(updateData).eq("id", request.id);
        if (error) throw error;

        query.setRequests((prev) =>
          prev.map((r) => r.type === request.type && r.id === request.id
            ? { ...r, status: "approved" }
            : r
          )
        );
        sendRequestNotification(request, true);
        return true;
      } catch (error) {
        console.error("Error approving request:", error);
        return false;
      } finally {
        setProcessing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Reject ──────────────────────────────────────────

  const handleReject = useCallback(
    async (request: RequestItem, adminId: string, reason?: string): Promise<boolean> => {
      setProcessing(true);
      try {
        const updateData: Record<string, unknown> = {
          status: "rejected",
          approved_by: adminId,
          approved_at: new Date().toISOString(),
          ...(reason ? { admin_note: reason } : {}),
        };

        const { error } = await supabase.from(tableMap[request.type]).update(updateData).eq("id", request.id);
        if (error) throw error;

        query.setRequests((prev) =>
          prev.map((r) => r.type === request.type && r.id === request.id
            ? { ...r, status: "rejected" }
            : r
          )
        );
        sendRequestNotification(request, false);
        return true;
      } catch (error) {
        console.error("Error rejecting request:", error);
        return false;
      } finally {
        setProcessing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Cancel ──────────────────────────────────────────

  const handleCancel = useCallback(
    async (request: RequestItem, adminId: string, cancelReason: string): Promise<boolean> => {
      if (!cancelReason.trim()) return false;
      setProcessing(true);
      try {
        const { error } = await supabase
          .from(tableMap[request.type])
          .update({
            status: "cancelled",
            cancelled_by: adminId,
            cancelled_at: new Date().toISOString(),
            cancel_reason: cancelReason.trim(),
          })
          .eq("id", request.id);

        if (error) throw error;

        // Restore leave balance when cancelling an approved leave
        if (request.type === "leave" && (request.status === "approved")) {
          const raw = request.rawData;
          const leaveType = raw.leave_type as string;
          const year = new Date(raw.start_date).getFullYear();
          let daysToRestore = 0;
          if (raw.is_half_day) {
            daysToRestore = 0.5;
          } else {
            const start = new Date(raw.start_date);
            const end = new Date(raw.end_date);
            daysToRestore = Math.ceil((end.getTime() - start.getTime()) / TIME_CONSTANTS.MS_PER_DAY) + 1;
          }

          const columnMap: Record<string, { used: string; remaining: string }> = {
            annual: { used: "annual_leave_used", remaining: "annual_leave_remaining" },
            sick: { used: "sick_leave_used", remaining: "sick_leave_remaining" },
            personal: { used: "personal_leave_used", remaining: "personal_leave_remaining" },
          };

          const cols = columnMap[leaveType];
          if (cols) {
            const { data: balance } = await supabase
              .from("leave_balances")
              .select("*")
              .eq("employee_id", request.employeeId)
              .eq("year", year)
              .maybeSingle();

            if (balance) {
              const currentUsed = (balance as any)[cols.used] || 0;
              const currentRemaining = (balance as any)[cols.remaining] || 0;
              await supabase
                .from("leave_balances")
                .update({
                  [cols.used]: Math.max(0, currentUsed - daysToRestore),
                  [cols.remaining]: currentRemaining + daysToRestore,
                })
                .eq("employee_id", request.employeeId)
                .eq("year", year);
            }
          }
        }

        query.setRequests((prev) =>
          prev.map((r) => r.type === request.type && r.id === request.id
            ? { ...r, status: "cancelled", cancelReason: cancelReason.trim() }
            : r
          )
        );
        return true;
      } catch (error) {
        console.error("Error cancelling request:", error);
        return false;
      } finally {
        setProcessing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Create ──────────────────────────────────────────

  const handleCreateRequest = useCallback(
    async (type: RequestType, formData: CreateFormData, adminId: string): Promise<boolean> => {
      if (!formData.employeeId) return false;
      setProcessing(true);
      try {
        const approvalData = { approved_by: adminId, approved_at: new Date().toISOString() };

        switch (type) {
          case "ot": {
            const startISO = buildLocalISO(formData.otDate, formData.otStartTime);
            const endISO = buildLocalISO(formData.otDate, formData.otEndTime);
            const emp = query.employees.find((e) => e.id === formData.employeeId);
            const calc = calculateOTAmount({
              startTime: startISO,
              endTime: endISO,
              baseSalary: emp?.base_salary || 0,
              otRate: formData.otRate,
              daysPerMonth: query.daysPerMonth,
              hoursPerDay: query.hoursPerDay,
            });

            const insertData: any = {
              employee_id: formData.employeeId,
              request_date: formData.otDate,
              requested_start_time: startISO,
              requested_end_time: endISO,
              approved_start_time: startISO,
              approved_end_time: endISO,
              approved_ot_hours: calc.hours,
              ot_type: formData.otType,
              ot_rate: formData.otRate,
              reason: formData.reason,
              ...approvalData,
            };

            if (formData.otIsCompleted) {
              insertData.status = "completed";
              insertData.actual_start_time = startISO;
              insertData.actual_end_time = endISO;
              insertData.actual_ot_hours = calc.hours;
              insertData.ot_amount = calc.amount;
            } else {
              insertData.status = "approved";
            }

            const { error } = await supabase.from("ot_requests").insert(insertData);
            if (error) throw error;
            break;
          }
          case "leave": {
            const { error } = await supabase.from("leave_requests").insert({
              employee_id: formData.employeeId, leave_type: formData.leaveType,
              start_date: formData.leaveStartDate, end_date: formData.leaveEndDate,
              is_half_day: formData.leaveIsHalfDay, reason: formData.reason,
              status: "approved", ...approvalData,
            });
            if (error) throw error;
            break;
          }
          case "wfh": {
            const { error } = await supabase.from("wfh_requests").insert({
              employee_id: formData.employeeId, date: formData.wfhDate,
              is_half_day: formData.wfhIsHalfDay, reason: formData.reason,
              status: "approved", ...approvalData,
            });
            if (error) throw error;
            break;
          }
          case "late": {
            const { error } = await supabase.from("late_requests").insert({
              employee_id: formData.employeeId, request_date: formData.lateDate,
              actual_late_minutes: formData.lateMinutes, reason: formData.reason,
              status: "approved", ...approvalData,
            });
            if (error) throw error;
            break;
          }
          case "field_work": {
            if (!formData.fieldWorkLocation.trim()) return false;
            const { error } = await supabase.from("field_work_requests").insert({
              employee_id: formData.employeeId, date: formData.fieldWorkDate,
              is_half_day: formData.fieldWorkIsHalfDay, location: formData.fieldWorkLocation.trim(),
              reason: formData.reason, status: "approved", ...approvalData,
            });
            if (error) throw error;
            break;
          }
        }

        return true;
      } catch (error) {
        console.error("Error creating request:", error);
        return false;
      } finally {
        setProcessing(false);
      }
    },
    [query.employees, query.daysPerMonth, query.hoursPerDay]
  );

  // ── Edit ────────────────────────────────────────────

  const handleEditRequest = useCallback(
    async (request: RequestItem, editData: any, _adminId: string): Promise<boolean> => {
      setProcessing(true);
      try {
        let updateData: any = {};
        switch (request.type) {
          case "ot": {
            const startISO = buildLocalISO(request.rawData.request_date, editData.requested_start_time);
            const endISO = buildLocalISO(request.rawData.request_date, editData.requested_end_time);
            const newRate = parseFloat(editData.ot_rate) || request.rawData.ot_rate || 1.5;
            const calc = calculateOTAmount({
              startTime: startISO,
              endTime: endISO,
              baseSalary: 0,
              otRate: newRate,
              daysPerMonth: query.daysPerMonth,
              hoursPerDay: query.hoursPerDay,
            });
            updateData = {
              requested_start_time: startISO,
              requested_end_time: endISO,
              ot_rate: newRate,
              reason: editData.reason,
            };
            if (request.status === "approved" || request.status === "completed") {
              updateData.approved_start_time = startISO;
              updateData.approved_end_time = endISO;
              updateData.approved_ot_hours = calc.hours;
            }
            if (request.status === "completed") {
              const emp = query.employees.find((e) => e.id === request.employeeId);
              const fullCalc = calculateOTAmount({
                startTime: startISO,
                endTime: endISO,
                baseSalary: emp?.base_salary || 0,
                otRate: newRate,
                daysPerMonth: query.daysPerMonth,
                hoursPerDay: query.hoursPerDay,
              });
              updateData.actual_start_time = startISO;
              updateData.actual_end_time = endISO;
              updateData.actual_ot_hours = fullCalc.hours;
              updateData.ot_amount = fullCalc.amount;
            }
            break;
          }
          case "leave":
            updateData = { leave_type: editData.leave_type, start_date: editData.start_date, end_date: editData.end_date, is_half_day: editData.is_half_day, reason: editData.reason };
            break;
          case "wfh":
            updateData = { date: editData.date, is_half_day: editData.is_half_day, reason: editData.reason };
            break;
          case "late":
            updateData = { request_date: editData.request_date, actual_late_minutes: editData.actual_late_minutes, reason: editData.reason };
            break;
          case "field_work":
            updateData = { date: editData.date, location: editData.location, is_half_day: editData.is_half_day, reason: editData.reason };
            break;
        }

        const { error } = await supabase.from(tableMap[request.type]).update(updateData).eq("id", request.id);
        if (error) throw error;
        return true;
      } catch (error) {
        console.error("Error editing request:", error);
        return false;
      } finally {
        setProcessing(false);
      }
    },
    [query.employees, query.daysPerMonth, query.hoursPerDay]
  );

  // ── Bound fetchAll with dateRange ───────────────────
  const fetchAll = useCallback(async () => {
    await query.fetchAll(dateRange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.fetchAll, dateRange]);

  // ── Initial Fetch ────────────────────────────────────
  useEffect(() => {
    fetchAll();
    query.fetchEmployees();
    query.fetchSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Return ───────────────────────────────────────────
  return {
    requests: query.requests,
    filtered: filters.filtered,
    stats: filters.stats,

    employees: query.employees,
    holidays: query.holidays,
    otSettings: query.otSettings,
    detectedOTInfo,

    loading: query.loading,
    processing,

    activeType: filters.activeType,
    activeStatus: filters.activeStatus,
    searchTerm: filters.searchTerm,
    setActiveType: filters.setActiveType,
    setActiveStatus: filters.setActiveStatus,
    setSearchTerm: filters.setSearchTerm,

    fetchAll,
    handleApprove, handleReject, handleCancel,
    handleCreateRequest, handleEditRequest,
    detectOTRate, fetchEmployees: query.fetchEmployees,
  };
}
