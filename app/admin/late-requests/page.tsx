"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import {
  Clock,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  History,
  FileText,
  Download,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { th } from "date-fns/locale";

interface LateRequest {
  id: string;
  employee_id: string;
  request_date: string;
  reason: string;
  actual_late_minutes: number | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  employees: {
    name: string;
    email: string;
  };
}

interface LateHistory {
  id: string;
  employee_id: string;
  work_date: string;
  clock_in_time: string;
  late_minutes: number;
  employee: {
    name: string;
    email: string;
  };
  has_approved_request: boolean;
}

type TabType = "requests" | "history";

function LateRequestsContent() {
  const toast = useToast();
  const { employee: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("requests");
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<LateRequest[]>([]);
  const [lateHistory, setLateHistory] = useState<LateHistory[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [historyFilter, setHistoryFilter] = useState("all"); // all, with_request, no_request

  // Modal
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    request: LateRequest | null;
    action: "approve" | "reject";
  }>({ open: false, request: null, action: "approve" });
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (activeTab === "requests") {
      fetchRequests();
    } else {
      fetchLateHistory();
    }
  }, [currentMonth, statusFilter, activeTab, historyFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      // First fetch late requests
      let query = supabase
        .from("late_requests")
        .select("*")
        .gte("request_date", startDate)
        .lte("request_date", endDate)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data: lateData, error: lateError } = await query;

      if (lateError) {
        console.error("Late requests error:", lateError);
        throw lateError;
      }

      if (!lateData || lateData.length === 0) {
        setRequests([]);
        return;
      }

      // Fetch employee info separately
      const employeeIds = [...new Set(lateData.map((r: any) => r.employee_id))];
      const { data: employeesData, error: empError } = await supabase
        .from("employees")
        .select("id, name, email")
        .in("id", employeeIds);

      if (empError) {
        console.error("Employees error:", empError);
      }

      // Map employees to requests
      const employeeMap = new Map(
        (employeesData || []).map((e: any) => [e.id, { name: e.name, email: e.email }])
      );

      const requestsWithEmployees = lateData.map((req: any) => ({
        ...req,
        employees: employeeMap.get(req.employee_id) || { name: "Unknown", email: "" }
      }));

      setRequests(requestsWithEmployees);
    } catch (error: any) {
      console.error("Error details:", JSON.stringify(error, null, 2));
      toast.error("เกิดข้อผิดพลาด", error?.message || "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  const fetchLateHistory = async () => {
    setLoading(true);
    try {
      const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      // Fetch late attendance records
      const { data: attendanceData, error: attError } = await supabase
        .from("attendance_logs")
        .select("id, employee_id, work_date, clock_in_time, late_minutes, is_late")
        .eq("is_late", true)
        .gte("work_date", startDate)
        .lte("work_date", endDate)
        .order("work_date", { ascending: false });

      if (attError) throw attError;

      if (!attendanceData || attendanceData.length === 0) {
        setLateHistory([]);
        return;
      }

      // Fetch employee info
      const employeeIds = [...new Set(attendanceData.map((a: any) => a.employee_id))];
      const { data: employeesData } = await supabase
        .from("employees")
        .select("id, name, email")
        .in("id", employeeIds);

      // Fetch approved late requests for this month
      const { data: approvedRequests } = await supabase
        .from("late_requests")
        .select("employee_id, request_date")
        .in("status", ["approved", "pending"])
        .gte("request_date", startDate)
        .lte("request_date", endDate);

      const approvedSet = new Set(
        (approvedRequests || []).map((r: any) => `${r.employee_id}_${r.request_date}`)
      );

      const employeeMap = new Map(
        (employeesData || []).map((e: any) => [e.id, { name: e.name, email: e.email }])
      );

      let historyData = attendanceData.map((att: any) => ({
        id: att.id,
        employee_id: att.employee_id,
        work_date: att.work_date,
        clock_in_time: att.clock_in_time,
        late_minutes: att.late_minutes || 0,
        employee: employeeMap.get(att.employee_id) || { name: "Unknown", email: "" },
        has_approved_request: approvedSet.has(`${att.employee_id}_${att.work_date}`),
      }));

      // Apply history filter
      if (historyFilter === "with_request") {
        historyData = historyData.filter((h: any) => h.has_approved_request);
      } else if (historyFilter === "no_request") {
        historyData = historyData.filter((h: any) => !h.has_approved_request);
      }

      setLateHistory(historyData);
    } catch (error: any) {
      console.error("Error fetching late history:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดประวัติได้");
    } finally {
      setLoading(false);
    }
  };

  const exportHistoryCSV = () => {
    if (!lateHistory.length) return;
    const headers = ["วันที่", "พนักงาน", "เวลาเข้างาน", "สาย (นาที)", "มีคำขอ"];
    const rows = lateHistory.map((h) => [
      format(new Date(h.work_date), "dd/MM/yyyy"),
      h.employee.name,
      format(new Date(h.clock_in_time), "HH:mm"),
      h.late_minutes.toString(),
      h.has_approved_request ? "มี" : "ไม่มี",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `late-history-${format(currentMonth, "yyyy-MM")}.csv`;
    link.click();
  };

  const handleAction = async () => {
    if (!actionModal.request || !currentUser) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("late_requests")
        .update({
          status: actionModal.action === "approve" ? "approved" : "rejected",
          approved_by: currentUser.id,
          approved_at: new Date().toISOString(),
          admin_note: adminNote || null,
        })
        .eq("id", actionModal.request.id);

      if (error) throw error;

      toast.success(
        actionModal.action === "approve" ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว",
        `คำขอของ ${actionModal.request.employees.name} ถูก${actionModal.action === "approve" ? "อนุมัติ" : "ปฏิเสธ"}แล้ว`
      );

      setActionModal({ open: false, request: null, action: "approve" });
      setAdminNote("");
      fetchRequests();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถดำเนินการได้");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="success">อนุมัติแล้ว</Badge>;
      case "rejected":
        return <Badge variant="danger">ไม่อนุมัติ</Badge>;
      case "cancelled":
        return <Badge variant="default">ยกเลิก</Badge>;
      default:
        return <Badge variant="warning">รออนุมัติ</Badge>;
    }
  };

  const filteredRequests = requests.filter((req) =>
    req.employees.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.employees.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  // History stats
  const totalLateCount = lateHistory.length;
  const withRequestCount = lateHistory.filter((h) => h.has_approved_request).length;
  const noRequestCount = lateHistory.filter((h) => !h.has_approved_request).length;
  const totalLateMinutes = lateHistory.reduce((sum, h) => sum + h.late_minutes, 0);

  return (
    <AdminLayout title="คำขอมาสาย" description="จัดการคำขออนุมัติมาสาย และประวัติการมาสาย">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[#e8e8ed]">
        <button
          onClick={() => setActiveTab("requests")}
          className={`flex items-center gap-2 px-4 py-3 text-[15px] font-medium border-b-2 transition-colors ${
            activeTab === "requests"
              ? "border-[#0071e3] text-[#0071e3]"
              : "border-transparent text-[#86868b] hover:text-[#1d1d1f]"
          }`}
        >
          <FileText className="w-4 h-4" />
          คำขอมาสาย
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 bg-[#ff9500] text-white text-[11px] rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-3 text-[15px] font-medium border-b-2 transition-colors ${
            activeTab === "history"
              ? "border-[#0071e3] text-[#0071e3]"
              : "border-transparent text-[#86868b] hover:text-[#1d1d1f]"
          }`}
        >
          <History className="w-4 h-4" />
          ประวัติการมาสาย
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[#6e6e73]" />
          </button>
          <h2 className="text-[17px] font-semibold text-[#1d1d1f] min-w-[180px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: th })}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-[#6e6e73]" />
          </button>
        </div>

        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
          <input
            type="text"
            placeholder="ค้นหาพนักงาน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#d2d2d7] focus:border-[#0071e3] outline-none text-[15px]"
          />
        </div>

        {/* Tab-specific filter */}
        {activeTab === "requests" ? (
          <div className="min-w-[150px]">
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "pending", label: "รออนุมัติ" },
                { value: "approved", label: "อนุมัติแล้ว" },
                { value: "rejected", label: "ไม่อนุมัติ" },
                { value: "all", label: "ทั้งหมด" },
              ]}
              placeholder="สถานะ"
            />
          </div>
        ) : (
          <>
            <div className="min-w-[150px]">
              <Select
                value={historyFilter}
                onChange={setHistoryFilter}
                options={[
                  { value: "all", label: "ทั้งหมด" },
                  { value: "with_request", label: "มีคำขอ" },
                  { value: "no_request", label: "ไม่มีคำขอ" },
                ]}
                placeholder="สถานะคำขอ"
              />
            </div>
            <Button variant="secondary" size="sm" onClick={exportHistoryCSV}>
              <Download className="w-4 h-4" />
              Export
            </Button>
          </>
        )}
      </div>

      {/* Stats - conditionally render based on tab */}
      {activeTab === "requests" ? (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card elevated>
            <div className="text-center py-2">
              <p className="text-[24px] font-semibold text-[#ff9500]">{pendingCount}</p>
              <p className="text-[12px] text-[#86868b]">รออนุมัติ</p>
            </div>
          </Card>
          <Card elevated>
            <div className="text-center py-2">
              <p className="text-[24px] font-semibold text-[#34c759]">{approvedCount}</p>
              <p className="text-[12px] text-[#86868b]">อนุมัติแล้ว</p>
            </div>
          </Card>
          <Card elevated>
            <div className="text-center py-2">
              <p className="text-[24px] font-semibold text-[#ff3b30]">{rejectedCount}</p>
              <p className="text-[12px] text-[#86868b]">ไม่อนุมัติ</p>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card elevated>
            <div className="text-center py-2">
              <p className="text-[24px] font-semibold text-[#ff9500]">{totalLateCount}</p>
              <p className="text-[12px] text-[#86868b]">ครั้งที่มาสาย</p>
            </div>
          </Card>
          <Card elevated>
            <div className="text-center py-2">
              <p className="text-[24px] font-semibold text-[#34c759]">{withRequestCount}</p>
              <p className="text-[12px] text-[#86868b]">มีคำขอ</p>
            </div>
          </Card>
          <Card elevated>
            <div className="text-center py-2">
              <p className="text-[24px] font-semibold text-[#ff3b30]">{noRequestCount}</p>
              <p className="text-[12px] text-[#86868b]">ไม่มีคำขอ</p>
            </div>
          </Card>
          <Card elevated>
            <div className="text-center py-2">
              <p className="text-[24px] font-semibold text-[#0071e3]">{totalLateMinutes}</p>
              <p className="text-[12px] text-[#86868b]">นาทีรวม</p>
            </div>
          </Card>
        </div>
      )}

      {/* Requests Table */}
      {activeTab === "requests" && (
        <Card elevated padding="none">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-20 text-[#86868b]">
            ไม่มีคำขอ{statusFilter === "pending" ? "ที่รออนุมัติ" : ""}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e8e8ed] bg-[#f5f5f7]">
                  <th className="text-left px-6 py-4 text-[12px] font-semibold text-[#86868b] uppercase">
                    พนักงาน
                  </th>
                  <th className="text-left px-4 py-4 text-[12px] font-semibold text-[#86868b] uppercase">
                    วันที่
                  </th>
                  <th className="text-left px-4 py-4 text-[12px] font-semibold text-[#86868b] uppercase">
                    สาย
                  </th>
                  <th className="text-left px-4 py-4 text-[12px] font-semibold text-[#86868b] uppercase">
                    เหตุผล
                  </th>
                  <th className="text-left px-4 py-4 text-[12px] font-semibold text-[#86868b] uppercase">
                    สถานะ
                  </th>
                  <th className="text-right px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e8ed]">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-[#f5f5f7] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={req.employees.name} size="sm" />
                        <div>
                          <p className="text-[14px] font-medium text-[#1d1d1f]">
                            {req.employees.name}
                          </p>
                          <p className="text-[12px] text-[#86868b]">
                            {req.employees.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-[14px] text-[#1d1d1f]">
                        {format(new Date(req.request_date), "d MMM yyyy", { locale: th })}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      {req.actual_late_minutes ? (
                        <span className="text-[14px] font-medium text-[#ff9500]">
                          {req.actual_late_minutes} นาที
                        </span>
                      ) : (
                        <span className="text-[14px] text-[#86868b]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-[14px] text-[#1d1d1f] max-w-[200px] truncate">
                        {req.reason}
                      </p>
                    </td>
                    <td className="px-4 py-4">{getStatusBadge(req.status)}</td>
                    <td className="px-6 py-4 text-right">
                      {req.status === "pending" && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              setActionModal({ open: true, request: req, action: "approve" })
                            }
                            className="p-2 text-[#34c759] hover:bg-[#34c759]/10 rounded-lg transition-colors"
                            title="อนุมัติ"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() =>
                              setActionModal({ open: true, request: req, action: "reject" })
                            }
                            className="p-2 text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-lg transition-colors"
                            title="ไม่อนุมัติ"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      )}

      {/* History Table */}
      {activeTab === "history" && (
        <Card elevated padding="none">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : lateHistory.length === 0 ? (
            <div className="text-center py-20 text-[#86868b]">
              ไม่มีประวัติการมาสายในเดือนนี้
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e8e8ed] bg-[#f5f5f7]">
                    <th className="text-left px-6 py-4 text-[12px] font-semibold text-[#86868b] uppercase">
                      พนักงาน
                    </th>
                    <th className="text-left px-4 py-4 text-[12px] font-semibold text-[#86868b] uppercase">
                      วันที่
                    </th>
                    <th className="text-left px-4 py-4 text-[12px] font-semibold text-[#86868b] uppercase">
                      เวลาเข้างาน
                    </th>
                    <th className="text-left px-4 py-4 text-[12px] font-semibold text-[#86868b] uppercase">
                      สาย (นาที)
                    </th>
                    <th className="text-left px-4 py-4 text-[12px] font-semibold text-[#86868b] uppercase">
                      คำขอ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8ed]">
                  {lateHistory
                    .filter(
                      (h) =>
                        h.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        h.employee.email.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((h) => (
                      <tr key={h.id} className="hover:bg-[#f5f5f7] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={h.employee.name} size="sm" />
                            <div>
                              <p className="text-[14px] font-medium text-[#1d1d1f]">
                                {h.employee.name}
                              </p>
                              <p className="text-[12px] text-[#86868b]">{h.employee.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-[14px] text-[#1d1d1f]">
                            {format(new Date(h.work_date), "d MMM yyyy", { locale: th })}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-[14px] text-[#6e6e73]">
                            {format(new Date(h.clock_in_time), "HH:mm")} น.
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-[14px] font-medium text-[#ff9500]">
                            {h.late_minutes} นาที
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {h.has_approved_request ? (
                            <Badge variant="success">มีคำขอ</Badge>
                          ) : (
                            <Badge variant="danger">ไม่มีคำขอ</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Action Modal */}
      <Modal
        isOpen={actionModal.open}
        onClose={() => {
          setActionModal({ open: false, request: null, action: "approve" });
          setAdminNote("");
        }}
        title={actionModal.action === "approve" ? "อนุมัติคำขอมาสาย" : "ปฏิเสธคำขอมาสาย"}
        size="sm"
      >
        {actionModal.request && (
          <div className="space-y-4">
            <div className="p-4 bg-[#f5f5f7] rounded-xl">
              <p className="text-[15px] font-medium text-[#1d1d1f]">
                {actionModal.request.employees.name}
              </p>
              <p className="text-[13px] text-[#86868b]">
                วันที่: {format(new Date(actionModal.request.request_date), "d MMMM yyyy", { locale: th })}
              </p>
              {actionModal.request.actual_late_minutes && (
                <p className="text-[13px] text-[#ff9500]">
                  สาย {actionModal.request.actual_late_minutes} นาที
                </p>
              )}
              <p className="text-[13px] text-[#1d1d1f] mt-2">
                เหตุผล: {actionModal.request.reason}
              </p>
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                หมายเหตุ (ถ้ามี)
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="เพิ่มหมายเหตุ..."
                rows={2}
                className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setActionModal({ open: false, request: null, action: "approve" });
                  setAdminNote("");
                }}
                className="flex-1"
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleAction}
                loading={processing}
                className={`flex-1 ${
                  actionModal.action === "reject" ? "!bg-[#ff3b30]" : ""
                }`}
              >
                {actionModal.action === "approve" ? "อนุมัติ" : "ปฏิเสธ"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
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

