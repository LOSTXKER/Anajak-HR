"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { 
  Calendar, 
  FileText, 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  Plus,
  User,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { th } from "date-fns/locale";

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  reason: string;
  status: string;
  attachment_url: string | null;
  created_at: string;
  employee: {
    name: string;
    email: string;
  };
}

const leaveTypeLabels: Record<string, { label: string; color: string }> = {
  sick: { label: "ลาป่วย", color: "text-[#ff3b30] bg-[#ff3b30]/10" },
  personal: { label: "ลากิจ", color: "text-[#ff9500] bg-[#ff9500]/10" },
  annual: { label: "ลาพักร้อน", color: "text-[#34c759] bg-[#34c759]/10" },
  maternity: { label: "ลาคลอด", color: "text-[#af52de] bg-[#af52de]/10" },
  military: { label: "ลากรณีทหาร", color: "text-[#0071e3] bg-[#0071e3]/10" },
  other: { label: "อื่นๆ", color: "text-[#86868b] bg-[#86868b]/10" },
};

function LeaveManagementContent() {
  const { employee } = useAuth();
  const toast = useToast();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [processing, setProcessing] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    id: string;
    action: "approve" | "reject" | "cancel";
    name: string;
  }>({ open: false, id: "", action: "approve", name: "" });

  // Add Leave Modal
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    employeeId: "",
    leaveType: "annual",
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    isHalfDay: false,
    reason: "",
    status: "approved",
  });

  useEffect(() => {
    fetchLeaveRequests();
    fetchEmployees();
  }, [filter, currentMonth]);

  const fetchEmployees = async () => {
    try {
      const { data } = await supabase
        .from("employees")
        .select("id, name, email")
        .eq("account_status", "approved")
        .order("name");
      setEmployees(data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchLeaveRequests = async () => {
    setLoading(true);
    try {
      const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      let query = supabase
        .from("leave_requests")
        .select(`*, employee:employees!employee_id(name, email)`)
        .or(`start_date.gte.${startDate},end_date.lte.${endDate}`)
        .gte("start_date", startDate)
        .lte("start_date", endDate)
        .order("created_at", { ascending: false });

      if (filter !== "all") query = query.eq("status", filter);

      const { data, error } = await query;

      if (error) throw error;

      setLeaveRequests(data || []);
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!employee) return;

    setProcessing(true);
    try {
      const leave = leaveRequests.find((l) => l.id === confirmDialog.id);
      let newStatus = "";
      
      if (confirmDialog.action === "approve") {
        newStatus = "approved";
      } else if (confirmDialog.action === "reject") {
        newStatus = "rejected";
      } else {
        newStatus = "cancelled";
      }

      const { error } = await supabase
        .from("leave_requests")
        .update({
          status: newStatus,
          approved_by: confirmDialog.action !== "cancel" ? employee.id : undefined,
        })
        .eq("id", confirmDialog.id);

      if (error) throw error;

      // Send LINE notification for approve/reject
      if (confirmDialog.action !== "cancel") {
        try {
          await fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "leave_approval",
              data: {
                employeeName: leave?.employee?.name || confirmDialog.name,
                leaveType: leave?.leave_type,
                startDate: leave?.start_date,
                endDate: leave?.end_date,
                approved: confirmDialog.action === "approve",
              },
            }),
          });
        } catch (notifyError) {
          console.error("Notification error:", notifyError);
        }
      }

      const messages: Record<string, string> = {
        approve: "อนุมัติคำขอลาแล้ว",
        reject: "ปฏิเสธคำขอลาแล้ว",
        cancel: "ยกเลิกคำขอลาแล้ว",
      };

      toast.success("สำเร็จ", messages[confirmDialog.action]);
      setConfirmDialog({ open: false, id: "", action: "approve", name: "" });
      fetchLeaveRequests();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถดำเนินการได้");
    } finally {
      setProcessing(false);
    }
  };

  const handleAddLeave = async () => {
    if (!addForm.employeeId || !addForm.reason) {
      toast.error("กรุณากรอกข้อมูล", "เลือกพนักงานและเหตุผล");
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("leave_requests")
        .insert({
          employee_id: addForm.employeeId,
          leave_type: addForm.leaveType,
          start_date: addForm.startDate,
          end_date: addForm.endDate,
          is_half_day: addForm.isHalfDay,
          reason: addForm.reason,
          status: addForm.status,
          approved_by: addForm.status === "approved" ? employee?.id : null,
        });

      if (error) throw error;

      toast.success("สำเร็จ", "เพิ่มวันลาเรียบร้อยแล้ว");
      setAddModal(false);
      setAddForm({
        employeeId: "",
        leaveType: "annual",
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: format(new Date(), "yyyy-MM-dd"),
        isHalfDay: false,
        reason: "",
        status: "approved",
      });
      fetchLeaveRequests();
    } catch (error: any) {
      console.error("Error adding leave:", error);
      toast.error("เกิดข้อผิดพลาด", error?.message || "ไม่สามารถเพิ่มวันลาได้");
    } finally {
      setProcessing(false);
    }
  };

  const exportCSV = () => {
    if (!leaveRequests.length) return;
    const headers = ["ชื่อ", "ประเภท", "วันที่เริ่ม", "วันที่สิ้นสุด", "จำนวนวัน", "เหตุผล", "สถานะ"];
    const rows = leaveRequests.map((l) => [
      l.employee?.name || "-",
      leaveTypeLabels[l.leave_type]?.label || l.leave_type,
      format(new Date(l.start_date), "dd/MM/yyyy"),
      format(new Date(l.end_date), "dd/MM/yyyy"),
      calculateDays(l.start_date, l.end_date, l.is_half_day),
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

  // Filter by search
  const filteredRequests = leaveRequests.filter((leave) => {
    if (!searchTerm) return true;
    return leave.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const stats = {
    total: leaveRequests.length,
    pending: leaveRequests.filter((r) => r.status === "pending").length,
    approved: leaveRequests.filter((r) => r.status === "approved").length,
    rejected: leaveRequests.filter((r) => r.status === "rejected").length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="warning">รออนุมัติ</Badge>;
      case "approved":
        return <Badge variant="success">อนุมัติแล้ว</Badge>;
      case "rejected":
        return <Badge variant="danger">ปฏิเสธ</Badge>;
      case "cancelled":
        return <Badge variant="default">ยกเลิก</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const calculateDays = (startDate: string, endDate: string, isHalfDay: boolean) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return isHalfDay ? 0.5 : diffDays;
  };

  return (
    <AdminLayout title="จัดการคำขอลา">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
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
        <Button variant="secondary" size="sm" onClick={exportCSV}>
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "ทั้งหมด", value: stats.total, color: "text-[#1d1d1f]" },
          { label: "รออนุมัติ", value: stats.pending, color: "text-[#ff9500]" },
          { label: "อนุมัติ", value: stats.approved, color: "text-[#34c759]" },
          { label: "ปฏิเสธ", value: stats.rejected, color: "text-[#ff3b30]" },
        ].map((stat, i) => (
          <Card key={i} elevated>
            <div className="text-center py-2">
              <p className={`text-[24px] font-semibold ${stat.color}`}>{stat.value}</p>
              <p className="text-[12px] text-[#86868b]">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Search & Add */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
          <input
            type="text"
            placeholder="ค้นหาชื่อพนักงาน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#d2d2d7] focus:border-[#0071e3] outline-none text-[15px]"
          />
        </div>
        <Button onClick={() => setAddModal(true)}>
          <Plus className="w-4 h-4" />
          เพิ่มวันลา
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { key: "all", label: "ทั้งหมด", count: stats.total },
          { key: "pending", label: "รออนุมัติ", count: stats.pending },
          { key: "approved", label: "อนุมัติแล้ว", count: stats.approved },
          { key: "rejected", label: "ปฏิเสธ", count: stats.rejected },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full text-[14px] font-medium whitespace-nowrap
              transition-colors
              ${
                filter === tab.key
                  ? "bg-[#0071e3] text-white"
                  : "bg-[#f5f5f7] text-[#6e6e73] hover:bg-[#e8e8ed]"
              }
            `}
          >
            {tab.label}
            <span className={`px-2 py-0.5 rounded-full text-[12px] ${filter === tab.key ? "bg-white/20" : "bg-[#d2d2d7]"}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Leave Requests List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card elevated>
            <div className="text-center py-20 text-[#86868b]">ไม่มีคำขอลาในเดือนนี้</div>
          </Card>
        ) : (
          filteredRequests.map((leave) => {
            const leaveTypeInfo = leaveTypeLabels[leave.leave_type] || leaveTypeLabels.other;
            const days = calculateDays(leave.start_date, leave.end_date, leave.is_half_day);

            return (
              <Card key={leave.id} elevated>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <Avatar name={leave.employee?.name || "?"} size="lg" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className="text-[17px] font-semibold text-[#1d1d1f]">{leave.employee?.name}</h3>
                        {getStatusBadge(leave.status)}
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[13px] font-medium ${leaveTypeInfo.color}`}>
                          <FileText className="w-3.5 h-3.5" />
                          {leaveTypeInfo.label}
                        </span>
                        <span className="text-[14px] text-[#86868b]">{days} วัน</span>
                      </div>

                      <div className="flex items-center gap-2 text-[14px] text-[#6e6e73] mb-2">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(leave.start_date), "d MMM", { locale: th })} -{" "}
                        {format(new Date(leave.end_date), "d MMM yyyy", { locale: th })}
                        {leave.is_half_day && " (ครึ่งวัน)"}
                      </div>

                      <div className="bg-[#f5f5f7] rounded-xl p-3 mb-3">
                        <p className="text-[13px] text-[#6e6e73]">
                          <span className="font-medium text-[#1d1d1f]">เหตุผล:</span> {leave.reason}
                        </p>
                      </div>

                      {leave.attachment_url && (
                        <a
                          href={leave.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-[14px] text-[#0071e3] hover:underline"
                        >
                          <ExternalLink className="w-4 h-4" />
                          ดูเอกสารแนบ
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 md:flex-col">
                    {leave.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => setConfirmDialog({ open: true, id: leave.id, action: "approve", name: leave.employee?.name || "" })}
                        >
                          <CheckCircle className="w-4 h-4" />
                          อนุมัติ
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setConfirmDialog({ open: true, id: leave.id, action: "reject", name: leave.employee?.name || "" })}
                        >
                          <XCircle className="w-4 h-4" />
                          ปฏิเสธ
                        </Button>
                      </>
                    )}
                    {(leave.status === "approved" || leave.status === "pending") && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setConfirmDialog({ open: true, id: leave.id, action: "cancel", name: leave.employee?.name || "" })}
                      >
                        <Trash2 className="w-4 h-4" />
                        ยกเลิก
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Leave Modal */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="เพิ่มวันลาให้พนักงาน" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
              <User className="w-4 h-4 inline mr-1" />
              พนักงาน *
            </label>
            <select
              value={addForm.employeeId}
              onChange={(e) => setAddForm({ ...addForm, employeeId: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-[#d2d2d7] focus:border-[#0071e3] outline-none text-[15px]"
            >
              <option value="">เลือกพนักงาน</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">ประเภทการลา</label>
            <select
              value={addForm.leaveType}
              onChange={(e) => setAddForm({ ...addForm, leaveType: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-[#d2d2d7] focus:border-[#0071e3] outline-none text-[15px]"
            >
              {Object.entries(leaveTypeLabels).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DateInput
              label="วันที่เริ่ม"
              value={addForm.startDate}
              onChange={(val) => setAddForm({ ...addForm, startDate: val })}
            />
            <DateInput
              label="วันที่สิ้นสุด"
              value={addForm.endDate}
              onChange={(val) => setAddForm({ ...addForm, endDate: val })}
              min={addForm.startDate}
            />
          </div>

          <label className="flex items-center gap-3 p-3 bg-[#f5f5f7] rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={addForm.isHalfDay}
              onChange={(e) => setAddForm({ ...addForm, isHalfDay: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <span className="text-[15px] text-[#1d1d1f]">ลาครึ่งวัน</span>
          </label>

          <div>
            <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">สถานะ</label>
            <select
              value={addForm.status}
              onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-[#d2d2d7] focus:border-[#0071e3] outline-none text-[15px]"
            >
              <option value="approved">อนุมัติทันที</option>
              <option value="pending">รออนุมัติ</option>
            </select>
          </div>

          <div>
            <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เหตุผล *</label>
            <Input
              value={addForm.reason}
              onChange={(e) => setAddForm({ ...addForm, reason: e.target.value })}
              placeholder="เช่น ลากิจธุระส่วนตัว"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={() => setAddModal(false)} className="flex-1">
              ยกเลิก
            </Button>
            <Button onClick={handleAddLeave} loading={processing} className="flex-1">
              <Plus className="w-4 h-4" />
              เพิ่มวันลา
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, id: "", action: "approve", name: "" })}
        onConfirm={handleConfirm}
        title={
          confirmDialog.action === "approve" ? "ยืนยันการอนุมัติ" :
          confirmDialog.action === "reject" ? "ยืนยันการปฏิเสธ" :
          "ยืนยันการยกเลิก"
        }
        message={`คุณต้องการ${
          confirmDialog.action === "approve" ? "อนุมัติ" :
          confirmDialog.action === "reject" ? "ปฏิเสธ" :
          "ยกเลิก"
        }คำขอลาของ "${confirmDialog.name}" ใช่หรือไม่?`}
        type={confirmDialog.action === "approve" ? "success" : "danger"}
        confirmText={
          confirmDialog.action === "approve" ? "อนุมัติ" :
          confirmDialog.action === "reject" ? "ปฏิเสธ" :
          "ยกเลิก"
        }
        loading={processing}
      />
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
