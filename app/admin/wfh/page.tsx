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
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { 
  Calendar, 
  Home, 
  CheckCircle, 
  XCircle, 
  Plus, 
  User, 
  Search,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface WFHRequest {
  id: string;
  date: string;
  is_half_day: boolean;
  reason: string;
  status: string;
  created_at: string;
  employee: {
    name: string;
    email: string;
  };
}

function WFHManagementContent() {
  const { employee } = useAuth();
  const toast = useToast();
  const [wfhRequests, setWfhRequests] = useState<WFHRequest[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [processing, setProcessing] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    id: string;
    action: "approve" | "reject" | "cancel";
    name: string;
  }>({ open: false, id: "", action: "approve", name: "" });

  // Add WFH Modal
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    employeeId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    isHalfDay: false,
    reason: "",
    status: "approved",
  });

  useEffect(() => {
    fetchWFHRequests();
    fetchEmployees();
  }, [filter]);

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

  const fetchWFHRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("wfh_requests")
        .select(`*, employee:employees!employee_id(name, email)`)
        .order("created_at", { ascending: false });

      if (filter !== "all") query = query.eq("status", filter);

      const { data, error } = await query;

      if (error) throw error;

      setWfhRequests(data || []);
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
      const wfh = wfhRequests.find((w) => w.id === confirmDialog.id);
      let newStatus = "";
      
      if (confirmDialog.action === "approve") {
        newStatus = "approved";
      } else if (confirmDialog.action === "reject") {
        newStatus = "rejected";
      } else {
        newStatus = "cancelled";
      }

      const { error } = await supabase
        .from("wfh_requests")
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
              type: "wfh_approval",
              data: {
                employeeName: wfh?.employee?.name || confirmDialog.name,
                date: wfh?.date,
                approved: confirmDialog.action === "approve",
              },
            }),
          });
        } catch (notifyError) {
          console.error("Notification error:", notifyError);
        }
      }

      const messages: Record<string, string> = {
        approve: "อนุมัติคำขอ WFH แล้ว",
        reject: "ปฏิเสธคำขอ WFH แล้ว",
        cancel: "ยกเลิกคำขอ WFH แล้ว",
      };

      toast.success("สำเร็จ", messages[confirmDialog.action]);
      setConfirmDialog({ open: false, id: "", action: "approve", name: "" });
      fetchWFHRequests();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถดำเนินการได้");
    } finally {
      setProcessing(false);
    }
  };

  const handleAddWFH = async () => {
    if (!addForm.employeeId || !addForm.reason) {
      toast.error("กรุณากรอกข้อมูล", "เลือกพนักงานและเหตุผล");
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("wfh_requests")
        .insert({
          employee_id: addForm.employeeId,
          date: addForm.date,
          is_half_day: addForm.isHalfDay,
          reason: addForm.reason,
          status: addForm.status,
          approved_by: addForm.status === "approved" ? employee?.id : null,
        });

      if (error) throw error;

      toast.success("สำเร็จ", "เพิ่ม WFH เรียบร้อยแล้ว");
      setAddModal(false);
      setAddForm({
        employeeId: "",
        date: format(new Date(), "yyyy-MM-dd"),
        isHalfDay: false,
        reason: "",
        status: "approved",
      });
      fetchWFHRequests();
    } catch (error: any) {
      console.error("Error adding WFH:", error);
      toast.error("เกิดข้อผิดพลาด", error?.message || "ไม่สามารถเพิ่ม WFH ได้");
    } finally {
      setProcessing(false);
    }
  };

  // Filter by search
  const filteredRequests = wfhRequests.filter((wfh) => {
    if (!searchTerm) return true;
    return wfh.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const stats = {
    total: wfhRequests.length,
    pending: wfhRequests.filter((r) => r.status === "pending").length,
    approved: wfhRequests.filter((r) => r.status === "approved").length,
    rejected: wfhRequests.filter((r) => r.status === "rejected").length,
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

  return (
    <AdminLayout title="จัดการคำขอ WFH">
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
          เพิ่ม WFH
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

      {/* WFH Requests List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card elevated>
            <div className="text-center py-20 text-[#86868b]">ไม่มีคำขอ WFH</div>
          </Card>
        ) : (
          filteredRequests.map((wfh) => (
            <Card key={wfh.id} elevated>
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <Avatar name={wfh.employee?.name || "?"} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 className="text-[17px] font-semibold text-[#1d1d1f]">{wfh.employee?.name}</h3>
                      {getStatusBadge(wfh.status)}
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[13px] font-medium text-[#0071e3] bg-[#0071e3]/10">
                        <Home className="w-3.5 h-3.5" />
                        Work From Home
                      </span>
                      {wfh.is_half_day && (
                        <span className="text-[13px] text-[#86868b]">(ครึ่งวัน)</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[14px] text-[#6e6e73] mb-2">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(wfh.date), "EEEE d MMMM yyyy", { locale: th })}
                    </div>

                    <div className="bg-[#f5f5f7] rounded-xl p-3">
                      <p className="text-[13px] text-[#6e6e73]">
                        <span className="font-medium text-[#1d1d1f]">เหตุผล:</span> {wfh.reason}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 md:flex-col">
                  {wfh.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => setConfirmDialog({ open: true, id: wfh.id, action: "approve", name: wfh.employee?.name || "" })}
                      >
                        <CheckCircle className="w-4 h-4" />
                        อนุมัติ
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setConfirmDialog({ open: true, id: wfh.id, action: "reject", name: wfh.employee?.name || "" })}
                      >
                        <XCircle className="w-4 h-4" />
                        ปฏิเสธ
                      </Button>
                    </>
                  )}
                  {(wfh.status === "approved" || wfh.status === "pending") && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setConfirmDialog({ open: true, id: wfh.id, action: "cancel", name: wfh.employee?.name || "" })}
                    >
                      <Trash2 className="w-4 h-4" />
                      ยกเลิก
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add WFH Modal */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="เพิ่ม WFH ให้พนักงาน" size="md">
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
            <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              วันที่ *
            </label>
            <input
              type="date"
              value={addForm.date}
              onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-[#d2d2d7] focus:border-[#0071e3] outline-none text-[15px]"
            />
          </div>

          <label className="flex items-center gap-3 p-3 bg-[#f5f5f7] rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={addForm.isHalfDay}
              onChange={(e) => setAddForm({ ...addForm, isHalfDay: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <span className="text-[15px] text-[#1d1d1f]">ครึ่งวัน</span>
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
              placeholder="เช่น รอช่างมาซ่อมเครื่องใช้ไฟฟ้า"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={() => setAddModal(false)} className="flex-1">
              ยกเลิก
            </Button>
            <Button onClick={handleAddWFH} loading={processing} className="flex-1">
              <Plus className="w-4 h-4" />
              เพิ่ม WFH
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
        }คำขอ WFH ของ "${confirmDialog.name}" ใช่หรือไม่?`}
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

export default function WFHManagementPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <WFHManagementContent />
    </ProtectedRoute>
  );
}
