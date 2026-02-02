/**
 * Admin Requests Hook
 * =============================================
 * Hook for managing admin request operations
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { format, parseISO, getDay } from "date-fns";
import { th } from "date-fns/locale";
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
  leaveTypeLabels,
} from "@/components/admin/requests/types";

interface UseAdminRequestsOptions {
  dateRange?: {
    start: string;
    end: string;
  };
}

interface UseAdminRequestsReturn {
  // Data
  requests: RequestItem[];
  filteredRequests: RequestItem[];
  stats: RequestStats;
  employees: Employee[];
  holidays: Holiday[];
  otSettings: OTSettings;
  workingDays: number[];
  loading: boolean;
  processing: boolean;
  detectedOTInfo: OTRateInfo | null;

  // Filters
  activeType: RequestType | "all";
  activeStatus: RequestStatus;
  searchTerm: string;
  setActiveType: (type: RequestType | "all") => void;
  setActiveStatus: (status: RequestStatus) => void;
  setSearchTerm: (term: string) => void;

  // Actions
  fetchRequests: () => Promise<void>;
  handleApprove: (request: RequestItem, adminId: string) => Promise<boolean>;
  handleReject: (request: RequestItem, adminId: string) => Promise<boolean>;
  handleCancel: (
    request: RequestItem,
    adminId: string,
    cancelReason: string
  ) => Promise<boolean>;
  handleCreateRequest: (
    type: RequestType,
    formData: CreateFormData,
    adminId: string
  ) => Promise<boolean>;
  handleEditRequest: (
    request: RequestItem,
    editData: any,
    adminId: string
  ) => Promise<boolean>;
  detectOTRate: (dateStr: string) => OTRateInfo;
}

const defaultDateRange = {
  start: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
  end: format(new Date(), "yyyy-MM-dd"),
};

export function useAdminRequests(
  options: UseAdminRequestsOptions = {}
): UseAdminRequestsReturn {
  const { dateRange = defaultDateRange } = options;

  // Data state
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [otSettings, setOtSettings] = useState<OTSettings>({
    workday: 1.5,
    weekend: 1.5,
    holiday: 2,
  });
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [detectedOTInfo, setDetectedOTInfo] = useState<OTRateInfo | null>(null);

  // Filter state
  const [activeType, setActiveType] = useState<RequestType | "all">("all");
  const [activeStatus, setActiveStatus] = useState<RequestStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all requests
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const [otRes, leaveRes, wfhRes, lateRes, fieldWorkRes] = await Promise.all([
        supabase
          .from("ot_requests")
          .select("*, employee:employees!employee_id(id, name, email)")
          .gte("request_date", dateRange.start)
          .lte("request_date", dateRange.end)
          .order("created_at", { ascending: false }),
        supabase
          .from("leave_requests")
          .select("*, employee:employees!employee_id(id, name, email)")
          .gte("start_date", dateRange.start)
          .lte("start_date", dateRange.end)
          .order("created_at", { ascending: false }),
        supabase
          .from("wfh_requests")
          .select("*, employee:employees!employee_id(id, name, email)")
          .gte("date", dateRange.start)
          .lte("date", dateRange.end)
          .order("created_at", { ascending: false }),
        supabase
          .from("late_requests")
          .select("*, employee:employees!employee_id(id, name, email)")
          .gte("request_date", dateRange.start)
          .lte("request_date", dateRange.end)
          .order("created_at", { ascending: false }),
        supabase
          .from("field_work_requests")
          .select("*, employee:employees!employee_id(id, name, email)")
          .gte("date", dateRange.start)
          .lte("date", dateRange.end)
          .order("created_at", { ascending: false }),
      ]);

      const allRequests: RequestItem[] = [];

      // Process OT
      (otRes.data || []).forEach((r: any) => {
        if (!r.employee?.id) return;
        const startTime = format(parseISO(r.requested_start_time), "HH:mm");
        const endTime = format(parseISO(r.requested_end_time), "HH:mm");
        allRequests.push({
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
          details: `เวลา: ${startTime} - ${endTime}\nชั่วโมง: ${
            r.approved_ot_hours ||
            (
              (new Date(r.requested_end_time).getTime() -
                new Date(r.requested_start_time).getTime()) /
              (1000 * 60 * 60)
            ).toFixed(2)
          } ชม.`,
          reason: r.reason,
          status: r.status,
          createdAt: r.created_at,
          approvedBy: r.approved_by,
          approvedAt: r.approved_at,
          cancelledBy: r.cancelled_by,
          cancelledAt: r.cancelled_at,
          cancelReason: r.cancel_reason,
          rawData: r,
        });
      });

      // Process Leave
      (leaveRes.data || []).forEach((r: any) => {
        if (!r.employee?.id) return;
        allRequests.push({
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
        });
      });

      // Process WFH
      (wfhRes.data || []).forEach((r: any) => {
        if (!r.employee?.id) return;
        allRequests.push({
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
        });
      });

      // Process Late
      (lateRes.data || []).forEach((r: any) => {
        if (!r.employee?.id) return;
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

        allRequests.push({
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
        });
      });

      // Process Field Work
      (fieldWorkRes.data || []).forEach((r: any) => {
        if (!r.employee?.id) return;
        allRequests.push({
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
        });
      });

      // Sort by date descending
      allRequests.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setRequests(allRequests);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // Fetch employees
  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("employees")
      .select("id, name, email, base_salary")
      .neq("role", "admin")
      .order("name");
    setEmployees(data || []);
  };

  // Fetch settings
  const fetchSettings = async () => {
    try {
      const { data: holidaysData } = await supabase
        .from("holidays")
        .select("date, name");
      setHolidays(holidaysData || []);

      const { data: settingsData } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", [
          "ot_rate_workday",
          "ot_rate_weekend",
          "ot_rate_holiday",
          "working_days",
        ]);

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
  };

  // Detect OT rate
  const detectOTRate = useCallback(
    (dateStr: string): OTRateInfo => {
      const date = new Date(dateStr);
      const dayOfWeek = getDay(date);
      const dayOfWeekISO = dayOfWeek === 0 ? 7 : dayOfWeek;

      // Check if holiday
      const holiday = holidays.find((h) => h.date === dateStr);
      if (holiday) {
        const info: OTRateInfo = {
          rate: otSettings.holiday,
          type: "holiday",
          typeName: `วันหยุดนักขัตฤกษ์ (${holiday.name})`,
          holidayName: holiday.name,
        };
        setDetectedOTInfo(info);
        return info;
      }

      // Check if weekend
      if (!workingDays.includes(dayOfWeekISO)) {
        const info: OTRateInfo = {
          rate: otSettings.weekend,
          type: "weekend",
          typeName: "วันหยุดสุดสัปดาห์",
        };
        setDetectedOTInfo(info);
        return info;
      }

      // Workday
      const info: OTRateInfo = {
        rate: otSettings.workday,
        type: "workday",
        typeName: "วันทำงานปกติ",
      };
      setDetectedOTInfo(info);
      return info;
    },
    [holidays, otSettings, workingDays]
  );

  // Initial fetch
  useEffect(() => {
    fetchRequests();
    fetchEmployees();
    fetchSettings();
  }, [fetchRequests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (activeType !== "all" && r.type !== activeType) return false;
      if (activeStatus !== "all" && r.status !== activeStatus) return false;
      if (
        searchTerm &&
        !r.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
      )
        return false;
      return true;
    });
  }, [requests, activeType, activeStatus, searchTerm]);

  // Stats
  const stats = useMemo<RequestStats>(() => {
    const counts: RequestStats = {
      ot: 0,
      leave: 0,
      wfh: 0,
      late: 0,
      field_work: 0,
      pending: 0,
      approved: 0,
      completed: 0,
      rejected: 0,
      cancelled: 0,
    };
    requests.forEach((r) => {
      counts[r.type]++;
      if (r.status in counts) (counts as any)[r.status]++;
    });
    return counts;
  }, [requests]);

  // Handle approve
  const handleApprove = async (
    request: RequestItem,
    adminId: string
  ): Promise<boolean> => {
    setProcessing(true);
    try {
      const updateData: any = {
        status: "approved",
        approved_by: adminId,
        approved_at: new Date().toISOString(),
      };

      if (request.type === "ot") {
        updateData.approved_start_time = request.rawData.requested_start_time;
        updateData.approved_end_time = request.rawData.requested_end_time;
        const start = new Date(request.rawData.requested_start_time);
        const end = new Date(request.rawData.requested_end_time);
        updateData.approved_ot_hours =
          (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }

      const { error } = await supabase
        .from(tableMap[request.type])
        .update(updateData)
        .eq("id", request.id);
      if (error) throw error;

      await fetchRequests();
      return true;
    } catch (error) {
      console.error("Error approving request:", error);
      return false;
    } finally {
      setProcessing(false);
    }
  };

  // Handle reject
  const handleReject = async (
    request: RequestItem,
    adminId: string
  ): Promise<boolean> => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from(tableMap[request.type])
        .update({
          status: "rejected",
          approved_by: adminId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (error) throw error;

      await fetchRequests();
      return true;
    } catch (error) {
      console.error("Error rejecting request:", error);
      return false;
    } finally {
      setProcessing(false);
    }
  };

  // Handle cancel
  const handleCancel = async (
    request: RequestItem,
    adminId: string,
    cancelReason: string
  ): Promise<boolean> => {
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

      await fetchRequests();
      return true;
    } catch (error) {
      console.error("Error cancelling request:", error);
      return false;
    } finally {
      setProcessing(false);
    }
  };

  // Handle create request
  const handleCreateRequest = async (
    type: RequestType,
    formData: CreateFormData,
    adminId: string
  ): Promise<boolean> => {
    if (!formData.employeeId) return false;

    setProcessing(true);
    try {
      const approvalData = {
        approved_by: adminId,
        approved_at: new Date().toISOString(),
      };

      switch (type) {
        case "ot": {
          const startDateTime = new Date(
            `${formData.otDate}T${formData.otStartTime}:00`
          );
          const endDateTime = new Date(
            `${formData.otDate}T${formData.otEndTime}:00`
          );
          const otHours =
            (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);

          const emp = employees.find((e) => e.id === formData.employeeId);
          const baseSalary = emp?.base_salary || 0;
          let otAmount = null;
          if (baseSalary > 0) {
            const hourlyRate = baseSalary / 30 / 8;
            otAmount =
              Math.round(otHours * hourlyRate * formData.otRate * 100) / 100;
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
            employee_id: formData.employeeId,
            leave_type: formData.leaveType,
            start_date: formData.leaveStartDate,
            end_date: formData.leaveEndDate,
            is_half_day: formData.leaveIsHalfDay,
            reason: formData.reason,
            status: "approved",
            ...approvalData,
          });
          if (error) throw error;
          break;
        }

        case "wfh": {
          const { error } = await supabase.from("wfh_requests").insert({
            employee_id: formData.employeeId,
            date: formData.wfhDate,
            is_half_day: formData.wfhIsHalfDay,
            reason: formData.reason,
            status: "approved",
            ...approvalData,
          });
          if (error) throw error;
          break;
        }

        case "late": {
          const { error } = await supabase.from("late_requests").insert({
            employee_id: formData.employeeId,
            request_date: formData.lateDate,
            actual_late_minutes: formData.lateMinutes,
            reason: formData.reason,
            status: "approved",
            ...approvalData,
          });
          if (error) throw error;
          break;
        }

        case "field_work": {
          if (!formData.fieldWorkLocation.trim()) return false;
          const { error } = await supabase.from("field_work_requests").insert({
            employee_id: formData.employeeId,
            date: formData.fieldWorkDate,
            is_half_day: formData.fieldWorkIsHalfDay,
            location: formData.fieldWorkLocation.trim(),
            reason: formData.reason,
            status: "approved",
            ...approvalData,
          });
          if (error) throw error;
          break;
        }
      }

      await fetchRequests();
      return true;
    } catch (error) {
      console.error("Error creating request:", error);
      return false;
    } finally {
      setProcessing(false);
    }
  };

  // Handle edit request
  const handleEditRequest = async (
    request: RequestItem,
    editData: any,
    adminId: string
  ): Promise<boolean> => {
    setProcessing(true);
    try {
      let updateData: any = {};

      switch (request.type) {
        case "ot":
          const startDateTime = `${request.rawData.request_date}T${editData.requested_start_time}:00`;
          const endDateTime = `${request.rawData.request_date}T${editData.requested_end_time}:00`;
          updateData = {
            requested_start_time: startDateTime,
            requested_end_time: endDateTime,
            reason: editData.reason,
          };
          break;
        case "leave":
          updateData = {
            leave_type: editData.leave_type,
            start_date: editData.start_date,
            end_date: editData.end_date,
            is_half_day: editData.is_half_day,
            reason: editData.reason,
          };
          break;
        case "wfh":
          updateData = {
            date: editData.date,
            is_half_day: editData.is_half_day,
            reason: editData.reason,
          };
          break;
        case "late":
          updateData = {
            request_date: editData.request_date,
            actual_late_minutes: editData.actual_late_minutes,
            reason: editData.reason,
          };
          break;
        case "field_work":
          updateData = {
            date: editData.date,
            location: editData.location,
            is_half_day: editData.is_half_day,
            reason: editData.reason,
          };
          break;
      }

      const { error } = await supabase
        .from(tableMap[request.type])
        .update(updateData)
        .eq("id", request.id);

      if (error) throw error;

      await fetchRequests();
      return true;
    } catch (error) {
      console.error("Error editing request:", error);
      return false;
    } finally {
      setProcessing(false);
    }
  };

  return {
    // Data
    requests,
    filteredRequests,
    stats,
    employees,
    holidays,
    otSettings,
    workingDays,
    loading,
    processing,
    detectedOTInfo,

    // Filters
    activeType,
    activeStatus,
    searchTerm,
    setActiveType,
    setActiveStatus,
    setSearchTerm,

    // Actions
    fetchRequests,
    handleApprove,
    handleReject,
    handleCancel,
    handleCreateRequest,
    handleEditRequest,
    detectOTRate,
  };
}
