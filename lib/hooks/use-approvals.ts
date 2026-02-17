/**
 * Approvals Hook
 * =============================================
 * Hook for fetching and managing approval requests
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
  RequestItem,
  RequestType,
  HistoryStatus,
} from "@/lib/types/request";

interface ApprovalStats {
  ot: number;
  leave: number;
  wfh: number;
  late: number;
  field_work: number;
  total: number;
}

interface UseApprovalsOptions {
  initialType?: RequestType | "all";
}

interface UseApprovalsReturn {
  // Data
  requests: RequestItem[];
  historyRequests: RequestItem[];
  loading: boolean;
  processingIds: Set<string>;
  stats: ApprovalStats;

  // Filters
  activeType: RequestType | "all";
  historyStatus: HistoryStatus;
  filteredRequests: RequestItem[];
  filteredHistory: RequestItem[];

  // Setters
  setActiveType: (type: RequestType | "all") => void;
  setHistoryStatus: (status: HistoryStatus) => void;

  // Actions
  fetchPending: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  handleAction: (
    request: RequestItem,
    approved: boolean,
    adminId: string
  ) => Promise<{ success: boolean; error?: string }>;
  handleCancel: (
    request: RequestItem,
    adminId: string,
    cancelReason: string
  ) => Promise<{ success: boolean; error?: string }>;
}

const tableMap: Record<RequestType, string> = {
  ot: "ot_requests",
  leave: "leave_requests",
  wfh: "wfh_requests",
  late: "late_requests",
  field_work: "field_work_requests",
};

const leaveTypeLabels: Record<string, string> = {
  sick: "ลาป่วย",
  personal: "ลากิจ",
  annual: "ลาพักร้อน",
  maternity: "ลาคลอด",
  military: "ลากรณีทหาร",
  other: "อื่นๆ",
};

function processRequest(
  r: any,
  type: RequestType,
  status: string
): RequestItem | null {
  if (!r.employee?.id) return null;

  let title = "";
  let subtitle = "";
  let date = "";

  switch (type) {
    case "ot":
      title = `OT ${format(new Date(r.requested_start_time), "HH:mm")} - ${format(
        new Date(r.requested_end_time),
        "HH:mm"
      )}`;
      subtitle = format(new Date(r.request_date), "d MMM yyyy", { locale: th });
      date = r.request_date;
      break;
    case "leave":
      title = leaveTypeLabels[r.leave_type] || r.leave_type;
      subtitle = r.is_half_day
        ? `${format(new Date(r.start_date), "d MMM", { locale: th })} (ครึ่งวัน)`
        : `${format(new Date(r.start_date), "d MMM", { locale: th })} - ${format(
            new Date(r.end_date),
            "d MMM",
            { locale: th }
          )}`;
      date = r.start_date;
      break;
    case "wfh":
      title = r.is_half_day ? "WFH ครึ่งวัน" : "WFH เต็มวัน";
      subtitle = format(new Date(r.date), "EEEE d MMM yyyy", { locale: th });
      date = r.date;
      break;
    case "late":
      title = r.actual_late_minutes
        ? `สาย ${r.actual_late_minutes} นาที`
        : "ขออนุมัติมาสาย";
      subtitle = format(new Date(r.request_date), "d MMM yyyy", { locale: th });
      date = r.request_date;
      break;
    case "field_work":
      title = r.is_half_day ? "งานนอกสถานที่ ครึ่งวัน" : "งานนอกสถานที่ เต็มวัน";
      subtitle = `${format(new Date(r.date), "d MMM", { locale: th })} • ${
        r.location
      }`;
      date = r.date;
      break;
  }

  return {
    id: r.id,
    type,
    employeeId: r.employee.id,
    employeeName: r.employee.name,
    employeeEmail: r.employee.email || "",
    date,
    title,
    subtitle,
    reason: r.reason,
    createdAt: r.created_at,
    status,
    approvedBy: r.approved_by,
    approvedAt: r.approved_at,
    cancelledBy: r.cancelled_by,
    cancelledAt: r.cancelled_at,
    cancelReason: r.cancel_reason,
    rawData: r,
  };
}

export function useApprovals(
  options: UseApprovalsOptions = {}
): UseApprovalsReturn {
  const { initialType = "all" } = options;

  // Data state
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [historyRequests, setHistoryRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Filter state
  const [activeType, setActiveType] = useState<RequestType | "all">(initialType);
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>("all");

  // Fetch pending requests
  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const [otRes, leaveRes, wfhRes, lateRes, fieldWorkRes] = await Promise.all(
        [
          supabase
            .from("ot_requests")
            .select("*, employee:employees!employee_id(id, name, email)")
            .eq("status", "pending")
            .order("created_at", { ascending: false }),
          supabase
            .from("leave_requests")
            .select("*, employee:employees!employee_id(id, name, email)")
            .eq("status", "pending")
            .order("created_at", { ascending: false }),
          supabase
            .from("wfh_requests")
            .select("*, employee:employees!employee_id(id, name, email)")
            .eq("status", "pending")
            .order("created_at", { ascending: false }),
          supabase
            .from("late_requests")
            .select("*, employee:employees!employee_id(id, name, email)")
            .eq("status", "pending")
            .order("created_at", { ascending: false }),
          supabase
            .from("field_work_requests")
            .select("*, employee:employees!employee_id(id, name, email)")
            .eq("status", "pending")
            .order("created_at", { ascending: false }),
        ]
      );

      const allRequests: RequestItem[] = [];

      (otRes.data || []).forEach((r: any) => {
        const item = processRequest(r, "ot", "pending");
        if (item) allRequests.push(item);
      });
      (leaveRes.data || []).forEach((r: any) => {
        const item = processRequest(r, "leave", "pending");
        if (item) allRequests.push(item);
      });
      (wfhRes.data || []).forEach((r: any) => {
        const item = processRequest(r, "wfh", "pending");
        if (item) allRequests.push(item);
      });
      (lateRes.data || []).forEach((r: any) => {
        const item = processRequest(r, "late", "pending");
        if (item) allRequests.push(item);
      });
      (fieldWorkRes.data || []).forEach((r: any) => {
        const item = processRequest(r, "field_work", "pending");
        if (item) allRequests.push(item);
      });

      allRequests.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setRequests(allRequests);
    } catch (error) {
      console.error("Error fetching pending:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const statusFilter =
        historyStatus === "all"
          ? ["approved", "rejected", "cancelled"]
          : [historyStatus];

      const [otRes, leaveRes, wfhRes, lateRes, fieldWorkRes] = await Promise.all(
        [
          supabase
            .from("ot_requests")
            .select("*, employee:employees!employee_id(id, name, email)")
            .in("status", statusFilter)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("leave_requests")
            .select("*, employee:employees!employee_id(id, name, email)")
            .in("status", statusFilter)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("wfh_requests")
            .select("*, employee:employees!employee_id(id, name, email)")
            .in("status", statusFilter)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("late_requests")
            .select("*, employee:employees!employee_id(id, name, email)")
            .in("status", statusFilter)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("field_work_requests")
            .select("*, employee:employees!employee_id(id, name, email)")
            .in("status", statusFilter)
            .order("created_at", { ascending: false })
            .limit(50),
        ]
      );

      const allHistory: RequestItem[] = [];

      (otRes.data || []).forEach((r: any) => {
        const item = processRequest(r, "ot", r.status);
        if (item) allHistory.push(item);
      });
      (leaveRes.data || []).forEach((r: any) => {
        const item = processRequest(r, "leave", r.status);
        if (item) allHistory.push(item);
      });
      (wfhRes.data || []).forEach((r: any) => {
        const item = processRequest(r, "wfh", r.status);
        if (item) allHistory.push(item);
      });
      (lateRes.data || []).forEach((r: any) => {
        const item = processRequest(r, "late", r.status);
        if (item) allHistory.push(item);
      });
      (fieldWorkRes.data || []).forEach((r: any) => {
        const item = processRequest(r, "field_work", r.status);
        if (item) allHistory.push(item);
      });

      allHistory.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setHistoryRequests(allHistory);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  }, [historyStatus]);

  // Handle approve/reject
  const handleAction = useCallback(
    async (
      request: RequestItem,
      approved: boolean,
      adminId: string
    ): Promise<{ success: boolean; error?: string }> => {
      const key = `${request.type}_${request.id}`;
      setProcessingIds((prev) => new Set(prev).add(key));

      try {
        const updateData: any = {
          status: approved ? "approved" : "rejected",
          approved_by: adminId,
          approved_at: new Date().toISOString(),
        };

        if (request.type === "ot" && approved) {
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

        setRequests((prev) =>
          prev.filter(
            (r) => !(r.type === request.type && r.id === request.id)
          )
        );
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error?.message };
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    []
  );

  // Handle cancel (with leave balance restoration for approved leave requests)
  const handleCancel = useCallback(
    async (
      request: RequestItem,
      adminId: string,
      cancelReason: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!cancelReason.trim()) {
        return { success: false, error: "กรุณาระบุเหตุผล" };
      }

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

        // Restore leave balance if cancelling an approved leave request
        if (request.type === "leave" && request.status === "approved") {
          const raw = request.rawData;
          const leaveType = raw.leave_type as string;
          const year = new Date(raw.start_date).getFullYear();

          // Calculate days to restore
          let daysToRestore = 0;
          if (raw.is_half_day) {
            daysToRestore = 0.5;
          } else {
            const start = new Date(raw.start_date);
            const end = new Date(raw.end_date);
            daysToRestore =
              Math.ceil(
                (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
              ) + 1;
          }

          // Map leave type to balance columns
          const columnMap: Record<string, { used: string; remaining: string }> = {
            annual: { used: "annual_leave_used", remaining: "annual_leave_remaining" },
            sick: { used: "sick_leave_used", remaining: "sick_leave_remaining" },
            personal: { used: "personal_leave_used", remaining: "personal_leave_remaining" },
          };

          const cols = columnMap[leaveType];
          if (cols) {
            // Fetch current balance
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

        await fetchHistory();
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error?.message };
      }
    },
    [fetchHistory]
  );

  // Stats
  const stats = useMemo<ApprovalStats>(() => {
    const counts = { ot: 0, leave: 0, wfh: 0, late: 0, field_work: 0, total: 0 };
    requests.forEach((r) => counts[r.type]++);
    counts.total = requests.length;
    return counts;
  }, [requests]);

  // Filtered
  const filteredRequests = useMemo(() => {
    return activeType === "all"
      ? requests
      : requests.filter((r) => r.type === activeType);
  }, [requests, activeType]);

  const filteredHistory = useMemo(() => {
    return activeType === "all"
      ? historyRequests
      : historyRequests.filter((r) => r.type === activeType);
  }, [historyRequests, activeType]);

  return {
    // Data
    requests,
    historyRequests,
    loading,
    processingIds,
    stats,

    // Filters
    activeType,
    historyStatus,
    filteredRequests,
    filteredHistory,

    // Setters
    setActiveType,
    setHistoryStatus,

    // Actions
    fetchPending,
    fetchHistory,
    handleAction,
    handleCancel,
  };
}
