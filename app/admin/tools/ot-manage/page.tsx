"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { DateInput } from "@/components/ui/DateInput";
import { TimeInput } from "@/components/ui/TimeInput";
import { useToast } from "@/components/ui/Toast";
import { Clock, Plus, Save, Search, Calendar } from "lucide-react";
import { format } from "date-fns";

interface Employee {
  id: string;
  name: string;
  email: string;
}

function OTManageContent() {
  const router = useRouter();
  const { employee: currentAdmin } = useAuth();
  const toast = useToast();

  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [requestDate, setRequestDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"pending" | "approved">("approved");
  const [otType, setOtType] = useState<"workday" | "weekend" | "holiday">("workday");

  // Fetch employees
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("id, name, email")
      .neq("role", "admin")
      .eq("account_status", "approved")
      .order("name");

    if (!error && data) {
      setEmployees(data);
    }
  };

  // Calculate OT hours
  const calculateOTHours = () => {
    const start = new Date(`${requestDate}T${startTime}`);
    const end = new Date(`${requestDate}T${endTime}`);
    const diffMs = end.getTime() - start.getTime();
    return Math.max(0, diffMs / (1000 * 60 * 60));
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmployeeId) {
      toast.error("กรุณาเลือกพนักงาน");
      return;
    }

    if (!reason.trim()) {
      toast.error("กรุณาระบุเหตุผล");
      return;
    }

    const otHours = calculateOTHours();
    if (otHours <= 0) {
      toast.error("เวลา OT ไม่ถูกต้อง");
      return;
    }

    setSaving(true);

    try {
      const requestedStart = new Date(`${requestDate}T${startTime}`).toISOString();
      const requestedEnd = new Date(`${requestDate}T${endTime}`).toISOString();

      const otData: any = {
        employee_id: selectedEmployeeId,
        request_date: requestDate,
        requested_start_time: requestedStart,
        requested_end_time: requestedEnd,
        reason: reason,
        status: status,
        ot_type: otType,
      };

      // If approved, add approval fields
      if (status === "approved" && currentAdmin) {
        otData.approved_by = currentAdmin.id;
        otData.approved_at = new Date().toISOString();
        otData.approved_start_time = requestedStart;
        otData.approved_end_time = requestedEnd;
        otData.approved_ot_hours = otHours;
      }

      const { error } = await supabase
        .from("ot_requests")
        .insert(otData);

      if (error) throw error;

      toast.success(
        "สร้าง OT สำเร็จ",
        status === "approved" ? "สร้างและอนุมัติแล้ว" : "สร้างเป็น pending"
      );

      // Reset form
      setSelectedEmployeeId("");
      setReason("");
      setStartTime("18:00");
      setEndTime("20:00");

    } catch (error: any) {
      console.error("Error creating OT:", error);
      toast.error("เกิดข้อผิดพลาด", error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout 
      title="จัดการ OT" 
      description="สร้าง OT ย้อนหลังหรือแก้ไข OT ของพนักงาน"
    >
      <div className="max-w-3xl mx-auto">
        {/* Header Card */}
        <Card elevated className="mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-[#ff9500]" />
            </div>
            <div>
              <h2 className="text-[20px] font-semibold text-[#1d1d1f]">
                สร้าง OT ใหม่
              </h2>
              <p className="text-[14px] text-[#86868b]">
                สร้าง OT ย้อนหลังหรือล่วงหน้าให้พนักงาน
              </p>
            </div>
          </div>
        </Card>

        {/* Form */}
        <Card elevated>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Employee Selection */}
            <div>
              <label className="block text-[15px] font-medium text-[#1d1d1f] mb-2">
                พนักงาน <span className="text-[#ff3b30]">*</span>
              </label>
              <Select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                required
              >
                <option value="">เลือกพนักงาน...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.email})
                  </option>
                ))}
              </Select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-[15px] font-medium text-[#1d1d1f] mb-2">
                วันที่ OT <span className="text-[#ff3b30]">*</span>
              </label>
              <DateInput
                value={requestDate}
                onChange={setRequestDate}
                required
              />
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[15px] font-medium text-[#1d1d1f] mb-2">
                  เวลาเริ่ม <span className="text-[#ff3b30]">*</span>
                </label>
                <TimeInput
                  value={startTime}
                  onChange={setStartTime}
                  required
                />
              </div>
              <div>
                <label className="block text-[15px] font-medium text-[#1d1d1f] mb-2">
                  เวลาสิ้นสุด <span className="text-[#ff3b30]">*</span>
                </label>
                <TimeInput
                  value={endTime}
                  onChange={setEndTime}
                  required
                />
              </div>
            </div>

            {/* OT Hours Display */}
            <div className="p-4 bg-[#f5f5f7] rounded-xl">
              <p className="text-[14px] text-[#86868b] mb-1">ชั่วโมง OT</p>
              <p className="text-[24px] font-semibold text-[#ff9500]">
                {calculateOTHours().toFixed(2)} ชั่วโมง
              </p>
            </div>

            {/* OT Type */}
            <div>
              <label className="block text-[15px] font-medium text-[#1d1d1f] mb-2">
                ประเภท OT
              </label>
              <Select
                value={otType}
                onChange={(e) => setOtType(e.target.value as any)}
              >
                <option value="workday">วันทำงานปกติ (1x)</option>
                <option value="weekend">วันหยุดสุดสัปดาห์ (1.5x)</option>
                <option value="holiday">วันหยุดนักขัตฤกษ์ (2x)</option>
              </Select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-[15px] font-medium text-[#1d1d1f] mb-2">
                สถานะ
              </label>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="approved">อนุมัติเลย (แนะนำ)</option>
                <option value="pending">รอพนักงานอนุมัติ</option>
              </Select>
              <p className="text-[13px] text-[#86868b] mt-1">
                {status === "approved" 
                  ? "จะสร้างและอนุมัติทันที (เหมาะกับ OT ย้อนหลัง)"
                  : "จะสร้างเป็น pending รอพนักงานอนุมัติเอง"
                }
              </p>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-[15px] font-medium text-[#1d1d1f] mb-2">
                เหตุผล <span className="text-[#ff3b30]">*</span>
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="เช่น: แก้ไข OT ย้อนหลัง, ระบบขัดข้อง, ลืมขอ OT"
                rows={4}
                required
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.back()}
                fullWidth
                size="lg"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                loading={saving}
                fullWidth
                size="lg"
                icon={<Save className="w-5 h-5" />}
              >
                {saving ? "กำลังบันทึก..." : "สร้าง OT"}
              </Button>
            </div>
          </form>
        </Card>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-[#0071e3]/10 rounded-xl border border-[#0071e3]/20">
          <p className="text-[14px] text-[#1d1d1f] font-medium mb-2">
            💡 เคล็ดลับ:
          </p>
          <ul className="space-y-1 text-[13px] text-[#86868b]">
            <li>• เลือก "อนุมัติเลย" สำหรับ OT ย้อนหลังที่พนักงานทำไปแล้ว</li>
            <li>• ระบบจะบันทึก audit trail (ใครสร้าง เมื่อไร)</li>
            <li>• สามารถยกเลิก OT ภายหลังได้จากหน้า Approvals</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}

export default function OTManagePage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <OTManageContent />
    </ProtectedRoute>
  );
}

