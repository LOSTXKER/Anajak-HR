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
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { useToast } from "@/components/ui/Toast";
import {
  Calendar,
  FileText,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, differenceInDays } from "date-fns";
import { th } from "date-fns/locale";

// Types
interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  reason: string;
  attachment_url: string | null;
  status: string;
  created_at: string;
  employee: { id: string; name: string; email: string } | null;
}

// Leave type config - Apple Theme Colors
const leaveTypes: Record<string, { label: string; color: string; bg: string }> = {
  sick: { label: "ลาป่วย", color: "text-[#ff3b30]", bg: "bg-[#ff3b30]/10" },
  personal: { label: "ลากิจ", color: "text-[#ff9500]", bg: "bg-[#ff9500]/10" },
  annual: { label: "ลาพักร้อน", color: "text-[#34c759]", bg: "bg-[#34c759]/10" },
  maternity: { label: "ลาคลอด", color: "text-[#af52de]", bg: "bg-[#af52de]/10" },
  military: { label: "ลากรณีทหาร", color: "text-[#0071e3]", bg: "bg-[#0071e3]/10" },
  other: { label: "อื่นๆ", color: "text-[#86868b]", bg: "bg-[#f5f5f7]" },
};

type FilterStatus = "all" | "pending" | "approved" | "rejected";

