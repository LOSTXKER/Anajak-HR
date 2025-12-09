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
import { TimeInput } from "@/components/ui/TimeInput";
import { DateInput } from "@/components/ui/DateInput";
import { Select } from "@/components/ui/Select";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Edit2, 
  Play, 
  Calendar,
  Search,
  RotateCcw,
  Camera,
  X,
  Plus,
  User,
  MapPin,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

function OTManagementContent() {
  const { employee } = useAuth();
  const toast = useToast();
  const [otRequests, setOtRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [processing, setProcessing] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<{ url: string; type: string } | null>(null);

  // Confirm dialogs
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    id: string;
    action: "approve" | "reject" | "cancel" | "reset";
    name: string;
  }>({ open: false, id: "", action: "approve", name: "" });

  // Edit modal
  const [editModal, setEditModal] = useState<{
    open: boolean;
    ot: any;
  }>({ open: false, ot: null });
  const [editData, setEditData] = useState({
    requestDate: "",
    startTime: "",
    endTime: "",
    actualStartTime: "",
    actualEndTime: "",
    actualOtHours: "",
    otAmount: "",
    status: "",
  });

  // Add OT modal
  const [addModal, setAddModal] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [addForm, setAddForm] = useState({
    employeeId: "",
    requestDate: format(new Date(), "yyyy-MM-dd"),
    startTime: "18:00",
    endTime: "21:00",
    reason: "",
    status: "approved",
    otType: "normal",
  });

  useEffect(() => {
    fetchOT();
    fetchEmployees();
  }, [filter, dateFilter]);

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

  const fetchOT = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("ot_requests")
        .select(`*, employee:employees!employee_id(name, email), approver:employees!approved_by(name, email)`)
        .order("created_at", { ascending: false });

      if (filter !== "all") query = query.eq("status", filter);
      if (dateFilter) query = query.eq("request_date", dateFilter);

      const { data, error } = await query;
      
      if (error) throw error;
      setOtRequests(data || []);
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message || "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setProcessing(true);
    try {
      const ot = otRequests.find((o) => o.id === confirmDialog.id);
      let updateData: any = {};

      switch (confirmDialog.action) {
        case "approve":
          updateData = {
            status: "approved",
            approved_by: employee?.id,
            approved_start_time: ot?.requested_start_time,
            approved_end_time: ot?.requested_end_time,
          };
          break;
        case "reject":
          updateData = {
            status: "rejected",
            approved_by: employee?.id,
          };
          break;
        case "cancel":
          updateData = {
            status: "cancelled",
          };
          break;
        case "reset":
          updateData = {
            status: "approved",
            actual_start_time: null,
            actual_end_time: null,
            actual_ot_hours: null,
            ot_amount: null,
            before_photo_url: null,
            after_photo_url: null,
          };
          break;
      }

      const { error } = await supabase
        .from("ot_requests")
        .update(updateData)
        .eq("id", confirmDialog.id);

      if (error) throw error;

      // Send LINE notification for approve/reject
      if (confirmDialog.action === "approve" || confirmDialog.action === "reject") {
        try {
          await fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "ot_approval",
              data: {
                employeeName: ot?.employee?.name || confirmDialog.name,
                date: ot?.request_date,
                startTime: ot?.requested_start_time,
                endTime: ot?.requested_end_time,
                approved: confirmDialog.action === "approve",
              },
            }),
          });
        } catch (notifyError) {
          console.error("Notification error:", notifyError);
        }
      }

      const messages: Record<string, string> = {
        approve: "อนุมัติ OT เรียบร้อยแล้ว",
        reject: "ปฏิเสธ OT เรียบร้อยแล้ว",
        cancel: "ยกเลิก OT เรียบร้อยแล้ว",
        reset: "รีเซ็ต OT เรียบร้อยแล้ว",
      };

      toast.success("สำเร็จ", messages[confirmDialog.action]);
      setConfirmDialog({ open: false, id: "", action: "approve", name: "" });
      fetchOT();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถดำเนินการได้");
    } finally {
      setProcessing(false);
    }
  };

  const openEditModal = (ot: any) => {
    setEditData({
      requestDate: ot.request_date,
      startTime: format(new Date(ot.requested_start_time), "HH:mm"),
      endTime: format(new Date(ot.requested_end_time), "HH:mm"),
      actualStartTime: ot.actual_start_time ? format(new Date(ot.actual_start_time), "HH:mm") : "",
      actualEndTime: ot.actual_end_time ? format(new Date(ot.actual_end_time), "HH:mm") : "",
      actualOtHours: ot.actual_ot_hours?.toString() || "",
      otAmount: ot.ot_amount?.toString() || "",
      status: ot.status,
    });
    setEditModal({ open: true, ot });
  };

  const handleSaveEdit = async () => {
    if (!editModal.ot) return;
    setProcessing(true);

    try {
      const updateData: any = {
        request_date: editData.requestDate,
        requested_start_time: `${editData.requestDate}T${editData.startTime}:00`,
        requested_end_time: `${editData.requestDate}T${editData.endTime}:00`,
        status: editData.status,
      };

      if (editData.actualStartTime) {
        updateData.actual_start_time = `${editData.requestDate}T${editData.actualStartTime}:00`;
      }
      if (editData.actualEndTime) {
        updateData.actual_end_time = `${editData.requestDate}T${editData.actualEndTime}:00`;
      }
      if (editData.actualOtHours) {
        updateData.actual_ot_hours = parseFloat(editData.actualOtHours);
      }
      if (editData.otAmount) {
        updateData.ot_amount = parseFloat(editData.otAmount);
      }

      const { error } = await supabase
        .from("ot_requests")
        .update(updateData)
        .eq("id", editModal.ot.id);

      if (error) throw error;

      toast.success("บันทึกสำเร็จ", "แก้ไขข้อมูล OT เรียบร้อยแล้ว");
      setEditModal({ open: false, ot: null });
      fetchOT();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกได้");
    } finally {
      setProcessing(false);
    }
  };

  const handleAddOT = async () => {
    if (!addForm.employeeId || !addForm.requestDate || !addForm.reason) {
      toast.error("กรุณากรอกข้อมูล", "เลือกพนักงาน วันที่ และเหตุผล");
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("ot_requests")
        .insert({
          employee_id: addForm.employeeId,
          request_date: addForm.requestDate,
          requested_start_time: `${addForm.requestDate}T${addForm.startTime}:00`,
          requested_end_time: `${addForm.requestDate}T${addForm.endTime}:00`,
          approved_start_time: addForm.status === "approved" ? `${addForm.requestDate}T${addForm.startTime}:00` : null,
          approved_end_time: addForm.status === "approved" ? `${addForm.requestDate}T${addForm.endTime}:00` : null,
          reason: addForm.reason,
          status: addForm.status,
          ot_type: addForm.otType,
          approved_by: addForm.status === "approved" ? employee?.id : null,
        });

      if (error) throw error;

      toast.success("สำเร็จ", "เพิ่ม OT เรียบร้อยแล้ว");
      setAddModal(false);
      setAddForm({
        employeeId: "",
        requestDate: format(new Date(), "yyyy-MM-dd"),
        startTime: "18:00",
        endTime: "21:00",
        reason: "",
        status: "approved",
        otType: "normal",
      });
      fetchOT();
    } catch (error: any) {
      console.error("Error adding OT:", error);
      toast.error("เกิดข้อผิดพลาด", error?.message || "ไม่สามารถเพิ่ม OT ได้");
    } finally {
      setProcessing(false);
    }
  };

  // Filter by search term
  const filteredRequests = otRequests.filter((ot) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      ot.employee?.name?.toLowerCase().includes(searchLower) ||
      ot.reason?.toLowerCase().includes(searchLower)
    );
  });

  const stats = {
    total: otRequests.length,
    pending: otRequests.filter((o) => o.status === "pending").length,
    approved: otRequests.filter((o) => o.status === "approved").length,
    completed: otRequests.filter((o) => o.status === "completed" || o.actual_end_time).length,
    rejected: otRequests.filter((o) => o.status === "rejected").length,
    cancelled: otRequests.filter((o) => o.status === "cancelled").length,
  };

  const getStatusBadge = (status: string, ot: any) => {
    // Check if OT is in progress
    if (ot.actual_start_time && !ot.actual_end_time) {
      return <Badge variant="warning">🔥 กำลังทำ</Badge>;
    }
    if (ot.actual_end_time) {
      return <Badge variant="info">✅ เสร็จสิ้น</Badge>;
    }
    
    switch (status) {
      case "pending":
        return <Badge variant="warning">รออนุมัติ</Badge>;
      case "approved":
        return <Badge variant="success">อนุมัติแล้ว</Badge>;
      case "rejected":
        return <Badge variant="danger">ปฏิเสธ</Badge>;
      case "cancelled":
        return <Badge variant="default">ยกเลิก</Badge>;
      case "completed":
        return <Badge variant="info">เสร็จสิ้น</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <AdminLayout title="จัดการ OT">
      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        {[
          { label: "ทั้งหมด", value: stats.total, color: "text-[#1d1d1f]" },
          { label: "รออนุมัติ", value: stats.pending, color: "text-[#ff9500]" },
          { label: "อนุมัติ", value: stats.approved, color: "text-[#34c759]" },
          { label: "กำลังทำ/เสร็จ", value: stats.completed, color: "text-[#0071e3]" },
          { label: "ปฏิเสธ", value: stats.rejected, color: "text-[#ff3b30]" },
          { label: "ยกเลิก", value: stats.cancelled, color: "text-[#86868b]" },
        ].map((stat, i) => (
          <Card key={i} elevated>
            <div className="text-center py-2">
              <p className={`text-[24px] font-semibold ${stat.color}`}>{stat.value}</p>
              <p className="text-[11px] text-[#86868b]">{stat.label}</p>
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
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#d2d2d7] focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 outline-none text-[15px]"
          />
        </div>
        <div className="flex gap-2">
          <DateInput
            value={dateFilter}
            onChange={setDateFilter}
            placeholder="วว/ดด/ปปปป"
          />
          {dateFilter && (
            <Button variant="secondary" size="sm" onClick={() => setDateFilter("")}>
              <X className="w-4 h-4" />
            </Button>
          )}
          <Button onClick={() => setAddModal(true)}>
            <Plus className="w-4 h-4" />
            เพิ่ม OT
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { key: "all", label: "ทั้งหมด", count: stats.total },
          { key: "pending", label: "รออนุมัติ", count: stats.pending },
          { key: "approved", label: "อนุมัติแล้ว", count: stats.approved },
          { key: "completed", label: "เสร็จสิ้น", count: stats.completed },
          { key: "rejected", label: "ปฏิเสธ", count: stats.rejected },
          { key: "cancelled", label: "ยกเลิก", count: stats.cancelled },
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
            <span
              className={`
                px-2 py-0.5 rounded-full text-[12px]
                ${filter === tab.key ? "bg-white/20" : "bg-[#d2d2d7]"}
              `}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* OT List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card elevated>
            <div className="text-center py-20 text-[#86868b]">ไม่มีคำขอ OT</div>
          </Card>
        ) : (
          filteredRequests.map((ot) => (
            <Card key={ot.id} elevated>
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <Avatar name={ot.employee?.name || "?"} size="lg" />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                        {ot.employee?.name}
                      </h3>
                      {getStatusBadge(ot.status, ot)}
                      {ot.ot_type === "holiday" && (
                        <Badge variant="info">วันหยุด (2x)</Badge>
                      )}
                    </div>
                    <p className="text-[14px] text-[#86868b] mb-2">
                      {format(new Date(ot.request_date), "EEEE d MMMM yyyy", { locale: th })}
                    </p>
                    <div className="flex items-center gap-2 text-[14px] text-[#6e6e73] mb-2">
                      <Clock className="w-4 h-4" />
                      ขอ: {format(new Date(ot.requested_start_time), "HH:mm")} -{" "}
                      {format(new Date(ot.requested_end_time), "HH:mm")} น.
                    </div>
                    {ot.actual_start_time && (
                      <div className="flex items-center gap-2 text-[14px] text-[#0071e3] mb-2">
                        <Play className="w-4 h-4" />
                        จริง: {format(new Date(ot.actual_start_time), "HH:mm")}
                        {ot.actual_end_time ? ` - ${format(new Date(ot.actual_end_time), "HH:mm")} น.` : " - กำลังทำ..."}
                      </div>
                    )}
                    {ot.actual_ot_hours && (
                      <div className="flex items-center gap-2 text-[14px] font-medium text-[#34c759] mb-2">
                        รวม: {ot.actual_ot_hours} ชม.
                        {ot.ot_amount && <span className="text-[#ff9500]">(฿{ot.ot_amount.toFixed(0)})</span>}
                      </div>
                    )}
                    <div className="bg-[#f5f5f7] rounded-xl p-3 mb-2">
                      <p className="text-[13px] text-[#6e6e73]">
                        <span className="font-medium text-[#1d1d1f]">เหตุผล:</span> {ot.reason}
                      </p>
                    </div>
                    {/* Photos */}
                    {(ot.before_photo_url || ot.after_photo_url) && (
                      <div className="flex gap-2 mb-2">
                        {ot.before_photo_url && (
                          <button
                            onClick={() => setViewingPhoto({ url: ot.before_photo_url, type: "ก่อน OT" })}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-[#ff9500] bg-[#ff9500]/10 rounded-lg hover:bg-[#ff9500]/20"
                          >
                            <Camera className="w-3 h-3" />
                            ก่อน
                          </button>
                        )}
                        {ot.after_photo_url && (
                          <button
                            onClick={() => setViewingPhoto({ url: ot.after_photo_url, type: "หลัง OT" })}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-[#34c759] bg-[#34c759]/10 rounded-lg hover:bg-[#34c759]/20"
                          >
                            <Camera className="w-3 h-3" />
                            หลัง
                          </button>
                        )}
                      </div>
                    )}
                    {/* GPS Location */}
                    {(ot.start_gps_lat || ot.end_gps_lat) && (
                      <div className="flex flex-wrap gap-2">
                        {ot.start_gps_lat && ot.start_gps_lng && (
                          <a
                            href={`https://www.google.com/maps?q=${ot.start_gps_lat},${ot.start_gps_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-[#ff9500] bg-[#ff9500]/10 rounded-lg hover:bg-[#ff9500]/20"
                          >
                            <MapPin className="w-3 h-3" />
                            GPS เริ่ม
                          </a>
                        )}
                        {ot.end_gps_lat && ot.end_gps_lng && (
                          <a
                            href={`https://www.google.com/maps?q=${ot.end_gps_lat},${ot.end_gps_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-[#34c759] bg-[#34c759]/10 rounded-lg hover:bg-[#34c759]/20"
                          >
                            <MapPin className="w-3 h-3" />
                            GPS จบ
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap md:flex-col">
                  {/* Edit button - always shown */}
                  <Button size="sm" variant="secondary" onClick={() => openEditModal(ot)}>
                    <Edit2 className="w-4 h-4" />
                    แก้ไข
                  </Button>

                  {/* Pending: Approve/Reject */}
                  {ot.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() =>
                          setConfirmDialog({ open: true, id: ot.id, action: "approve", name: ot.employee?.name })
                        }
                      >
                        <CheckCircle className="w-4 h-4" />
                        อนุมัติ
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() =>
                          setConfirmDialog({ open: true, id: ot.id, action: "reject", name: ot.employee?.name })
                        }
                      >
                        <XCircle className="w-4 h-4" />
                        ปฏิเสธ
                      </Button>
                    </>
                  )}

                  {/* Approved but not started: Cancel */}
                  {ot.status === "approved" && !ot.actual_start_time && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() =>
                        setConfirmDialog({ open: true, id: ot.id, action: "cancel", name: ot.employee?.name })
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                      ยกเลิก
                    </Button>
                  )}

                  {/* In progress or completed: Reset */}
                  {(ot.actual_start_time || ot.status === "completed") && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setConfirmDialog({ open: true, id: ot.id, action: "reset", name: ot.employee?.name })
                      }
                    >
                      <RotateCcw className="w-4 h-4" />
                      รีเซ็ต
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, id: "", action: "approve", name: "" })}
        onConfirm={handleConfirm}
        title={
          confirmDialog.action === "approve" ? "ยืนยันการอนุมัติ" :
          confirmDialog.action === "reject" ? "ยืนยันการปฏิเสธ" :
          confirmDialog.action === "cancel" ? "ยืนยันการยกเลิก" :
          "ยืนยันการรีเซ็ต"
        }
        message={
          confirmDialog.action === "approve"
            ? `คุณต้องการอนุมัติ OT ของ "${confirmDialog.name}" ใช่หรือไม่?`
            : confirmDialog.action === "reject"
            ? `คุณต้องการปฏิเสธ OT ของ "${confirmDialog.name}" ใช่หรือไม่?`
            : confirmDialog.action === "cancel"
            ? `คุณต้องการยกเลิก OT ของ "${confirmDialog.name}" ใช่หรือไม่? (พนักงานจะไม่สามารถเริ่ม OT นี้ได้)`
            : `คุณต้องการรีเซ็ต OT ของ "${confirmDialog.name}" ใช่หรือไม่? (จะลบเวลาจริง, รูปภาพ, และชั่วโมง OT ทั้งหมด)`
        }
        type={confirmDialog.action === "approve" ? "info" : "danger"}
        confirmText={
          confirmDialog.action === "approve" ? "อนุมัติ" :
          confirmDialog.action === "reject" ? "ปฏิเสธ" :
          confirmDialog.action === "cancel" ? "ยกเลิก" :
          "รีเซ็ต"
        }
        loading={processing}
      />

      {/* Edit Modal */}
      <Modal
        isOpen={editModal.open}
        onClose={() => setEditModal({ open: false, ot: null })}
        title="แก้ไขข้อมูล OT"
        size="lg"
      >
        <div className="space-y-4">
          <DateInput
            label="วันที่"
            value={editData.requestDate}
            onChange={(val) => setEditData({ ...editData, requestDate: val })}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1">เวลาเริ่ม (ขอ)</label>
              <TimeInput
                value={editData.startTime}
                onChange={(val) => setEditData({ ...editData, startTime: val })}
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1">เวลาจบ (ขอ)</label>
              <TimeInput
                value={editData.endTime}
                onChange={(val) => setEditData({ ...editData, endTime: val })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1">เวลาเริ่มจริง</label>
              <TimeInput
                value={editData.actualStartTime}
                onChange={(val) => setEditData({ ...editData, actualStartTime: val })}
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1">เวลาจบจริง</label>
              <TimeInput
                value={editData.actualEndTime}
                onChange={(val) => setEditData({ ...editData, actualEndTime: val })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1">ชั่วโมง OT จริง</label>
              <Input
                type="number"
                step="0.5"
                value={editData.actualOtHours}
                onChange={(e) => setEditData({ ...editData, actualOtHours: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1">เงิน OT (บาท)</label>
              <Input
                type="number"
                value={editData.otAmount}
                onChange={(e) => setEditData({ ...editData, otAmount: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <Select
            label="สถานะ"
            value={editData.status}
            onChange={(val) => setEditData({ ...editData, status: val })}
            options={[
              { value: "pending", label: "รออนุมัติ" },
              { value: "approved", label: "อนุมัติแล้ว" },
              { value: "rejected", label: "ปฏิเสธ" },
              { value: "completed", label: "เสร็จสิ้น" },
              { value: "cancelled", label: "ยกเลิก" },
            ]}
          />

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setEditModal({ open: false, ot: null })}
              className="flex-1"
            >
              ยกเลิก
            </Button>
            <Button onClick={handleSaveEdit} loading={processing} className="flex-1">
              บันทึก
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add OT Modal */}
      <Modal
        isOpen={addModal}
        onClose={() => setAddModal(false)}
        title="เพิ่ม OT ให้พนักงาน"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
              <User className="w-4 h-4 inline mr-1" />
              พนักงาน *
            </label>
            <Select
              value={addForm.employeeId}
              onChange={(val) => setAddForm({ ...addForm, employeeId: val })}
              options={[
                { value: "", label: "เลือกพนักงาน" },
                ...employees.map((emp) => ({
                  value: emp.id,
                  label: `${emp.name} (${emp.email})`,
                })),
              ]}
            />
          </div>

          <div>
            <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              วันที่ *
            </label>
            <DateInput
              value={addForm.requestDate}
              onChange={(val) => setAddForm({ ...addForm, requestDate: val })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เวลาเริ่ม</label>
              <TimeInput
                value={addForm.startTime}
                onChange={(val) => setAddForm({ ...addForm, startTime: val })}
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เวลาจบ</label>
              <TimeInput
                value={addForm.endTime}
                onChange={(val) => setAddForm({ ...addForm, endTime: val })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="ประเภท OT"
              value={addForm.otType}
              onChange={(val) => setAddForm({ ...addForm, otType: val })}
              options={[
                { value: "normal", label: "ปกติ (1.5x)" },
                { value: "holiday", label: "วันหยุด (2x)" },
              ]}
            />
            <Select
              label="สถานะ"
              value={addForm.status}
              onChange={(val) => setAddForm({ ...addForm, status: val })}
              options={[
                { value: "approved", label: "อนุมัติทันที" },
                { value: "pending", label: "รออนุมัติ" },
              ]}
            />
          </div>

          <div>
            <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เหตุผล *</label>
            <Input
              value={addForm.reason}
              onChange={(e) => setAddForm({ ...addForm, reason: e.target.value })}
              placeholder="เช่น งานด่วน, ปิดงบ, ประชุมลูกค้า"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={() => setAddModal(false)} className="flex-1">
              ยกเลิก
            </Button>
            <Button onClick={handleAddOT} loading={processing} className="flex-1">
              <Plus className="w-4 h-4" />
              เพิ่ม OT
            </Button>
          </div>
        </div>
      </Modal>

      {/* Photo Modal */}
      {viewingPhoto && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingPhoto(null)}
        >
          <div className="relative max-w-full max-h-[90vh]">
            <button
              className="absolute -top-12 right-0 p-2 bg-white rounded-full shadow-lg"
              onClick={() => setViewingPhoto(null)}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="bg-white rounded-2xl overflow-hidden">
              <div className="px-4 py-2 bg-[#f5f5f7] border-b border-[#e8e8ed]">
                <p className="text-[14px] font-medium text-[#1d1d1f]">รูปภาพ{viewingPhoto.type}</p>
              </div>
              <img
                src={viewingPhoto.url}
                alt={viewingPhoto.type}
                className="max-w-[90vw] max-h-[70vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default function OTManagementPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <OTManagementContent />
    </ProtectedRoute>
  );
}
