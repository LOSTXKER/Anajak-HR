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
import { TimeInput } from "@/components/ui/TimeInput";
import { DateInput } from "@/components/ui/DateInput";
import { useToast } from "@/components/ui/Toast";
import { getOTRateForDate } from "@/lib/utils/holiday";
import {
  Clock,
  Search,
  Plus,
  Camera,
  MapPin,
  Play,
  RefreshCw,
  Edit2,
  RotateCcw,
  Trash2,
  X,
  CheckCircle2,
  XCircle,
  DollarSign,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

// Types
interface OTRequest {
  id: string;
  employee_id: string;
  ot_type: string;
  request_date: string;
  requested_start_time: string;
  requested_end_time: string;
  actual_start_time: string | null;
  actual_end_time: string | null;
  reason: string;
  status: string;
  actual_ot_hours: number | null;
  approved_ot_hours: number | null;
  ot_rate: number | null;
  ot_amount: number | null;
  before_photo_url: string | null;
  after_photo_url: string | null;
  start_gps_lat: number | null;
  start_gps_lng: number | null;
  end_gps_lat: number | null;
  end_gps_lng: number | null;
  created_at: string;
  employee: { id: string; name: string; email: string } | null;
}

type FilterStatus = "all" | "pending" | "approved" | "in_progress" | "completed" | "rejected" | "cancelled";

function OTManagementContent() {
  const { employee: currentAdmin } = useAuth();
  const toast = useToast();

  // State
  const [loading, setLoading] = useState(true);
  const [otRequests, setOtRequests] = useState<OTRequest[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string; email: string }[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Modals
  const [photoModal, setPhotoModal] = useState<{ url: string; type: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; ot: OTRequest | null; action: string }>({ open: false, ot: null, action: "" });
  const [editModal, setEditModal] = useState<{ open: boolean; ot: OTRequest | null }>({ open: false, ot: null });
  const [addModal, setAddModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Edit form
  const [editForm, setEditForm] = useState({
    requestDate: "", startTime: "", endTime: "",
    actualStartTime: "", actualEndTime: "",
    actualOtHours: "", otAmount: "", status: "", otRate: 1.5,
  });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; ot: OTRequest | null }>({ open: false, ot: null });

  // Auto-calculate OT hours and amount when actual times change
  useEffect(() => {
    if (editForm.actualStartTime && editForm.actualEndTime && editForm.requestDate) {
      const start = new Date(`${editForm.requestDate}T${editForm.actualStartTime}:00`);
      const end = new Date(`${editForm.requestDate}T${editForm.actualEndTime}:00`);
      const diffMs = end.getTime() - start.getTime();
      const hours = Math.max(0, diffMs / (1000 * 60 * 60));
      setEditForm(prev => ({ ...prev, actualOtHours: hours.toFixed(2) }));
    }
  }, [editForm.actualStartTime, editForm.actualEndTime, editForm.requestDate]);

  // Auto-calculate amount when hours or rate change
  useEffect(() => {
    if (editForm.actualOtHours && editModal.ot) {
      const hours = parseFloat(editForm.actualOtHours);
      const rate = editModal.ot.ot_rate || 1.5;
      // Get employee salary for calculation (simplified)
      supabase.from("employees").select("base_salary").eq("id", editModal.ot.employee_id).single()
        .then(({ data }) => {
          if (data?.base_salary) {
            const hourlyRate = data.base_salary / 30 / 8;
            const amount = hours * hourlyRate * rate;
            setEditForm(prev => ({ ...prev, otAmount: amount.toFixed(2) }));
          }
        });
    }
  }, [editForm.actualOtHours, editModal.ot]);

  // Add form
  const [addForm, setAddForm] = useState({
    employeeId: "", requestDate: format(new Date(), "yyyy-MM-dd"),
    startTime: "18:00", endTime: "21:00", reason: "", status: "approved",
  });
  const [dayInfo, setDayInfo] = useState<any>(null);

  // Fetch data
  const fetchOT = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("ot_requests")
        .select("*, employee:employees!employee_id(id, name, email)")
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        if (filterStatus === "in_progress") {
          query = query.not("actual_start_time", "is", null).is("actual_end_time", null);
        } else if (filterStatus === "completed") {
          query = query.not("actual_end_time", "is", null);
        } else {
          query = query.eq("status", filterStatus);
        }
      }
      if (dateFilter) query = query.eq("request_date", dateFilter);

      const { data, error } = await query;
      if (error) throw error;
      setOtRequests(data || []);
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, dateFilter, toast]);

  const fetchEmployees = useCallback(async () => {
    const { data } = await supabase.from("employees").select("id, name, email").eq("account_status", "approved").order("name");
    setEmployees(data || []);
  }, []);

  useEffect(() => { fetchOT(); fetchEmployees(); }, [fetchOT, fetchEmployees]);

  // Fetch day info for add form
  useEffect(() => {
    if (addModal && addForm.requestDate) {
      getOTRateForDate(addForm.requestDate).then(setDayInfo).catch(console.error);
    }
  }, [addModal, addForm.requestDate]);

  // Stats
  const stats = useMemo(() => {
    const all = otRequests.length;
    const pending = otRequests.filter((o) => o.status === "pending").length;
    const approved = otRequests.filter((o) => o.status === "approved" && !o.actual_start_time).length;
    const inProgress = otRequests.filter((o) => o.actual_start_time && !o.actual_end_time).length;
    const completed = otRequests.filter((o) => o.actual_end_time).length;
    const totalHours = otRequests.reduce((sum, o) => sum + (o.actual_ot_hours || 0), 0);
    const totalAmount = otRequests.reduce((sum, o) => sum + (o.ot_amount || 0), 0);
    return { all, pending, approved, inProgress, completed, totalHours, totalAmount };
  }, [otRequests]);

  // Filtered
  const filteredOT = useMemo(() => {
    return otRequests.filter((ot) => {
      if (!searchTerm) return true;
      return ot.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             ot.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [otRequests, searchTerm]);

  // Actions
  const handleConfirmAction = async () => {
    if (!confirmModal.ot || !currentAdmin) return;
    setProcessing(true);
    try {
      let updateData: any = {};
      if (confirmModal.action === "cancel") {
        updateData = { status: "cancelled" };
      } else if (confirmModal.action === "reset") {
        updateData = { status: "approved", actual_start_time: null, actual_end_time: null, actual_ot_hours: null, ot_amount: null, before_photo_url: null, after_photo_url: null };
      }

      const { error } = await supabase.from("ot_requests").update(updateData).eq("id", confirmModal.ot.id);
      if (error) throw error;

      toast.success("สำเร็จ", confirmModal.action === "cancel" ? "ยกเลิก OT แล้ว" : "รีเซ็ต OT แล้ว");
      setConfirmModal({ open: false, ot: null, action: "" });
      fetchOT();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message);
    } finally {
      setProcessing(false);
    }
  };

  const openEditModal = (ot: OTRequest) => {
    setEditForm({
      requestDate: ot.request_date,
      startTime: format(new Date(ot.requested_start_time), "HH:mm"),
      endTime: format(new Date(ot.requested_end_time), "HH:mm"),
      actualStartTime: ot.actual_start_time ? format(new Date(ot.actual_start_time), "HH:mm") : "",
      actualEndTime: ot.actual_end_time ? format(new Date(ot.actual_end_time), "HH:mm") : "",
      actualOtHours: ot.actual_ot_hours?.toString() || "",
      otAmount: ot.ot_amount?.toString() || "",
      status: ot.status,
      otRate: ot.ot_rate || 1.5,
    });
    setEditModal({ open: true, ot });
  };

  // Delete OT
  const handleDeleteOT = async () => {
    if (!deleteModal.ot) return;
    setProcessing(true);
    try {
      const { error } = await supabase.from("ot_requests").delete().eq("id", deleteModal.ot.id);
      if (error) throw error;

      toast.success("สำเร็จ", "ลบ OT เรียบร้อยแล้ว");
      setDeleteModal({ open: false, ot: null });
      fetchOT();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editModal.ot) return;
    setProcessing(true);
    try {
      const updateData: any = {
        request_date: editForm.requestDate,
        requested_start_time: `${editForm.requestDate}T${editForm.startTime}:00+07:00`,
        requested_end_time: `${editForm.requestDate}T${editForm.endTime}:00+07:00`,
        status: editForm.status,
      };
      if (editForm.actualStartTime) updateData.actual_start_time = `${editForm.requestDate}T${editForm.actualStartTime}:00+07:00`;
      if (editForm.actualEndTime) updateData.actual_end_time = `${editForm.requestDate}T${editForm.actualEndTime}:00+07:00`;
      if (editForm.actualOtHours) updateData.actual_ot_hours = parseFloat(editForm.actualOtHours);
      if (editForm.otAmount) updateData.ot_amount = parseFloat(editForm.otAmount);

      const { error } = await supabase.from("ot_requests").update(updateData).eq("id", editModal.ot.id);
      if (error) throw error;

      toast.success("บันทึกสำเร็จ", "แก้ไขข้อมูล OT เรียบร้อย");
      setEditModal({ open: false, ot: null });
      fetchOT();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleAddOT = async () => {
    if (!addForm.employeeId || !addForm.reason) {
      toast.error("กรุณากรอกข้อมูล", "เลือกพนักงานและเหตุผล");
      return;
    }
    setProcessing(true);
    try {
      const { error } = await supabase.from("ot_requests").insert({
        employee_id: addForm.employeeId,
        request_date: addForm.requestDate,
        requested_start_time: `${addForm.requestDate}T${addForm.startTime}:00+07:00`,
        requested_end_time: `${addForm.requestDate}T${addForm.endTime}:00+07:00`,
        approved_start_time: addForm.status === "approved" ? `${addForm.requestDate}T${addForm.startTime}:00+07:00` : null,
        approved_end_time: addForm.status === "approved" ? `${addForm.requestDate}T${addForm.endTime}:00+07:00` : null,
        reason: addForm.reason,
        status: addForm.status,
        ot_type: dayInfo?.type || "workday",
        ot_rate: dayInfo?.rate || 1.5,
        approved_by: addForm.status === "approved" ? currentAdmin?.id : null,
      });
      if (error) throw error;

      toast.success("สำเร็จ", "เพิ่ม OT เรียบร้อย");
      setAddModal(false);
      setAddForm({ employeeId: "", requestDate: format(new Date(), "yyyy-MM-dd"), startTime: "18:00", endTime: "21:00", reason: "", status: "approved" });
      fetchOT();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message);
    } finally {
      setProcessing(false);
    }
  };

  // Status badge
  const getStatusBadge = (ot: OTRequest) => {
    if (ot.actual_start_time && !ot.actual_end_time) return <Badge variant="warning">🔥 กำลังทำ</Badge>;
    if (ot.actual_end_time) return <Badge variant="info">✅ เสร็จสิ้น</Badge>;
    switch (ot.status) {
      case "pending": return <Badge variant="warning">รออนุมัติ</Badge>;
      case "approved": return <Badge variant="success">อนุมัติแล้ว</Badge>;
      case "rejected": return <Badge variant="danger">ปฏิเสธ</Badge>;
      case "cancelled": return <Badge variant="default">ยกเลิก</Badge>;
      default: return <Badge>{ot.status}</Badge>;
    }
  };

  const getOTTypeBadge = (ot: OTRequest) => {
    if (ot.ot_type === "holiday") return <Badge variant="danger">วันหยุด {ot.ot_rate}x</Badge>;
    if (ot.ot_type === "weekend") return <Badge variant="warning">สุดสัปดาห์ {ot.ot_rate}x</Badge>;
    if (ot.ot_rate && ot.ot_rate > 1) return <Badge variant="info">{ot.ot_rate}x</Badge>;
    return null;
  };

  return (
    <AdminLayout title="จัดการ OT">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {[
          { label: "ทั้งหมด", value: stats.all, color: "text-[#1d1d1f]", bg: "bg-[#f5f5f7]" },
          { label: "รออนุมัติ", value: stats.pending, color: "text-[#ff9500]", bg: "bg-[#ff9500]/10" },
          { label: "อนุมัติแล้ว", value: stats.approved, color: "text-[#34c759]", bg: "bg-[#34c759]/10" },
          { label: "กำลังทำ", value: stats.inProgress, color: "text-[#0071e3]", bg: "bg-[#0071e3]/10" },
          { label: "เสร็จสิ้น", value: stats.completed, color: "text-[#af52de]", bg: "bg-[#af52de]/10" },
          { label: "รวม ชม.", value: stats.totalHours.toFixed(1), color: "text-[#ff9500]", bg: "bg-[#ff9500]/10", icon: Clock },
          { label: "รวม ฿", value: stats.totalAmount.toLocaleString(), color: "text-[#34c759]", bg: "bg-[#34c759]/10", icon: DollarSign },
        ].map((s, i) => (
          <Card key={i} elevated className="!p-3">
            <div className="flex items-center gap-2">
              {s.icon && <s.icon className={`w-4 h-4 ${s.color}`} />}
              <div>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-[#86868b]">{s.label}</p>
              </div>
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
            placeholder="ค้นหาชื่อ หรือเหตุผล..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#d2d2d7] focus:border-[#0071e3] outline-none text-sm"
          />
        </div>
        <DateInput value={dateFilter} onChange={setDateFilter} placeholder="วันที่" />
        {dateFilter && (
          <Button variant="text" size="sm" onClick={() => setDateFilter("")}>
            <X className="w-4 h-4" />
          </Button>
        )}
        <Button onClick={() => setAddModal(true)}>
          <Plus className="w-4 h-4" />
          เพิ่ม OT
        </Button>
        <Button variant="text" onClick={fetchOT} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-1 px-1">
        {([
          { key: "all", label: "ทั้งหมด", count: stats.all },
          { key: "pending", label: "รออนุมัติ", count: stats.pending },
          { key: "approved", label: "อนุมัติแล้ว", count: stats.approved },
          { key: "in_progress", label: "กำลังทำ", count: stats.inProgress },
          { key: "completed", label: "เสร็จสิ้น", count: stats.completed },
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

      {/* OT List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredOT.length === 0 ? (
        <Card elevated className="text-center py-16 text-[#86868b]">ไม่มีคำขอ OT</Card>
      ) : (
        <div className="space-y-3">
          {filteredOT.map((ot) => (
            <Card key={ot.id} elevated className="!p-0 overflow-hidden">
              <div className="flex items-stretch">
                {/* Color bar */}
                <div className={`w-1.5 ${
                  ot.actual_end_time ? "bg-[#af52de]" :
                  ot.actual_start_time ? "bg-[#0071e3]" :
                  ot.status === "approved" ? "bg-[#34c759]" :
                  ot.status === "pending" ? "bg-[#ff9500]" :
                  "bg-[#86868b]"
                }`} />

                {/* Content */}
                <div className="flex-1 p-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={ot.employee?.name || "?"} size="md" />
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[15px] font-semibold text-[#1d1d1f]">{ot.employee?.name}</span>
                        {getStatusBadge(ot)}
                        {getOTTypeBadge(ot)}
                      </div>

                      {/* Date & Time */}
                      <p className="text-sm text-[#86868b] mb-1">
                        <Calendar className="w-3.5 h-3.5 inline mr-1" />
                        {format(new Date(ot.request_date), "EEEE d MMM yyyy", { locale: th })}
                      </p>
                      <p className="text-sm text-[#6e6e73] mb-1">
                        <Clock className="w-3.5 h-3.5 inline mr-1" />
                        ขอ: {format(new Date(ot.requested_start_time), "HH:mm")} - {format(new Date(ot.requested_end_time), "HH:mm")}
                      </p>

                      {/* Actual times */}
                      {ot.actual_start_time && (
                        <p className="text-sm text-[#0071e3] mb-1">
                          <Play className="w-3.5 h-3.5 inline mr-1" />
                          จริง: {format(new Date(ot.actual_start_time), "HH:mm")}
                          {ot.actual_end_time ? ` - ${format(new Date(ot.actual_end_time), "HH:mm")}` : " - กำลังทำ..."}
                        </p>
                      )}

                      {/* Hours & Amount */}
                      {ot.actual_ot_hours && (
                        <p className="text-sm font-medium mb-1">
                          <span className="text-[#34c759]">{ot.actual_ot_hours} ชม.</span>
                          {ot.ot_amount && <span className="text-[#ff9500] ml-2">฿{ot.ot_amount.toLocaleString()}</span>}
                        </p>
                      )}

                      {/* Reason */}
                      <p className="text-xs text-[#6e6e73] bg-[#f5f5f7] rounded-lg px-2.5 py-1.5 mt-2 line-clamp-2">
                        {ot.reason}
                      </p>

                      {/* Photos & GPS */}
                      {(ot.before_photo_url || ot.after_photo_url || ot.start_gps_lat || ot.end_gps_lat) && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {ot.before_photo_url && (
                            <button onClick={() => setPhotoModal({ url: ot.before_photo_url!, type: "ก่อน" })}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-[#ff9500] bg-[#ff9500]/10 rounded-lg hover:bg-[#ff9500]/20">
                              <Camera className="w-3 h-3" />ก่อน
                            </button>
                          )}
                          {ot.after_photo_url && (
                            <button onClick={() => setPhotoModal({ url: ot.after_photo_url!, type: "หลัง" })}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-[#34c759] bg-[#34c759]/10 rounded-lg hover:bg-[#34c759]/20">
                              <Camera className="w-3 h-3" />หลัง
                            </button>
                          )}
                          {ot.start_gps_lat && (
                            <a href={`https://www.google.com/maps?q=${ot.start_gps_lat},${ot.start_gps_lng}`} target="_blank"
                              className="flex items-center gap-1 px-2 py-1 text-xs text-[#ff9500] bg-[#ff9500]/10 rounded-lg hover:bg-[#ff9500]/20">
                              <MapPin className="w-3 h-3" />เริ่ม
                            </a>
                          )}
                          {ot.end_gps_lat && (
                            <a href={`https://www.google.com/maps?q=${ot.end_gps_lat},${ot.end_gps_lng}`} target="_blank"
                              className="flex items-center gap-1 px-2 py-1 text-xs text-[#34c759] bg-[#34c759]/10 rounded-lg hover:bg-[#34c759]/20">
                              <MapPin className="w-3 h-3" />จบ
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 ml-2">
                      <button onClick={() => openEditModal(ot)} className="p-2 text-[#0071e3] bg-[#0071e3]/10 rounded-lg hover:bg-[#0071e3]/20">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {ot.status === "approved" && !ot.actual_start_time && (
                        <button onClick={() => setConfirmModal({ open: true, ot, action: "cancel" })}
                          className="p-2 text-[#ff3b30] bg-[#ff3b30]/10 rounded-lg hover:bg-[#ff3b30]/20">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      {(ot.actual_start_time || ot.status === "completed") && (
                        <button onClick={() => setConfirmModal({ open: true, ot, action: "reset" })}
                          className="p-2 text-[#86868b] bg-[#f5f5f7] rounded-lg hover:bg-[#e8e8ed]">
                          <RotateCcw className="w-4 h-4" />
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
        onClose={() => setConfirmModal({ open: false, ot: null, action: "" })}
        onConfirm={handleConfirmAction}
        title={confirmModal.action === "cancel" ? "ยกเลิก OT" : "รีเซ็ต OT"}
        message={confirmModal.action === "cancel"
          ? `ยกเลิก OT ของ "${confirmModal.ot?.employee?.name}" ?`
          : `รีเซ็ต OT ของ "${confirmModal.ot?.employee?.name}" ? (ลบเวลาจริง, รูป, ชั่วโมง)`}
        type="danger"
        confirmText={confirmModal.action === "cancel" ? "ยกเลิก" : "รีเซ็ต"}
        loading={processing}
      />

      {/* Edit Modal */}
      <Modal isOpen={editModal.open} onClose={() => setEditModal({ open: false, ot: null })} title="แก้ไข OT" size="md">
        <div className="space-y-4">
          <DateInput label="วันที่" value={editForm.requestDate} onChange={(v) => setEditForm({ ...editForm, requestDate: v })} />
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">เวลาเริ่ม (ขอ)</label><TimeInput value={editForm.startTime} onChange={(v) => setEditForm({ ...editForm, startTime: v })} /></div>
            <div><label className="block text-sm font-medium mb-1">เวลาจบ (ขอ)</label><TimeInput value={editForm.endTime} onChange={(v) => setEditForm({ ...editForm, endTime: v })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">เวลาเริ่มจริง</label><TimeInput value={editForm.actualStartTime} onChange={(v) => setEditForm({ ...editForm, actualStartTime: v })} /></div>
            <div><label className="block text-sm font-medium mb-1">เวลาจบจริง</label><TimeInput value={editForm.actualEndTime} onChange={(v) => setEditForm({ ...editForm, actualEndTime: v })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="ชั่วโมง OT จริง" type="number" step="0.5" value={editForm.actualOtHours} onChange={(e) => setEditForm({ ...editForm, actualOtHours: e.target.value })} />
            <Input label="เงิน OT (฿)" type="number" value={editForm.otAmount} onChange={(e) => setEditForm({ ...editForm, otAmount: e.target.value })} />
          </div>
          <Select label="สถานะ" value={editForm.status} onChange={(v) => setEditForm({ ...editForm, status: v })} options={[
            { value: "pending", label: "รออนุมัติ" }, { value: "approved", label: "อนุมัติแล้ว" },
            { value: "rejected", label: "ปฏิเสธ" }, { value: "completed", label: "เสร็จสิ้น" }, { value: "cancelled", label: "ยกเลิก" },
          ]} />
          <div className="flex gap-3 pt-2">
            <Button variant="danger" onClick={() => { setEditModal({ open: false, ot: null }); setDeleteModal({ open: true, ot: editModal.ot }); }}>
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="secondary" onClick={() => setEditModal({ open: false, ot: null })} className="flex-1">ยกเลิก</Button>
            <Button onClick={handleSaveEdit} loading={processing} className="flex-1">บันทึก</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, ot: null })}
        onConfirm={handleDeleteOT}
        title="ลบ OT"
        message={`ลบข้อมูล OT ของ "${deleteModal.ot?.employee?.name}" อย่างถาวร? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        type="danger"
        confirmText="ลบถาวร"
        loading={processing}
      />

      {/* Add Modal */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="เพิ่ม OT" size="md">
        <div className="space-y-4">
          <Select label="พนักงาน *" value={addForm.employeeId} onChange={(v) => setAddForm({ ...addForm, employeeId: v })}
            options={[{ value: "", label: "เลือกพนักงาน" }, ...employees.map((e) => ({ value: e.id, label: e.name }))]} />
          <DateInput label="วันที่ *" value={addForm.requestDate} onChange={(v) => setAddForm({ ...addForm, requestDate: v })} />
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">เวลาเริ่ม</label><TimeInput value={addForm.startTime} onChange={(v) => setAddForm({ ...addForm, startTime: v })} /></div>
            <div><label className="block text-sm font-medium mb-1">เวลาจบ</label><TimeInput value={addForm.endTime} onChange={(v) => setAddForm({ ...addForm, endTime: v })} /></div>
          </div>
          {dayInfo && (
            <div className={`p-3 rounded-xl border-2 ${dayInfo.type === "holiday" ? "bg-[#ff3b30]/10 border-[#ff3b30]/30" : dayInfo.type === "weekend" ? "bg-[#ff9500]/10 border-[#ff9500]/30" : "bg-[#34c759]/10 border-[#34c759]/30"}`}>
              <Badge variant={dayInfo.type === "holiday" ? "danger" : dayInfo.type === "weekend" ? "warning" : "success"}>{dayInfo.typeName}</Badge>
              <span className="ml-2 font-semibold">อัตรา {dayInfo.rate}x</span>
            </div>
          )}
          <Select label="สถานะ" value={addForm.status} onChange={(v) => setAddForm({ ...addForm, status: v })}
            options={[{ value: "approved", label: "อนุมัติทันที" }, { value: "pending", label: "รออนุมัติ" }]} />
          <Input label="เหตุผล *" value={addForm.reason} onChange={(e) => setAddForm({ ...addForm, reason: e.target.value })} placeholder="เช่น งานด่วน" />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setAddModal(false)} className="flex-1">ยกเลิก</Button>
            <Button onClick={handleAddOT} loading={processing} className="flex-1">เพิ่ม OT</Button>
          </div>
        </div>
      </Modal>

      {/* Photo Modal */}
      {photoModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPhotoModal(null)}>
          <button className="absolute top-4 right-4 p-2 bg-white rounded-full" onClick={() => setPhotoModal(null)}><X className="w-5 h-5" /></button>
          <div className="bg-white rounded-2xl overflow-hidden max-w-[90vw]">
            <div className="px-4 py-2 bg-[#f5f5f7] border-b text-sm font-medium">รูปภาพ{photoModal.type}</div>
            <img src={photoModal.url} alt="" className="max-h-[70vh] object-contain" />
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