function LeaveManagementContent() {
  const { employee: currentAdmin } = useAuth();
  const toast = useToast();

  // State
  const [loading, setLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string; email: string }[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [addModal, setAddModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; leave: LeaveRequest | null }>({ open: false, leave: null });
  const [processing, setProcessing] = useState(false);

  // Add form
  const [addForm, setAddForm] = useState({
    employeeId: "",
    leaveType: "annual",
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    isHalfDay: false,
    reason: "",
    status: "approved",
  });

  // Fetch data
  const fetchLeave = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      let query = supabase
        .from("leave_requests")
        .select("*, employee:employees!employee_id(id, name, email)")
        .gte("start_date", startDate)
        .lte("start_date", endDate)
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") query = query.eq("status", filterStatus);

      const { data, error } = await query;
      if (error) throw error;
      setLeaveRequests(data || []);
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, filterStatus, toast]);

  const fetchEmployees = useCallback(async () => {
    const { data } = await supabase.from("employees").select("id, name, email").eq("account_status", "approved").order("name");
    setEmployees(data || []);
  }, []);

  useEffect(() => { fetchLeave(); fetchEmployees(); }, [fetchLeave, fetchEmployees]);

  // Calculate days helper
  const calculateDays = useCallback((leave: LeaveRequest) => {
    if (leave.is_half_day) return 0.5;
    return differenceInDays(new Date(leave.end_date), new Date(leave.start_date)) + 1;
  }, []);

  // Stats
  const stats = useMemo(() => {
    const all = leaveRequests.length;
    const pending = leaveRequests.filter((l) => l.status === "pending").length;
    const approved = leaveRequests.filter((l) => l.status === "approved").length;
    const rejected = leaveRequests.filter((l) => l.status === "rejected").length;
    const totalDays = leaveRequests
      .filter((l) => l.status === "approved")
      .reduce((sum, l) => sum + calculateDays(l), 0);
    return { all, pending, approved, rejected, totalDays };
  }, [leaveRequests, calculateDays]);

  // Filtered
  const filteredLeave = useMemo(() => {
    return leaveRequests.filter((l) => {
      if (!searchTerm) return true;
      return l.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [leaveRequests, searchTerm]);

  // Cancel leave
  const handleCancel = async () => {
    if (!confirmModal.leave) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("leave_requests")
        .update({ status: "cancelled" })
        .eq("id", confirmModal.leave.id);
      if (error) throw error;

      toast.success("สำเร็จ", "ยกเลิกคำขอลาแล้ว");
      setConfirmModal({ open: false, leave: null });
      fetchLeave();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message);
    } finally {
      setProcessing(false);
    }
  };

  // Add leave
  const handleAddLeave = async () => {
    if (!addForm.employeeId || !addForm.reason) {
      toast.error("กรุณากรอกข้อมูล", "เลือกพนักงานและเหตุผล");
      return;
    }
    setProcessing(true);
    try {
      const { error } = await supabase.from("leave_requests").insert({
        employee_id: addForm.employeeId,
        leave_type: addForm.leaveType,
        start_date: addForm.startDate,
        end_date: addForm.endDate,
        is_half_day: addForm.isHalfDay,
        reason: addForm.reason,
        status: addForm.status,
        approved_by: addForm.status === "approved" ? currentAdmin?.id : null,
      });
      if (error) throw error;

      toast.success("สำเร็จ", "เพิ่มวันลาเรียบร้อย");
      setAddModal(false);
      setAddForm({
        employeeId: "", leaveType: "annual",
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: format(new Date(), "yyyy-MM-dd"),
        isHalfDay: false, reason: "", status: "approved",
      });
      fetchLeave();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message);
    } finally {
      setProcessing(false);
    }
  };

  // Export CSV
  const exportCSV = () => {
    if (!leaveRequests.length) return;
    const headers = ["ชื่อ", "ประเภท", "วันที่เริ่ม", "วันที่สิ้นสุด", "จำนวนวัน", "เหตุผล", "สถานะ"];
    const rows = leaveRequests.map((l) => [
      l.employee?.name || "-",
      leaveTypes[l.leave_type]?.label || l.leave_type,
      format(new Date(l.start_date), "dd/MM/yyyy"),
      format(new Date(l.end_date), "dd/MM/yyyy"),
      calculateDays(l),
      l.reason,
      l.status,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `leave-${format(currentMonth, "yyyy-MM")}.csv`;
    link.click();
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="warning">รออนุมัติ</Badge>;
      case "approved": return <Badge variant="success">อนุมัติแล้ว</Badge>;
      case "rejected": return <Badge variant="danger">ปฏิเสธ</Badge>;
      case "cancelled": return <Badge variant="default">ยกเลิก</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <AdminLayout title="จัดการคำขอลา">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
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
        <div className="flex gap-2">
          <Button onClick={() => setAddModal(true)}>
            <Plus className="w-4 h-4" />
            เพิ่มวันลา
          </Button>
          <Button variant="secondary" onClick={exportCSV} disabled={!leaveRequests.length}>
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: "ทั้งหมด", value: stats.all, color: "text-[#1d1d1f]", bg: "bg-[#f5f5f7]" },
          { label: "รออนุมัติ", value: stats.pending, color: "text-[#ff9500]", bg: "bg-[#ff9500]/10" },
          { label: "อนุมัติ", value: stats.approved, color: "text-[#34c759]", bg: "bg-[#34c759]/10" },
          { label: "ปฏิเสธ", value: stats.rejected, color: "text-[#ff3b30]", bg: "bg-[#ff3b30]/10" },
          { label: "รวมวันลา", value: stats.totalDays, color: "text-[#0071e3]", bg: "bg-[#0071e3]/10" },
        ].map((s, i) => (
          <Card key={i} elevated className="!p-3">
            <div className="text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-[#86868b]">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
          <input
            type="text"
            placeholder="ค้นหาชื่อพนักงาน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#d2d2d7] focus:border-[#0071e3] outline-none text-sm"
          />
        </div>
        <Button variant="text" onClick={fetchLeave} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-1 px-1">
        {([
          { key: "all", label: "ทั้งหมด", count: stats.all },
          { key: "pending", label: "รออนุมัติ", count: stats.pending },
          { key: "approved", label: "อนุมัติแล้ว", count: stats.approved },
          { key: "rejected", label: "ปฏิเสธ", count: stats.rejected },
        ] as { key: FilterStatus; label: string; count: number }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filterStatus === tab.key ? "bg-[#1d1d1f] text-white" : "bg-white text-[#6e6e73] border border-[#e8e8ed] hover:border-[#d2d2d7]"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${filterStatus === tab.key ? "bg-white/20" : "bg-[#f5f5f7]"}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Leave List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredLeave.length === 0 ? (
        <Card elevated className="text-center py-16 text-[#86868b]">ไม่มีคำขอลาในเดือนนี้</Card>
      ) : (
        <div className="space-y-3">
          {filteredLeave.map((leave) => {
            const typeInfo = leaveTypes[leave.leave_type] || leaveTypes.other;
            const days = calculateDays(leave);

            return (
              <Card key={leave.id} elevated className="!p-0 overflow-hidden">
                <div className="flex items-stretch">
                  {/* Color bar */}
                  <div className={`w-1.5 ${typeInfo.bg}`} />

                  {/* Content */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start gap-3">
                      <Avatar name={leave.employee?.name || "?"} size="md" />
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[15px] font-semibold text-[#1d1d1f]">{leave.employee?.name}</span>
                          {getStatusBadge(leave.status)}
                        </div>

                        {/* Leave type & days */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${typeInfo.bg} ${typeInfo.color}`}>
                            <FileText className="w-3 h-3" />
                            {typeInfo.label}
                          </span>
                          <span className="text-sm text-[#86868b]">{days} วัน</span>
                        </div>

                        {/* Date */}
                        <p className="text-sm text-[#6e6e73] mb-1">
                          <Calendar className="w-3.5 h-3.5 inline mr-1" />
                          {format(new Date(leave.start_date), "d MMM", { locale: th })}
                          {leave.start_date !== leave.end_date && ` - ${format(new Date(leave.end_date), "d MMM yyyy", { locale: th })}`}
                          {leave.start_date === leave.end_date && ` ${format(new Date(leave.start_date), "yyyy", { locale: th })}`}
                          {leave.is_half_day && " (ครึ่งวัน)"}
                        </p>

                        {/* Reason */}
                        <p className="text-xs text-[#6e6e73] bg-[#f5f5f7] rounded-lg px-2.5 py-1.5 mt-2 line-clamp-2">
                          {leave.reason}
                        </p>

                        {/* Attachment */}
                        {leave.attachment_url && (
                          <a
                            href={leave.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-xs text-[#0071e3] hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            ดูเอกสารแนบ
                          </a>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1.5 ml-2">
                        {leave.status === "pending" && (
                          <a href="/admin/approvals" className="p-2 text-[#ff9500] bg-[#ff9500]/10 rounded-lg hover:bg-[#ff9500]/20">
                            <Calendar className="w-4 h-4" />
                          </a>
                        )}
                        {(leave.status === "approved" || leave.status === "pending") && (
                          <button
                            onClick={() => setConfirmModal({ open: true, leave })}
                            className="p-2 text-[#ff3b30] bg-[#ff3b30]/10 rounded-lg hover:bg-[#ff3b30]/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, leave: null })}
        onConfirm={handleCancel}
        title="ยกเลิกคำขอลา"
        message={`ยกเลิกคำขอลาของ "${confirmModal.leave?.employee?.name}" ?`}
        type="danger"
        confirmText="ยกเลิก"
        loading={processing}
      />

      {/* Add Modal */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="เพิ่มวันลา" size="md">
        <div className="space-y-4">
          <Select
            label="พนักงาน *"
            value={addForm.employeeId}
            onChange={(v) => setAddForm({ ...addForm, employeeId: v })}
            options={[{ value: "", label: "เลือกพนักงาน" }, ...employees.map((e) => ({ value: e.id, label: e.name }))]}
          />
          <Select
            label="ประเภทการลา"
            value={addForm.leaveType}
            onChange={(v) => setAddForm({ ...addForm, leaveType: v })}
            options={Object.entries(leaveTypes).map(([key, { label }]) => ({ value: key, label }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <DateInput label="วันที่เริ่ม" value={addForm.startDate} onChange={(v) => setAddForm({ ...addForm, startDate: v })} />
            <DateInput label="วันที่สิ้นสุด" value={addForm.endDate} onChange={(v) => setAddForm({ ...addForm, endDate: v })} min={addForm.startDate} />
          </div>
          <label className="flex items-center gap-3 p-3 bg-[#f5f5f7] rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={addForm.isHalfDay}
              onChange={(e) => setAddForm({ ...addForm, isHalfDay: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <span className="text-sm text-[#1d1d1f]">ลาครึ่งวัน</span>
          </label>
          <Select
            label="สถานะ"
            value={addForm.status}
            onChange={(v) => setAddForm({ ...addForm, status: v })}
            options={[{ value: "approved", label: "อนุมัติทันที" }, { value: "pending", label: "รออนุมัติ" }]}
          />
          <Input
            label="เหตุผล *"
            value={addForm.reason}
            onChange={(e) => setAddForm({ ...addForm, reason: e.target.value })}
            placeholder="เช่น ลากิจธุระส่วนตัว"
          />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setAddModal(false)} className="flex-1">ยกเลิก</Button>
            <Button onClick={handleAddLeave} loading={processing} className="flex-1">เพิ่มวันลา</Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}

export default function LeaveManagementPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <LeaveManagementContent />
    </ProtectedRoute>
  );
}
