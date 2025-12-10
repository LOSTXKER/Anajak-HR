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
  Home,
  Calendar,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { th } from "date-fns/locale";

// Types
interface WFHRequest {
  id: string;
  employee_id: string;
  date: string;
  is_half_day: boolean;
  reason: string;
  status: string;
  created_at: string;
  employee: { id: string; name: string; email: string } | null;
}

type FilterStatus = "all" | "pending" | "approved" | "rejected";

function WFHManagementContent() {
  const { employee: currentAdmin } = useAuth();
  const toast = useToast();

  // State
  const [loading, setLoading] = useState(true);
  const [wfhRequests, setWfhRequests] = useState<WFHRequest[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string; email: string }[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [addModal, setAddModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; wfh: WFHRequest | null }>({ open: false, wfh: null });
  const [processing, setProcessing] = useState(false);

  // Add form
  const [addForm, setAddForm] = useState({
    employeeId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    isHalfDay: false,
    reason: "",
    status: "approved",
  });

  // Fetch data
  const fetchWFH = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      let query = supabase
        .from("wfh_requests")
        .select("*, employee:employees!employee_id(id, name, email)")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

      if (filterStatus !== "all") query = query.eq("status", filterStatus);

      const { data, error } = await query;
      if (error) throw error;
      setWfhRequests(data || []);
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, filterStatus, toast]);

  const fetchEmployees = useCallback(async () => {
    // Exclude admin from employee list
    const { data } = await supabase.from("employees").select("id, name, email").eq("account_status", "approved").neq("role", "admin").order("name");
    setEmployees(data || []);
  }, []);

  useEffect(() => { fetchWFH(); fetchEmployees(); }, [fetchWFH, fetchEmployees]);

  // Stats
  const stats = useMemo(() => {
    const all = wfhRequests.length;
    const pending = wfhRequests.filter((w) => w.status === "pending").length;
    const approved = wfhRequests.filter((w) => w.status === "approved").length;
    const rejected = wfhRequests.filter((w) => w.status === "rejected").length;
    const totalDays = wfhRequests
      .filter((w) => w.status === "approved")
      .reduce((sum, w) => sum + (w.is_half_day ? 0.5 : 1), 0);
    return { all, pending, approved, rejected, totalDays };
  }, [wfhRequests]);

  // Filtered
  const filteredWFH = useMemo(() => {
    return wfhRequests.filter((w) => {
      if (!searchTerm) return true;
      return w.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [wfhRequests, searchTerm]);

  // Cancel WFH
  const handleCancel = async () => {
    if (!confirmModal.wfh) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("wfh_requests")
        .update({ status: "cancelled" })
        .eq("id", confirmModal.wfh.id);
      if (error) throw error;

      toast.success("สำเร็จ", "ยกเลิกคำขอ WFH แล้ว");
      setConfirmModal({ open: false, wfh: null });
      fetchWFH();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message);
    } finally {
      setProcessing(false);
    }
  };

  // Add WFH
  const handleAddWFH = async () => {
    if (!addForm.employeeId || !addForm.reason) {
      toast.error("กรุณากรอกข้อมูล", "เลือกพนักงานและเหตุผล");
      return;
    }
    setProcessing(true);
    try {
      const { error } = await supabase.from("wfh_requests").insert({
        employee_id: addForm.employeeId,
        date: addForm.date,
        is_half_day: addForm.isHalfDay,
        reason: addForm.reason,
        status: addForm.status,
        approved_by: addForm.status === "approved" ? currentAdmin?.id : null,
      });
      if (error) throw error;

      toast.success("สำเร็จ", "เพิ่ม WFH เรียบร้อย");
      setAddModal(false);
      setAddForm({
        employeeId: "", date: format(new Date(), "yyyy-MM-dd"),
        isHalfDay: false, reason: "", status: "approved",
      });
      fetchWFH();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message);
    } finally {
      setProcessing(false);
    }
  };

  // Export CSV
  const exportCSV = () => {
    if (!wfhRequests.length) return;
    const headers = ["ชื่อ", "วันที่", "ครึ่งวัน", "เหตุผล", "สถานะ"];
    const rows = wfhRequests.map((w) => [
      w.employee?.name || "-",
      format(new Date(w.date), "dd/MM/yyyy"),
      w.is_half_day ? "ใช่" : "ไม่",
      w.reason,
      w.status,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `wfh-${format(currentMonth, "yyyy-MM")}.csv`;
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
    <AdminLayout title="จัดการคำขอ WFH">
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
            เพิ่ม WFH
          </Button>
          <Button variant="secondary" onClick={exportCSV} disabled={!wfhRequests.length}>
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
          { label: "รวมวัน WFH", value: stats.totalDays, color: "text-[#af52de]", bg: "bg-[#af52de]/10" },
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
        <Button variant="text" onClick={fetchWFH} disabled={loading}>
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
              filterStatus === tab.key ? "bg-[#af52de] text-white" : "bg-white text-[#6e6e73] border border-[#e8e8ed] hover:border-[#d2d2d7]"
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

      {/* WFH List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#af52de] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredWFH.length === 0 ? (
        <Card elevated className="text-center py-16 text-[#86868b]">ไม่มีคำขอ WFH ในเดือนนี้</Card>
      ) : (
        <div className="space-y-3">
          {filteredWFH.map((wfh) => (
            <Card key={wfh.id} elevated className="!p-0 overflow-hidden">
              <div className="flex items-stretch">
                {/* Color bar */}
                <div className="w-1.5 bg-[#af52de]/30" />

                {/* Content */}
                <div className="flex-1 p-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={wfh.employee?.name || "?"} size="md" />
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[15px] font-semibold text-[#1d1d1f]">{wfh.employee?.name}</span>
                        {getStatusBadge(wfh.status)}
                      </div>

                      {/* WFH badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#af52de]/10 text-[#af52de]">
                          <Home className="w-3 h-3" />
                          Work From Home
                        </span>
                        {wfh.is_half_day && <span className="text-xs text-[#86868b]">(ครึ่งวัน)</span>}
                      </div>

                      {/* Date */}
                      <p className="text-sm text-[#6e6e73] mb-1">
                        <Calendar className="w-3.5 h-3.5 inline mr-1" />
                        {format(new Date(wfh.date), "EEEE d MMMM yyyy", { locale: th })}
                      </p>

                      {/* Reason */}
                      <p className="text-xs text-[#6e6e73] bg-[#f5f5f7] rounded-lg px-2.5 py-1.5 mt-2 line-clamp-2">
                        {wfh.reason}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 ml-2">
                      {wfh.status === "pending" && (
                        <a href="/admin/approvals" className="p-2 text-[#ff9500] bg-[#ff9500]/10 rounded-lg hover:bg-[#ff9500]/20">
                          <Home className="w-4 h-4" />
                        </a>
                      )}
                      {(wfh.status === "approved" || wfh.status === "pending") && (
                        <button
                          onClick={() => setConfirmModal({ open: true, wfh })}
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
          ))}
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, wfh: null })}
        onConfirm={handleCancel}
        title="ยกเลิกคำขอ WFH"
        message={`ยกเลิกคำขอ WFH ของ "${confirmModal.wfh?.employee?.name}" ?`}
        type="danger"
        confirmText="ยกเลิก"
        loading={processing}
      />

      {/* Add Modal */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="เพิ่ม WFH" size="md">
        <div className="space-y-4">
          <Select
            label="พนักงาน *"
            value={addForm.employeeId}
            onChange={(v) => setAddForm({ ...addForm, employeeId: v })}
            options={[{ value: "", label: "เลือกพนักงาน" }, ...employees.map((e) => ({ value: e.id, label: e.name }))]}
          />
          <DateInput label="วันที่ *" value={addForm.date} onChange={(v) => setAddForm({ ...addForm, date: v })} />
          <label className="flex items-center gap-3 p-3 bg-[#f5f5f7] rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={addForm.isHalfDay}
              onChange={(e) => setAddForm({ ...addForm, isHalfDay: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <span className="text-sm text-[#1d1d1f]">ครึ่งวัน</span>
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
            placeholder="เช่น รอช่างมาซ่อมเครื่องใช้ไฟฟ้า"
          />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setAddModal(false)} className="flex-1">ยกเลิก</Button>
            <Button onClick={handleAddWFH} loading={processing} className="flex-1">เพิ่ม WFH</Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}

export default function WFHManagementPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <WFHManagementContent />
    </ProtectedRoute>
  );
}
