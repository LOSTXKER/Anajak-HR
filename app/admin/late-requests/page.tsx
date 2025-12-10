"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import {
  AlertTriangle,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  FileText,
  History,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { th } from "date-fns/locale";

// Types
interface LateRequest {
  id: string;
  employee_id: string;
  request_date: string;
  reason: string;
  actual_late_minutes: number | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  employee: { id: string; name: string; email: string } | null;
}

interface LateHistory {
  id: string;
  employee_id: string;
  work_date: string;
  clock_in_time: string;
  late_minutes: number;
  employee: { id: string; name: string; email: string } | null;
  has_request: boolean;
}

type ViewMode = "requests" | "history";
type FilterStatus = "all" | "pending" | "approved" | "rejected";

function LateRequestsContent() {
  const toast = useToast();

  // State
  const [viewMode, setViewMode] = useState<ViewMode>("requests");
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");

  // Requests state
  const [requests, setRequests] = useState<LateRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("pending");

  // History state
  const [lateHistory, setLateHistory] = useState<LateHistory[]>([]);
  const [historyFilter, setHistoryFilter] = useState("all");

  // Fetch requests
  const fetchRequests = useCallback(async () => {
    if (viewMode !== "requests") return;
    setLoading(true);
    try {
      const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      let query = supabase
        .from("late_requests")
        .select("*")
        .gte("request_date", startDate)
        .lte("request_date", endDate)
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") query = query.eq("status", filterStatus);

      const { data: lateData, error } = await query;
      if (error) throw error;

      if (!lateData || lateData.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      // Fetch employees
      const employeeIds = [...new Set(lateData.map((r: any) => r.employee_id))];
      const { data: empData } = await supabase
        .from("employees")
        .select("id, name, email")
        .in("id", employeeIds);

      const empMap = new Map((empData || []).map((e: any) => [e.id, e]));

      setRequests(lateData.map((r: any) => ({
        ...r,
        employee: empMap.get(r.employee_id) || null,
      })));
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message);
    } finally {
      setLoading(false);
    }
  }, [viewMode, currentMonth, filterStatus, toast]);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    if (viewMode !== "history") return;
    setLoading(true);
    try {
      const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      // Fetch late attendance
      const { data: attData, error } = await supabase
        .from("attendance_logs")
        .select("id, employee_id, work_date, clock_in_time, late_minutes")
        .eq("is_late", true)
        .gte("work_date", startDate)
        .lte("work_date", endDate)
        .order("work_date", { ascending: false });

      if (error) throw error;

      if (!attData || attData.length === 0) {
        setLateHistory([]);
        setLoading(false);
        return;
      }

      // Fetch employees
      const employeeIds = [...new Set(attData.map((a: any) => a.employee_id))];
      const { data: empData } = await supabase
        .from("employees")
        .select("id, name, email")
        .in("id", employeeIds);

      // Fetch approved requests
      const { data: requestsData } = await supabase
        .from("late_requests")
        .select("employee_id, request_date")
        .in("status", ["approved", "pending"])
        .gte("request_date", startDate)
        .lte("request_date", endDate);

      const requestSet = new Set((requestsData || []).map((r: any) => `${r.employee_id}_${r.request_date}`));
      const empMap = new Map((empData || []).map((e: any) => [e.id, e]));

      let history = attData.map((a: any) => ({
        ...a,
        employee: empMap.get(a.employee_id) || null,
        has_request: requestSet.has(`${a.employee_id}_${a.work_date}`),
      }));

      // Apply filter
      if (historyFilter === "with_request") history = history.filter((h: any) => h.has_request);
      else if (historyFilter === "no_request") history = history.filter((h: any) => !h.has_request);

      setLateHistory(history);
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message);
    } finally {
      setLoading(false);
    }
  }, [viewMode, currentMonth, historyFilter, toast]);

  useEffect(() => {
    if (viewMode === "requests") fetchRequests();
    else fetchHistory();
  }, [viewMode, fetchRequests, fetchHistory]);

  // Stats
  const requestStats = useMemo(() => {
    const pending = requests.filter((r) => r.status === "pending").length;
    const approved = requests.filter((r) => r.status === "approved").length;
    const rejected = requests.filter((r) => r.status === "rejected").length;
    return { total: requests.length, pending, approved, rejected };
  }, [requests]);

  const historyStats = useMemo(() => {
    const total = lateHistory.length;
    const withRequest = lateHistory.filter((h) => h.has_request).length;
    const noRequest = lateHistory.filter((h) => !h.has_request).length;
    const totalMinutes = lateHistory.reduce((sum, h) => sum + (h.late_minutes || 0), 0);
    return { total, withRequest, noRequest, totalMinutes };
  }, [lateHistory]);

  // Filtered
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (!searchTerm) return true;
      return r.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [requests, searchTerm]);

  const filteredHistory = useMemo(() => {
    return lateHistory.filter((h) => {
      if (!searchTerm) return true;
      return h.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [lateHistory, searchTerm]);

  // Export CSV
  const exportHistoryCSV = () => {
    if (!lateHistory.length) return;
    const headers = ["วันที่", "พนักงาน", "เวลาเข้างาน", "สาย (นาที)", "มีคำขอ"];
    const rows = lateHistory.map((h) => [
      format(new Date(h.work_date), "dd/MM/yyyy"),
      h.employee?.name || "-",
      format(new Date(h.clock_in_time), "HH:mm"),
      h.late_minutes.toString(),
      h.has_request ? "มี" : "ไม่มี",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `late-history-${format(currentMonth, "yyyy-MM")}.csv`;
    link.click();
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="warning">รออนุมัติ</Badge>;
      case "approved": return <Badge variant="success">อนุมัติแล้ว</Badge>;
      case "rejected": return <Badge variant="danger">ไม่อนุมัติ</Badge>;
      case "cancelled": return <Badge variant="default">ยกเลิก</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <AdminLayout title="คำขอมาสาย">
      {/* View Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex p-1 bg-[#f5f5f7] rounded-xl">
          <button
            onClick={() => setViewMode("requests")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "requests" ? "bg-white shadow-sm text-[#1d1d1f]" : "text-[#86868b]"
            }`}
          >
            <FileText className="w-4 h-4" />
            คำขอมาสาย
            {requestStats.pending > 0 && (
              <span className="px-1.5 py-0.5 bg-[#ff9500] text-white text-[10px] rounded-full">{requestStats.pending}</span>
            )}
          </button>
          <button
            onClick={() => setViewMode("history")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "history" ? "bg-white shadow-sm text-[#1d1d1f]" : "text-[#86868b]"
            }`}
          >
            <History className="w-4 h-4" />
            ประวัติมาสาย
          </button>
        </div>

        {viewMode === "history" && (
          <Button variant="secondary" onClick={exportHistoryCSV} disabled={!lateHistory.length}>
            <Download className="w-4 h-4" />
            Export
          </Button>
        )}
      </div>

      {/* Month Navigation & Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-[#f5f5f7] rounded-lg">
            <ChevronLeft className="w-5 h-5 text-[#6e6e73]" />
          </button>
          <h2 className="text-lg font-semibold text-[#1d1d1f] min-w-[160px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: th })}
          </h2>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-[#f5f5f7] rounded-lg">
            <ChevronRight className="w-5 h-5 text-[#6e6e73]" />
          </button>
        </div>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
          <input
            type="text"
            placeholder="ค้นหาพนักงาน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#d2d2d7] focus:border-[#0071e3] outline-none text-sm"
          />
        </div>

        {viewMode === "requests" ? (
          <Select
            value={filterStatus}
            onChange={(v) => setFilterStatus(v as FilterStatus)}
            options={[
              { value: "pending", label: "รออนุมัติ" },
              { value: "approved", label: "อนุมัติแล้ว" },
              { value: "rejected", label: "ไม่อนุมัติ" },
              { value: "all", label: "ทั้งหมด" },
            ]}
          />
        ) : (
          <Select
            value={historyFilter}
            onChange={setHistoryFilter}
            options={[
              { value: "all", label: "ทั้งหมด" },
              { value: "with_request", label: "มีคำขอ" },
              { value: "no_request", label: "ไม่มีคำขอ" },
            ]}
          />
        )}

        <Button variant="text" onClick={viewMode === "requests" ? fetchRequests : fetchHistory} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Stats */}
      {viewMode === "requests" ? (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "รออนุมัติ", value: requestStats.pending, color: "text-[#ff9500]", bg: "bg-[#ff9500]/10" },
            { label: "อนุมัติแล้ว", value: requestStats.approved, color: "text-[#34c759]", bg: "bg-[#34c759]/10" },
            { label: "ไม่อนุมัติ", value: requestStats.rejected, color: "text-[#ff3b30]", bg: "bg-[#ff3b30]/10" },
          ].map((s, i) => (
            <Card key={i} elevated className="!p-3">
              <div className="text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-[#86868b]">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "ครั้งที่มาสาย", value: historyStats.total, color: "text-[#ff9500]", bg: "bg-[#ff9500]/10" },
            { label: "มีคำขอ", value: historyStats.withRequest, color: "text-[#34c759]", bg: "bg-[#34c759]/10" },
            { label: "ไม่มีคำขอ", value: historyStats.noRequest, color: "text-[#ff3b30]", bg: "bg-[#ff3b30]/10" },
            { label: "รวม (นาที)", value: historyStats.totalMinutes, color: "text-[#0071e3]", bg: "bg-[#0071e3]/10" },
          ].map((s, i) => (
            <Card key={i} elevated className="!p-3">
              <div className="text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-[#86868b]">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#ff9500] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : viewMode === "requests" ? (
        // Requests List
        filteredRequests.length === 0 ? (
          <Card elevated className="text-center py-16 text-[#86868b]">
            ไม่มีคำขอ{filterStatus === "pending" ? "ที่รออนุมัติ" : ""}
          </Card>
        ) : (
          <Card elevated padding="none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e8e8ed] bg-[#f9f9fb]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#86868b] uppercase">พนักงาน</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">วันที่</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">สาย</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">เหตุผล</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">สถานะ</th>
                    <th className="text-right px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8ed]">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-[#f5f5f7]/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={req.employee?.name || "?"} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-[#1d1d1f]">{req.employee?.name}</p>
                            <p className="text-[11px] text-[#86868b]">{req.employee?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-[#1d1d1f]">
                        {format(new Date(req.request_date), "d MMM yyyy", { locale: th })}
                      </td>
                      <td className="text-center px-3 py-3">
                        {req.actual_late_minutes ? (
                          <span className="text-sm font-medium text-[#ff9500]">{req.actual_late_minutes} นาที</span>
                        ) : (
                          <span className="text-sm text-[#86868b]">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-sm text-[#1d1d1f] max-w-[200px] truncate">{req.reason}</p>
                      </td>
                      <td className="text-center px-3 py-3">{getStatusBadge(req.status)}</td>
                      <td className="text-right px-4 py-3">
                        {req.status === "pending" && (
                          <a
                            href="/admin/approvals"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-[#ff9500] bg-[#ff9500]/10 rounded-lg hover:bg-[#ff9500]/20"
                          >
                            <Clock className="w-3 h-3" />
                            รออนุมัติ
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : (
        // History List
        filteredHistory.length === 0 ? (
          <Card elevated className="text-center py-16 text-[#86868b]">
            ไม่มีประวัติการมาสายในเดือนนี้
          </Card>
        ) : (
          <Card elevated padding="none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e8e8ed] bg-[#f9f9fb]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#86868b] uppercase">พนักงาน</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">วันที่</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">เวลาเข้า</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">สาย (นาที)</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">คำขอ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8ed]">
                  {filteredHistory.map((h) => (
                    <tr key={h.id} className="hover:bg-[#f5f5f7]/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={h.employee?.name || "?"} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-[#1d1d1f]">{h.employee?.name}</p>
                            <p className="text-[11px] text-[#86868b]">{h.employee?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-[#1d1d1f]">
                        {format(new Date(h.work_date), "d MMM yyyy", { locale: th })}
                      </td>
                      <td className="text-center px-3 py-3 text-sm text-[#6e6e73]">
                        {format(new Date(h.clock_in_time), "HH:mm")} น.
                      </td>
                      <td className="text-center px-3 py-3">
                        <span className="text-sm font-medium text-[#ff9500]">{h.late_minutes} นาที</span>
                      </td>
                      <td className="text-center px-3 py-3">
                        {h.has_request ? (
                          <span className="inline-flex items-center gap-1 text-xs text-[#34c759]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            มีคำขอ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-[#ff3b30]">
                            <XCircle className="w-3.5 h-3.5" />
                            ไม่มี
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}
    </AdminLayout>
  );
}

export default function LateRequestsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <LateRequestsContent />
    </ProtectedRoute>
  );
}
