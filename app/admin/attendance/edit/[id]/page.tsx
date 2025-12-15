"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/lib/auth/auth-context";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TimeInput } from "@/components/ui/TimeInput";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
  Clock,
  Save,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  History,
  Trash2,
  Calendar,
  FileText,
} from "lucide-react";

interface AttendanceLog {
  id: string;
  employee_id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  work_date: string;
  auto_checkout: boolean;
  edited_by: string | null;
  edited_at: string | null;
  edit_reason: string | null;
  original_clock_out: string | null;
  employee?: {
    name: string;
    email: string;
  };
}

function EditAttendanceContent() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { employee: currentAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceLog | null>(null);
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [editReason, setEditReason] = useState("");
  const [workStartTime, setWorkStartTime] = useState("09:00");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchAttendance(params.id as string);
      fetchSettings();
    }
  }, [params.id]);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "work_start_time")
      .maybeSingle();

    if (data?.setting_value) {
      setWorkStartTime(data.setting_value);
    }
  };

  const fetchAttendance = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("attendance_logs")
        .select(
          `
          *,
          employee:employees!employee_id(name, email)
        `
        )
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAttendance(data);
        setClockIn(data.clock_in_time ? format(new Date(data.clock_in_time), "HH:mm") : "");
        setClockOut(data.clock_out_time ? format(new Date(data.clock_out_time), "HH:mm") : "");
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!attendance) return;
    if (!editReason.trim()) {
      toast.error("กรุณากรอกเหตุผล", "เหตุผลในการแก้ไขจำเป็นต้องกรอก");
      return;
    }

    setSaving(true);
    try {
      const clockInDate = new Date(attendance.clock_in_time);

      // สร้างวันที่ใหม่จากเวลาที่แก้ไข
      const [inHours, inMinutes] = clockIn.split(":").map(Number);

      const newClockIn = new Date(clockInDate);
      newClockIn.setHours(inHours, inMinutes, 0, 0);

      // คำนวณ total_hours และ newClockOut
      let totalHours = null;
      let newClockOut = null;
      
      if (clockOut && clockOut.trim()) {
        const [outHours, outMinutes] = clockOut.split(":").map(Number);
        newClockOut = new Date(clockInDate); // ใช้วันเดียวกับ clock_in_time
        newClockOut.setHours(outHours, outMinutes, 0, 0);
        
        const diffMs = newClockOut.getTime() - newClockIn.getTime();
        totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // ปัดเศษ 2 ตำแหน่ง
      }

      // คำนวณ is_late และ late_minutes ตามเวลาเริ่มงานจาก settings
      const [workStartHour, workStartMinute] = workStartTime.split(":").map(Number);
      const clockInTotalMinutes = inHours * 60 + inMinutes;
      const workStartTotalMinutes = workStartHour * 60 + workStartMinute;

      const isLate = clockInTotalMinutes > workStartTotalMinutes;
      const lateMinutes = isLate ? clockInTotalMinutes - workStartTotalMinutes : 0;

      const { error } = await supabase
        .from("attendance_logs")
        .update({
          clock_in_time: newClockIn.toISOString(),
          clock_out_time: newClockOut ? newClockOut.toISOString() : null,
          total_hours: totalHours,
          is_late: isLate,
          late_minutes: lateMinutes,
          original_clock_out: attendance.clock_out_time || attendance.original_clock_out,
          edited_at: new Date().toISOString(),
          edit_reason: editReason,
          edited_by: currentAdmin?.id || null,
        })
        .eq("id", attendance.id);

      if (error) throw error;

      // บันทึก anomaly สำหรับการแก้ไขย้อนหลัง
      await supabase.from("attendance_anomalies").insert({
        attendance_id: attendance.id,
        employee_id: attendance.employee_id,
        date: format(clockInDate, "yyyy-MM-dd"),
        anomaly_type: "manual_edit",
        description: `แก้ไขเวลาโดย ${currentAdmin?.name || "Admin"}: เช็คอิน ${clockIn} น., เช็คเอาท์ ${clockOut || "-"} น.`,
        status: "resolved",
        resolution_note: editReason,
        resolved_by: currentAdmin?.id || null,
        resolved_at: new Date().toISOString(),
      });

      toast.success("บันทึกสำเร็จ", "แก้ไขข้อมูลการเข้างานเรียบร้อยแล้ว");
      router.push("/admin/attendance");
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกได้");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!attendance) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("attendance_logs")
        .delete()
        .eq("id", attendance.id);

      if (error) throw error;

      toast.success("ลบสำเร็จ", "ลบข้อมูลการเข้างานเรียบร้อยแล้ว");
      router.push("/admin/attendance");
    } catch (error) {
      console.error("Error deleting attendance:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถลบได้");
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="แก้ไขข้อมูลการเข้างาน">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!attendance) {
    return (
      <AdminLayout title="แก้ไขข้อมูลการเข้างาน">
        <Card elevated className="text-center py-12">
          <AlertTriangle className="w-16 h-16 text-[#ff9500] mx-auto mb-4" />
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">
            ไม่พบข้อมูล
          </h3>
          <p className="text-[15px] text-[#86868b] mb-4">
            ไม่พบข้อมูลการเข้างานที่ต้องการแก้ไข
          </p>
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
            กลับ
          </Button>
        </Card>
      </AdminLayout>
    );
  }

  const clockInDate = new Date(attendance.clock_in_time);

  return (
    <AdminLayout
      title="แก้ไขข้อมูลการเข้างาน"
      description="แก้ไขเวลาเช็คอิน/เช็คเอาท์ย้อนหลัง"
    >
      <div className="max-w-2xl space-y-6">
        {/* Back Button */}
        <Button variant="text" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
          กลับ
        </Button>

        {/* Employee Info */}
        <Card elevated>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#0071e3] to-[#34c759] rounded-2xl flex items-center justify-center text-white text-[24px] font-bold">
              {attendance.employee?.name?.charAt(0) || "?"}
            </div>
            <div>
              <h2 className="text-[20px] font-semibold text-[#1d1d1f]">
                {attendance.employee?.name || "ไม่ระบุ"}
              </h2>
              <p className="text-[15px] text-[#86868b]">
                📧 {attendance.employee?.email || "-"}
              </p>
              <p className="text-[15px] text-[#86868b] flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(clockInDate, "EEEE d MMMM yyyy", { locale: th })}
              </p>
            </div>
          </div>
        </Card>

        {/* Warning */}
        <Card elevated className="border-l-4 border-l-[#ff9500]">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-[#ff9500] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-1">
                คำเตือน
              </h3>
              <p className="text-[13px] text-[#86868b]">
                การแก้ไขเวลาเข้างานจะถูกบันทึกประวัติและแสดงในรายงาน
                กรุณาตรวจสอบความถูกต้องก่อนบันทึก
              </p>
            </div>
          </div>
        </Card>

        {/* Current Data */}
        <Card elevated>
          <div className="flex items-center gap-3 mb-4">
            <History className="w-5 h-5 text-[#86868b]" />
            <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
              ข้อมูลเดิม
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-[#f5f5f7] rounded-xl">
            <div>
              <p className="text-[13px] text-[#86868b] mb-1">เช็คอินเดิม</p>
              <p className="text-[17px] font-semibold text-[#1d1d1f]">
                {format(new Date(attendance.clock_in_time), "HH:mm น.")}
              </p>
            </div>
            <div>
              <p className="text-[13px] text-[#86868b] mb-1">เช็คเอาท์เดิม</p>
              <p className="text-[17px] font-semibold text-[#1d1d1f]">
                {attendance.clock_out_time
                  ? format(new Date(attendance.clock_out_time), "HH:mm น.")
                  : "-"}
                {attendance.auto_checkout && (
                  <span className="ml-2 px-2 py-0.5 bg-[#0071e3]/10 text-[#0071e3] text-[11px] rounded-full">
                    Auto
                  </span>
                )}
              </p>
            </div>
          </div>

          {attendance.edit_reason && (
            <div className="mt-4 p-3 bg-[#f5f5f7] rounded-lg">
              <p className="text-[12px] text-[#86868b] flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                เคยแก้ไขแล้ว: {attendance.edit_reason}
              </p>
            </div>
          )}
        </Card>

        {/* Edit Form */}
        <Card elevated>
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-5 h-5 text-[#0071e3]" />
            <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
              แก้ไขเวลา
            </h3>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <TimeInput
                label="เวลาเช็คอิน"
                value={clockIn}
                onChange={setClockIn}
                className="text-[17px] font-semibold"
              />
              <TimeInput
                label="เวลาเช็คเอาท์"
                value={clockOut}
                onChange={setClockOut}
                className="text-[17px] font-semibold"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">
                เหตุผลในการแก้ไข <span className="text-[#ff3b30]">*</span>
              </label>
              <textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all resize-none"
                placeholder="เช่น ลืมเช็คเอาท์, เช็คอินผิดเวลา..."
              />
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="secondary" onClick={() => router.back()} fullWidth>
              ยกเลิก
            </Button>
            <Button
              onClick={handleSave}
              loading={saving}
              fullWidth
              icon={!saving ? <Save className="w-5 h-5" /> : undefined}
            >
              {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
            </Button>
          </div>

          {/* Delete Button - Subtle */}
          <div className="flex justify-center">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-[13px] text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              ลบข้อมูลการเข้างานนี้
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="ยืนยันการลบ"
        message={`คุณต้องการลบข้อมูลการเข้างานของ ${attendance?.employee?.name} วันที่ ${attendance ? format(new Date(attendance.work_date), "d MMMM yyyy", { locale: th }) : ""} ใช่หรือไม่?\n\nการลบนี้จะลบข้อมูลออกจากระบบถาวร ไม่สามารถกู้คืนได้`}
        confirmText="ลบ"
        type="danger"
        loading={saving}
      />
    </AdminLayout>
  );
}

export default function EditAttendancePage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <EditAttendanceContent />
    </ProtectedRoute>
  );
}

