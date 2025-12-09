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
import { TimeInput } from "@/components/ui/TimeInput";
import { DateInput } from "@/components/ui/DateInput";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Clock, 
  X, 
  Camera, 
  Edit, 
  AlertCircle,
  Plus,
  User,
  Calendar,
  Sun,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { th } from "date-fns/locale";

function AttendanceContent() {
  const { employee: currentAdmin } = useAuth();
  const toast = useToast();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

  // Filters
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterBranch, setFilterBranch] = useState("");
  const [filterDate, setFilterDate] = useState("");

  // Add attendance modal
  const [addModal, setAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; attendance: any | null }>({
    open: false,
    attendance: null,
  });
  const [addForm, setAddForm] = useState({
    employeeId: "",
    workDate: format(new Date(), "yyyy-MM-dd"),
    clockInTime: "09:00",
    clockOutTime: "18:00",
    status: "present",
    isLate: false,
    note: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [currentMonth, filterEmployee, filterStatus, filterBranch, filterDate]);

  const fetchEmployees = async () => {
    try {
      const { data } = await supabase
        .from("employees")
        .select("id, name, email, branch_id")
        .eq("account_status", "approved")
        .order("name");
      setEmployees(data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data } = await supabase
        .from("branches")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      setBranches(data || []);
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      let query = supabase
        .from("attendance_logs")
        .select(`*, employee:employees!employee_id (id, name, email, role, branch_id)`)
        .gte("work_date", startDate)
        .lte("work_date", endDate)
        .order("work_date", { ascending: false });

      // Apply employee filter
      if (filterEmployee) {
        query = query.eq("employee_id", filterEmployee);
      }

      // Apply date filter
      if (filterDate) {
        query = query.eq("work_date", filterDate);
      }

      // Apply status filter
      if (filterStatus === "late") {
        query = query.eq("is_late", true);
      } else if (filterStatus === "normal") {
        query = query.eq("is_late", false).neq("status", "holiday");
      } else if (filterStatus === "holiday") {
        query = query.eq("status", "holiday");
      } else if (filterStatus === "no_checkout") {
        query = query.is("clock_out_time", null);
      }

      const { data } = await query;

      // Filter by branch (client-side since it's a joined field)
      let filteredData = data || [];
      if (filterBranch) {
        filteredData = filteredData.filter(a => a.employee?.branch_id === filterBranch);
      }

      setAttendance(filteredData);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAttendance = async () => {
    if (!addForm.employeeId || !addForm.workDate) {
      toast.error("กรุณากรอกข้อมูล", "เลือกพนักงานและวันที่");
      return;
    }

    setSaving(true);
    try {
      // Calculate total hours
      const clockIn = new Date(`${addForm.workDate}T${addForm.clockInTime}:00`);
      const clockOut = new Date(`${addForm.workDate}T${addForm.clockOutTime}:00`);
      const totalHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

      const { error } = await supabase
        .from("attendance_logs")
        .insert({
          employee_id: addForm.employeeId,
          work_date: addForm.workDate,
          clock_in_time: clockIn.toISOString(),
          clock_out_time: clockOut.toISOString(),
          total_hours: totalHours > 0 ? totalHours : 0,
          status: addForm.status,
          is_late: addForm.isLate,
          note: addForm.note || `เพิ่มโดย Admin`,
          created_by: currentAdmin?.id,
        });

      if (error) throw error;

      toast.success("สำเร็จ", "เพิ่มการเข้างานเรียบร้อยแล้ว");
      setAddModal(false);
      setAddForm({
        employeeId: "",
        workDate: format(new Date(), "yyyy-MM-dd"),
        clockInTime: "09:00",
        clockOutTime: "18:00",
        status: "present",
        isLate: false,
        note: "",
      });
      fetchAttendance();
    } catch (error: any) {
      console.error("Error adding attendance:", error);
      toast.error("เกิดข้อผิดพลาด", error?.message || "ไม่สามารถเพิ่มการเข้างานได้");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.attendance) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("attendance_logs")
        .delete()
        .eq("id", deleteConfirm.attendance.id);

      if (error) throw error;

      toast.success("ลบสำเร็จ", "ลบข้อมูลการเข้างานเรียบร้อยแล้ว");
      setDeleteConfirm({ open: false, attendance: null });
      fetchAttendance();
    } catch (error: any) {
      console.error("Error deleting attendance:", error);
      toast.error("เกิดข้อผิดพลาด", error?.message || "ไม่สามารถลบข้อมูลได้");
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    if (!attendance.length) return;
    const headers = ["วันที่", "ชื่อ", "เข้างาน", "ออกงาน", "ชั่วโมง", "สถานะ"];
    const rows = attendance.map((a) => [
      format(new Date(a.work_date), "dd/MM/yyyy"),
      a.employee?.name || "-",
      a.clock_in_time ? format(new Date(a.clock_in_time), "HH:mm") : "-",
      a.clock_out_time ? format(new Date(a.clock_out_time), "HH:mm") : "-",
      a.total_hours?.toFixed(1) || "0",
      a.is_late ? "สาย" : "ปกติ",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `attendance-${format(currentMonth, "yyyy-MM")}.csv`;
    link.click();
  };

  const stats = {
    total: attendance.length,
    normal: attendance.filter((a) => a.clock_in_time && !a.is_late && a.status !== "holiday").length,
    late: attendance.filter((a) => a.is_late).length,
    holiday: attendance.filter((a) => a.status === "holiday").length,
    hours: attendance.reduce((sum, a) => sum + (a.total_hours || 0), 0),
  };

  const getStatusBadge = (log: any) => {
    if (log.status === "holiday") {
      return <Badge variant="info"><Sun className="w-3 h-3 mr-1" />วันหยุด</Badge>;
    }
    return <Badge variant={log.is_late ? "warning" : "success"}>{log.is_late ? "สาย" : "ปกติ"}</Badge>;
  };

  return (
    <AdminLayout title="ข้อมูลการเข้างาน">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
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
        <div className="flex gap-2">
          <Button onClick={() => setAddModal(true)}>
            <Plus className="w-4 h-4" />
            เพิ่มการเข้างาน
          </Button>
          <Button variant="secondary" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card elevated className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-[13px] font-medium text-[#86868b] mb-1">พนักงาน</label>
            <Select
              value={filterEmployee}
              onChange={setFilterEmployee}
              options={[
                { value: "", label: "ทั้งหมด" },
                ...employees.map((emp) => ({ value: emp.id, label: emp.name })),
              ]}
              placeholder="เลือกพนักงาน"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#86868b] mb-1">สถานะ</label>
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { value: "all", label: "ทั้งหมด" },
                { value: "normal", label: "ปกติ" },
                { value: "late", label: "มาสาย" },
                { value: "holiday", label: "วันหยุด" },
                { value: "no_checkout", label: "ไม่ได้เช็คเอาท์" },
              ]}
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#86868b] mb-1">สาขา</label>
            <Select
              value={filterBranch}
              onChange={setFilterBranch}
              options={[
                { value: "", label: "ทั้งหมด" },
                ...branches.map((b) => ({ value: b.id, label: b.name })),
              ]}
              placeholder="เลือกสาขา"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#86868b] mb-1">วันที่</label>
            <DateInput
              value={filterDate}
              onChange={setFilterDate}
              placeholder="วว/ดด/ปปปป"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterEmployee("");
                setFilterStatus("all");
                setFilterBranch("");
                setFilterDate("");
              }}
              className="px-4 py-2 text-[14px] text-[#0071e3] hover:bg-[#0071e3]/10 rounded-lg transition-colors"
            >
              ล้าง Filter
            </button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: "รายการ", value: stats.total },
          { label: "ปกติ", value: stats.normal, color: "text-[#34c759]" },
          { label: "มาสาย", value: stats.late, color: "text-[#ff9500]" },
          { label: "วันหยุด", value: stats.holiday, color: "text-[#af52de]" },
          { label: "ชั่วโมงรวม", value: stats.hours.toFixed(0), color: "text-[#0071e3]" },
        ].map((stat, i) => (
          <Card key={i} elevated>
            <div className="text-center py-2">
              <p className={`text-[24px] font-semibold ${stat.color || "text-[#1d1d1f]"}`}>
                {stat.value}
              </p>
              <p className="text-[12px] text-[#86868b]">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card elevated padding="none">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : attendance.length === 0 ? (
          <div className="text-center py-20 text-[#86868b]">
            ไม่มีข้อมูลการเข้างานในเดือนนี้
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e8e8ed]">
                  <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">วันที่</th>
                  <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">พนักงาน</th>
                  <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">เข้างาน</th>
                  <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">ออกงาน</th>
                  <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">ชั่วโมง</th>
                  <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">สถานะ</th>
                  <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">รูปภาพ</th>
                  <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e8ed]">
                {attendance.map((log) => (
                  <tr key={log.id} className="hover:bg-[#f5f5f7] transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-[14px] text-[#1d1d1f]">
                        {format(new Date(log.work_date), "dd/MM/yyyy")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={log.employee?.name || "?"} size="sm" />
                        <span className="text-[14px] text-[#1d1d1f]">{log.employee?.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-[14px] text-[#6e6e73]">
                        <Clock className="w-4 h-4" />
                        {log.clock_in_time ? format(new Date(log.clock_in_time), "HH:mm") : "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-[14px] text-[#6e6e73]">
                        <Clock className="w-4 h-4" />
                        {log.clock_out_time ? format(new Date(log.clock_out_time), "HH:mm") : "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[14px] font-medium text-[#1d1d1f]">
                        {log.total_hours?.toFixed(1) || "0"} ชม.
                      </span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(log)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {log.clock_in_photo_url && (
                          <button
                            onClick={() => setViewingPhoto(log.clock_in_photo_url)}
                            className="flex items-center gap-1 px-2 py-1 text-[12px] text-[#0071e3] bg-[#0071e3]/10 rounded-lg hover:bg-[#0071e3]/20"
                          >
                            <Camera className="w-3 h-3" />
                            เข้า
                          </button>
                        )}
                        {log.clock_out_photo_url && (
                          <button
                            onClick={() => setViewingPhoto(log.clock_out_photo_url)}
                            className="flex items-center gap-1 px-2 py-1 text-[12px] text-[#34c759] bg-[#34c759]/10 rounded-lg hover:bg-[#34c759]/20"
                          >
                            <Camera className="w-3 h-3" />
                            ออก
                          </button>
                        )}
                        {!log.clock_in_photo_url && !log.clock_out_photo_url && (
                          <span className="text-[12px] text-[#86868b]">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/attendance/edit/${log.id}`}
                          className="flex items-center gap-1 px-3 py-1.5 text-[12px] text-[#0071e3] bg-[#0071e3]/10 rounded-lg hover:bg-[#0071e3]/20"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          แก้ไข
                        </Link>
                        <button
                          onClick={() => setDeleteConfirm({ open: true, attendance: log })}
                          className="flex items-center gap-1 px-3 py-1.5 text-[12px] text-[#ff3b30] bg-[#ff3b30]/10 rounded-lg hover:bg-[#ff3b30]/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          ลบ
                        </button>
                        {!log.clock_out_time && (
                          <span className="flex items-center gap-1 px-2 py-1 text-[11px] text-[#ff9500] bg-[#ff9500]/10 rounded-lg">
                            <AlertCircle className="w-3 h-3" />
                            ไม่เช็คเอาท์
                          </span>
                        )}
                        {log.auto_checkout && (
                          <span className="px-2 py-1 text-[11px] text-[#0071e3] bg-[#0071e3]/10 rounded-lg">Auto</span>
                        )}
                        {log.edited_at && (
                          <span className="px-2 py-1 text-[11px] text-[#86868b] bg-[#f5f5f7] rounded-lg">แก้ไขแล้ว</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Attendance Modal */}
      <Modal
        isOpen={addModal}
        onClose={() => setAddModal(false)}
        title="เพิ่มการเข้างาน"
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
              placeholder="เลือกพนักงาน"
            />
          </div>

          <DateInput
            label="วันที่ *"
            value={addForm.workDate}
            onChange={(val) => setAddForm({ ...addForm, workDate: val })}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เวลาเข้างาน</label>
              <TimeInput
                value={addForm.clockInTime}
                onChange={(val) => setAddForm({ ...addForm, clockInTime: val })}
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เวลาออกงาน</label>
              <TimeInput
                value={addForm.clockOutTime}
                onChange={(val) => setAddForm({ ...addForm, clockOutTime: val })}
              />
            </div>
          </div>

          <div>
            <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">สถานะ</label>
            <Select
              value={addForm.status}
              onChange={(val) => setAddForm({ ...addForm, status: val })}
              options={[
                { value: "present", label: "ปกติ" },
                { value: "holiday", label: "วันหยุด (OT)" },
                { value: "wfh", label: "WFH" },
              ]}
            />
          </div>

          <label className="flex items-center gap-3 p-3 bg-[#f5f5f7] rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={addForm.isLate}
              onChange={(e) => setAddForm({ ...addForm, isLate: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <span className="text-[15px] text-[#1d1d1f]">มาสาย</span>
          </label>

          <div>
            <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">หมายเหตุ</label>
            <Input
              value={addForm.note}
              onChange={(e) => setAddForm({ ...addForm, note: e.target.value })}
              placeholder="เช่น เพิ่มให้เพราะลืมเช็คอิน"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={() => setAddModal(false)} className="flex-1">
              ยกเลิก
            </Button>
            <Button onClick={handleAddAttendance} loading={saving} className="flex-1">
              <Plus className="w-4 h-4" />
              เพิ่ม
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
          <button
            className="absolute top-4 right-4 p-2 bg-white rounded-full"
            onClick={() => setViewingPhoto(null)}
          >
            <X className="w-5 h-5" />
          </button>
          <img src={viewingPhoto} alt="" className="max-w-full max-h-[90vh] rounded-2xl" />
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, attendance: null })}
        onConfirm={handleDelete}
        title="ยืนยันการลบ"
        message={`คุณต้องการลบข้อมูลการเข้างานของ ${deleteConfirm.attendance?.employee?.name} วันที่ ${deleteConfirm.attendance ? format(new Date(deleteConfirm.attendance.work_date), "d MMMM yyyy", { locale: th }) : ""} ใช่หรือไม่?`}
        confirmText="ลบ"
        confirmVariant="danger"
        loading={saving}
      />
    </AdminLayout>
  );
}

export default function AttendancePage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <AttendanceContent />
    </ProtectedRoute>
  );
}
