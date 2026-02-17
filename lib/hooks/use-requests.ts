/**
 * Unified Requests Hook
 * =============================================
 * Single hook for all request management: fetching, filtering, actions.
 * Replaces: use-approvals, use-request-actions, use-request-fetching, use-request-filters, use-admin-requests
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { format, getDay } from "date-fns";
import {
  RequestItem,
  RequestType,
  RequestStatus,
  HistoryStatus,
  RequestStats,
  Employee,
  Holiday,
  OTSettings,
  OTRateInfo,
  CreateFormData,
  tableMap,
} from "@/lib/types/request";
import { processAllRequests } from "@/lib/utils/request-processor";

// ─── Options & Return Types ──────────────────────────────

interface DateRange {
  start: string;
  end: string;
}

interface UseRequestsOptions {
  dateRange?: DateRange;
  initialType?: RequestType | "all";
}

interface UseRequestsReturn {
  // Pending data
  pendingRequests: RequestItem[];
  filteredPending: RequestItem[];
  pendingStats: PendingStats;

  // All requests data (date-ranged)
  allRequests: RequestItem[];
  filteredAll: RequestItem[];
  allStats: RequestStats;

  // Supporting data
  employees: Employee[];
  holidays: Holiday[];
  otSettings: OTSettings;
  detectedOTInfo: OTRateInfo | null;

  // Loading/Processing state
  loading: boolean;
  processing: boolean;
  processingIds: Set<string>;

  // Pending filters
  pendingType: RequestType | "all";
  setPendingType: (type: RequestType | "all") => void;

  // All-requests filters
  activeType: RequestType | "all";
  activeStatus: RequestStatus;
  searchTerm: string;
  setActiveType: (type: RequestType | "all") => void;
  setActiveStatus: (status: RequestStatus) => void;
  setSearchTerm: (term: string) => void;

  // Actions
  fetchPending: () => Promise<void>;
  fetchAll: () => Promise<void>;
  handleApprove: (request: RequestItem, adminId: string) => Promise<boolean>;
  handleReject: (request: RequestItem, adminId: string, reason?: string) => Promise<boolean>;
  handleCancel: (request: RequestItem, adminId: string, cancelReason: string) => Promise<boolean>;
  handleCreateRequest: (type: RequestType, formData: CreateFormData, adminId: string) => Promise<boolean>;
  handleEditRequest: (request: RequestItem, editData: any, adminId: string) => Promise<boolean>;
  detectOTRate: (dateStr: string) => OTRateInfo;
  fetchEmployees: () => Promise<void>;
}

interface PendingStats {
  ot: number;
  leave: number;
  wfh: number;
  late: number;
  field_work: number;
  total: number;
}

const defaultDateRange: DateRange = {
  start: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
  end: format(new Date(), "yyyy-MM-dd"),
};

// ─── Hook Implementation ─────────────────────────────────

export function useRequests(options: UseRequestsOptions = {}): UseRequestsReturn {
  const { dateRange = defaultDateRange, initialType = "all" } = options;

  // ── State ────────────────────────────────────────────
  const [pendingRequests, setPendingRequests] = useState<RequestItem[]>([]);
  const [allRequests, setAllRequests] = useState<RequestItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [otSettings, setOtSettings] = useState<OTSettings>({ workday: 1.5, weekend: 1.5, holiday: 2 });
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [detectedOTInfo, setDetectedOTInfo] = useState<OTRateInfo | null>(null);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Pending filters
  const [pendingType, setPendingType] = useState<RequestType | "all">(initialType);

  // All-requests filters
  const [activeType, setActiveType] = useState<RequestType | "all">("all");
  const [activeStatus, setActiveStatus] = useState<RequestStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // ── Fetch Pending Requests ───────────────────────────

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const selectQuery = "*, employee:employees!employee_id(id, name, email)";
      const [otRes, leaveRes, wfhRes, lateRes, fieldWorkRes] = await Promise.all([
        supabase.from("ot_requests").select(selectQuery).eq("status", "pending").order("created_at", { ascending: false }),
        supabase.from("leave_requests").select(selectQuery).eq("status", "pending").order("created_at", { ascending: false }),
        supabase.from("wfh_requests").select(selectQuery).eq("status", "pending").order("created_at", { ascending: false }),
        supabase.from("late_requests").select(selectQuery).eq("status", "pending").order("created_at", { ascending: false }),
        supabase.from("field_work_requests").select(selectQuery).eq("status", "pending").order("created_at", { ascending: false }),
      ]);

      const items = processAllRequests(
        otRes.data || [],
        leaveRes.data || [],
        wfhRes.data || [],
        lateRes.data || [],
        fieldWorkRes.data || []
      );
      setPendingRequests(items);
    } catch (error) {
      console.error("Error fetching pending:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch All Requests (date-ranged) ─────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const selectQuery = "*, employee:employees!employee_id(id, name, email)";
      const [otRes, leaveRes, wfhRes, lateRes, fieldWorkRes] = await Promise.all([
        supabase.from("ot_requests").select(selectQuery).gte("request_date", dateRange.start).lte("request_date", dateRange.end).order("created_at", { ascending: false }),
        supabase.from("leave_requests").select(selectQuery).gte("start_date", dateRange.start).lte("start_date", dateRange.end).order("created_at", { ascending: false }),
        supabase.from("wfh_requests").select(selectQuery).gte("date", dateRange.start).lte("date", dateRange.end).order("created_at", { ascending: false }),
        supabase.from("late_requests").select(selectQuery).gte("request_date", dateRange.start).lte("request_date", dateRange.end).order("created_at", { ascending: false }),
        supabase.from("field_work_requests").select(selectQuery).gte("date", dateRange.start).lte("date", dateRange.end).order("created_at", { ascending: false }),
      ]);

      const items = processAllRequests(
        otRes.data || [],
        leaveRes.data || [],
        wfhRes.data || [],
        lateRes.data || [],
        fieldWorkRes.data || []
      );
      setAllRequests(items);
    } catch (error) {
      console.error("Error fetching all requests:", error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // ── Fetch Supporting Data ────────────────────────────

  const fetchEmployees = useCallback(async () => {
    const { data } = await supabase
      .from("employees")
      .select("id, name, email, base_salary")
      .is("deleted_at", null)
      .neq("role", "admin")
      .order("name");
    setEmployees(data || []);
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const { data: holidaysData } = await supabase.from("holidays").select("date, name");
      setHolidays(holidaysData || []);

      const { data: settingsData } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["ot_rate_workday", "ot_rate_weekend", "ot_rate_holiday", "working_days"]);

      const settings: Record<string, string> = {};
      settingsData?.forEach((item: any) => {
        settings[item.setting_key] = item.setting_value;
      });

      setOtSettings({
        workday: parseFloat(settings.ot_rate_workday) || 1.5,
        weekend: parseFloat(settings.ot_rate_weekend) || 1.5,
        holiday: parseFloat(settings.ot_rate_holiday) || 2,
      });

      if (settings.working_days) {
        setWorkingDays(settings.working_days.split(",").map(Number));
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  }, []);

  // ── Detect OT Rate ──────────────────────────────────

  const detectOTRate = useCallback(
    (dateStr: string): OTRateInfo => {
      const date = new Date(dateStr);
      const dayOfWeek = getDay(date);
      const dayOfWeekISO = dayOfWeek === 0 ? 7 : dayOfWeek;

      const holiday = holidays.find((h) => h.date === dateStr);
      if (holiday) {
        const info: OTRateInfo = { rate: otSettings.holiday, type: "holiday", typeName: `วันหยุดนักขัตฤกษ์ (${holiday.name})`, holidayName: holiday.name };
        setDetectedOTInfo(info);
        return info;
      }

      if (!workingDays.includes(dayOfWeekISO)) {
        const info: OTRateInfo = { rate: otSettings.weekend, type: "weekend", typeName: "วันหยุดสุดสัปดาห์" };
        setDetectedOTInfo(info);
        return info;
      }

      const info: OTRateInfo = { rate: otSettings.workday, type: "workday", typeName: "วันทำงานปกติ" };
      setDetectedOTInfo(info);
      return info;
    },
    [holidays, otSettings, workingDays]
  );

  // ── Notification Helper ─────────────────────────────

  const sendNotification = async (type: string, data: Record<string, unknown>) => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data }),
      });
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  const sendRequestNotification = (request: RequestItem, approved: boolean) => {
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
  };

  // ── Actions ─────────────────────────────────────────

  const handleApprove = useCallback(
    async (request: RequestItem, adminId: string): Promise<boolean> => {
      const key = `${request.type}_${request.id}`;
      setProcessingIds((prev) => new Set(prev).add(key));
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
          const start = new Date(request.rawData.requested_start_time);
          const end = new Date(request.rawData.requested_end_time);
          updateData.approved_ot_hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        }

        const { error } = await supabase.from(tableMap[request.type]).update(updateData).eq("id", request.id);
        if (error) throw error;

        setPendingRequests((prev) => prev.filter((r) => !(r.type === request.type && r.id === request.id)));
        sendRequestNotification(request, true);
        return true;
      } catch (error) {
        console.error("Error approving request:", error);
        return false;
      } finally {
        setProcessingIds((prev) => { const next = new Set(prev); next.delete(key); return next; });
        setProcessing(false);
      }
    },
    []
  );

  const handleReject = useCallback(
    async (request: RequestItem, adminId: string, reason?: string): Promise<boolean> => {
      const key = `${request.type}_${request.id}`;
      setProcessingIds((prev) => new Set(prev).add(key));
      setProcessing(true);
      try {
        const updateData: Record<string, unknown> = {
          status: "rejected",
          approved_by: adminId,
          approved_at: new Date().toISOString(),
        };

        if (reason) {
          updateData.admin_note = reason;
        }

        const { error } = await supabase.from(tableMap[request.type]).update(updateData).eq("id", request.id);
        if (error) throw error;

        setPendingRequests((prev) => prev.filter((r) => !(r.type === request.type && r.id === request.id)));
        sendRequestNotification(request, false);
        return true;
      } catch (error) {
        console.error("Error rejecting request:", error);
        return false;
      } finally {
        setProcessingIds((prev) => { const next = new Set(prev); next.delete(key); return next; });
        setProcessing(false);
      }
    },
    []
  );

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

        // Restore leave balance if cancelling an approved leave
        if (request.type === "leave" && request.status === "approved") {
          const raw = request.rawData;
          const leaveType = raw.leave_type as string;
          const year = new Date(raw.start_date).getFullYear();
          let daysToRestore = 0;
          if (raw.is_half_day) {
            daysToRestore = 0.5;
          } else {
            const start = new Date(raw.start_date);
            const end = new Date(raw.end_date);
            daysToRestore = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
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

        // Remove from both lists
        setPendingRequests((prev) => prev.filter((r) => !(r.type === request.type && r.id === request.id)));
        setAllRequests((prev) =>
          prev.map((r) =>
            r.type === request.type && r.id === request.id
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
    []
  );

  const handleCreateRequest = useCallback(
    async (type: RequestType, formData: CreateFormData, adminId: string): Promise<boolean> => {
      if (!formData.employeeId) return false;
      setProcessing(true);
      try {
        const approvalData = { approved_by: adminId, approved_at: new Date().toISOString() };

        switch (type) {
          case "ot": {
            const startDateTime = new Date(`${formData.otDate}T${formData.otStartTime}:00`);
            const endDateTime = new Date(`${formData.otDate}T${formData.otEndTime}:00`);
            const otHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
            const emp = employees.find((e) => e.id === formData.employeeId);
            const baseSalary = emp?.base_salary || 0;
            let otAmount = null;
            if (baseSalary > 0) {
              const hourlyRate = baseSalary / 30 / 8;
              otAmount = Math.round(otHours * hourlyRate * formData.otRate * 100) / 100;
            }

            const insertData: any = {
              employee_id: formData.employeeId,
              request_date: formData.otDate,
              requested_start_time: startDateTime.toISOString(),
              requested_end_time: endDateTime.toISOString(),
              approved_start_time: startDateTime.toISOString(),
              approved_end_time: endDateTime.toISOString(),
              approved_ot_hours: Math.round(otHours * 100) / 100,
              ot_type: formData.otType,
              ot_rate: formData.otRate,
              reason: formData.reason,
              ...approvalData,
            };

            if (formData.otIsCompleted) {
              insertData.status = "completed";
              insertData.actual_start_time = startDateTime.toISOString();
              insertData.actual_end_time = endDateTime.toISOString();
              insertData.actual_ot_hours = Math.round(otHours * 100) / 100;
              insertData.ot_amount = otAmount;
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
    [employees]
  );

  const handleEditRequest = useCallback(
    async (request: RequestItem, editData: any, _adminId: string): Promise<boolean> => {
      setProcessing(true);
      try {
        let updateData: any = {};
        switch (request.type) {
          case "ot":
            updateData = {
              requested_start_time: `${request.rawData.request_date}T${editData.requested_start_time}:00`,
              requested_end_time: `${request.rawData.request_date}T${editData.requested_end_time}:00`,
              reason: editData.reason,
            };
            break;
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
    []
  );

  // ── Computed Data ───────────────────────────────────

  const pendingStats = useMemo<PendingStats>(() => {
    const counts: PendingStats = { ot: 0, leave: 0, wfh: 0, late: 0, field_work: 0, total: 0 };
    pendingRequests.forEach((r) => counts[r.type]++);
    counts.total = pendingRequests.length;
    return counts;
  }, [pendingRequests]);

  const filteredPending = useMemo(() => {
    return pendingType === "all" ? pendingRequests : pendingRequests.filter((r) => r.type === pendingType);
  }, [pendingRequests, pendingType]);

  const allStats = useMemo<RequestStats>(() => {
    const counts: RequestStats = { ot: 0, leave: 0, wfh: 0, late: 0, field_work: 0, pending: 0, approved: 0, completed: 0, rejected: 0, cancelled: 0 };
    allRequests.forEach((r) => {
      counts[r.type]++;
      if (r.status in counts) (counts as any)[r.status]++;
    });
    return counts;
  }, [allRequests]);

  const filteredAll = useMemo(() => {
    return allRequests.filter((r) => {
      if (activeType !== "all" && r.type !== activeType) return false;
      if (activeStatus !== "all" && r.status !== activeStatus) return false;
      if (searchTerm && !r.employeeName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [allRequests, activeType, activeStatus, searchTerm]);

  // ── Initial Fetch ───────────────────────────────────

  useEffect(() => {
    fetchPending();
    fetchEmployees();
    fetchSettings();
  }, [fetchPending, fetchEmployees, fetchSettings]);

  // ── Return ──────────────────────────────────────────

  return {
    pendingRequests, filteredPending, pendingStats,
    allRequests, filteredAll, allStats,
    employees, holidays, otSettings, detectedOTInfo,
    loading, processing, processingIds,
    pendingType, setPendingType,
    activeType, activeStatus, searchTerm,
    setActiveType, setActiveStatus, setSearchTerm,
    fetchPending, fetchAll,
    handleApprove, handleReject, handleCancel,
    handleCreateRequest, handleEditRequest,
    detectOTRate, fetchEmployees,
  };
}
