"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DateInput } from "@/components/ui/DateInput";
import { TimeInput } from "@/components/ui/TimeInput";
import { useToast } from "@/components/ui/Toast";
import {
  Clock,
  Calendar,
  Home,
  AlertTriangle,
  MapPin,
  UserPlus,
  CheckCircle,
  DollarSign,
  FileText,
} from "lucide-react";
import { format } from "date-fns";

type RequestType = "ot" | "leave" | "wfh" | "late" | "field_work";

const requestTypes = [
  { value: "ot", label: "OT (Overtime)", icon: Clock, color: "#ff9500" },
  { value: "leave", label: "ลางาน", icon: Calendar, color: "#0071e3" },
  { value: "wfh", label: "WFH", icon: Home, color: "#af52de" },
  { value: "late", label: "ขออนุมัติมาสาย", icon: AlertTriangle, color: "#ff3b30" },
  { value: "field_work", label: "งานนอกสถานที่", icon: MapPin, color: "#34c759" },
];

const leaveTypes = [
  { value: "sick", label: "ลาป่วย" },
  { value: "personal", label: "ลากิจ" },
  { value: "annual", label: "ลาพักร้อน" },
  { value: "maternity", label: "ลาคลอด" },
  { value: "military", label: "ลากรณีทหาร" },
  { value: "other", label: "อื่นๆ" },
];

function CreateRequestContent() {
  const router = useRouter();
  const { employee: currentAdmin } = useAuth();
  const toast = useToast();

  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    requestType: "" as RequestType | "",
    employeeId: "",
    // OT
    otDate: format(new Date(), "yyyy-MM-dd"),
    otStartTime: "18:00",
    otEndTime: "21:00",
    otIsCompleted: true, // สร้างแบบทำเสร็จแล้ว (default true สำหรับการสร้างย้อนหลัง)
    otType: "workday" as "workday" | "weekend" | "holiday",
    otRate: 1.5,
    // Leave
    leaveType: "sick",
    leaveStartDate: format(new Date(), "yyyy-MM-dd"),
    leaveEndDate: format(new Date(), "yyyy-MM-dd"),
    leaveIsHalfDay: false,
    // WFH
    wfhDate: format(new Date(), "yyyy-MM-dd"),
    wfhIsHalfDay: false,
    // Late
    lateDate: format(new Date(), "yyyy-MM-dd"),
    lateMinutes: 0,
    // Field Work
    fieldWorkDate: format(new Date(), "yyyy-MM-dd"),
    fieldWorkIsHalfDay: false,
    fieldWorkLocation: "",
    // Common
    reason: "",
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("employees")
      .select("id, name, email")
      .neq("role", "admin")
      .order("name");
    setEmployees(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.requestType || !formData.employeeId || !currentAdmin) return;

    setLoading(true);
    try {
      const approvalData = {
        approved_by: currentAdmin.id,
        approved_at: new Date().toISOString(),
      };

      switch (formData.requestType) {
        case "ot": {
          const startDateTime = new Date(`${formData.otDate}T${formData.otStartTime}:00`);
          const endDateTime = new Date(`${formData.otDate}T${formData.otEndTime}:00`);
          
          // คำนวณชั่วโมง OT
          const otHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
          
          // ดึง base_salary ของพนักงาน
          const { data: empData } = await supabase
            .from("employees")
            .select("base_salary")
            .eq("id", formData.employeeId)
            .single();
          
          // คำนวณเงิน OT
          let otAmount = null;
          const baseSalary = empData?.base_salary || 0;
          if (baseSalary > 0) {
            const hourlyRate = baseSalary / 30 / 8; // 30 วัน, 8 ชั่วโมง/วัน
            otAmount = Math.round(otHours * hourlyRate * formData.otRate * 100) / 100;
          }
          
          // ถ้าเป็น OT ที่ทำเสร็จแล้ว ให้บันทึก actual เลย
          const insertData: any = {
            employee_id: formData.employeeId,
            request_date: formData.otDate,
            requested_start_time: startDateTime.toISOString(),
            requested_end_time: endDateTime.toISOString(),
            approved_start_time: startDateTime.toISOString(),
            approved_end_time: endDateTime.toISOString(),
            approved_ot_hours: Math.round(otHours * 100) / 100,
            ot_type: formData.otType,
            ot_rate: formData.otRate,
            reason: formData.reason,
            ...approvalData,
          };
          
          if (formData.otIsCompleted) {
            // สร้างแบบทำเสร็จแล้ว (completed)
            insertData.status = "completed";
            insertData.actual_start_time = startDateTime.toISOString();
            insertData.actual_end_time = endDateTime.toISOString();
            insertData.actual_ot_hours = Math.round(otHours * 100) / 100;
            insertData.ot_amount = otAmount;
          } else {
            // สร้างแบบรออนุมัติ (approved) - พนักงานต้องกดเริ่ม-จบเอง
            insertData.status = "approved";
          }
          
          const { error } = await supabase.from("ot_requests").insert(insertData);
          if (error) throw error;
          break;
        }

        case "leave": {
          const { error } = await supabase.from("leave_requests").insert({
            employee_id: formData.employeeId,
            leave_type: formData.leaveType,
            start_date: formData.leaveStartDate,
            end_date: formData.leaveEndDate,
            is_half_day: formData.leaveIsHalfDay,
            reason: formData.reason,
            status: "approved",
            ...approvalData,
          });
          if (error) throw error;
          break;
        }

        case "wfh": {
          const { error } = await supabase.from("wfh_requests").insert({
            employee_id: formData.employeeId,
            date: formData.wfhDate,
            is_half_day: formData.wfhIsHalfDay,
            reason: formData.reason,
            status: "approved",
            ...approvalData,
          });
          if (error) throw error;
          break;
        }

        case "late": {
          const { error } = await supabase.from("late_requests").insert({
            employee_id: formData.employeeId,
            request_date: formData.lateDate,
            actual_late_minutes: formData.lateMinutes,
            reason: formData.reason,
            status: "approved",
            ...approvalData,
          });
          if (error) throw error;
          break;
        }

        case "field_work": {
          if (!formData.fieldWorkLocation.trim()) {
            toast.error("กรุณาระบุสถานที่", "สถานที่จำเป็นสำหรับงานนอกสถานที่");
            setLoading(false);
            return;
          }
          const { error } = await supabase.from("field_work_requests").insert({
            employee_id: formData.employeeId,
            date: formData.fieldWorkDate,
            is_half_day: formData.fieldWorkIsHalfDay,
            location: formData.fieldWorkLocation.trim(),
            reason: formData.reason,
            status: "approved",
            ...approvalData,
          });
          if (error) throw error;
          break;
        }
      }

      const successMsg = formData.requestType === "ot" && formData.otIsCompleted
        ? "OT ถูกบันทึกและคำนวณยอดเงินแล้ว"
        : "คำขอได้รับการอนุมัติแล้ว";
      toast.success("สร้างคำขอสำเร็จ", successMsg);
      router.push("/admin/approvals");
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message || "ไม่สามารถสร้างคำขอได้");
    } finally {
      setLoading(false);
    }
  };

  const selectedConfig = requestTypes.find((t) => t.value === formData.requestType);
  const Icon = selectedConfig?.icon || UserPlus;

  return (
    <AdminLayout title="เพิ่มคำขอใหม่">
      <form onSubmit={handleSubmit} className="max-w-3xl">
        {/* Info */}
        <Card className="mb-6 !bg-[#0071e3]/5 border-[#0071e3]/20">
          <p className="text-[14px] text-[#86868b] flex items-center gap-2">
            <FileText className="w-4 h-4" />
            เพิ่มคำขอแทนพนักงาน (กรณีลืมกรอก หรือไม่สะดวก) คำขอจะได้รับการอนุมัติทันที
          </p>
        </Card>

        {/* Request Type */}
        <Card elevated className="mb-6">
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">ประเภทคำขอ</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {requestTypes.map((type) => {
              const TypeIcon = type.icon;
              const isSelected = formData.requestType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, requestType: type.value as RequestType })}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? "border-[#0071e3] bg-[#0071e3]/5"
                      : "border-[#e8e8ed] hover:border-[#d2d2d7]"
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${type.color}15` }}
                  >
                    <TypeIcon className="w-6 h-6" style={{ color: type.color }} />
                  </div>
                  <span className="text-[13px] font-medium text-[#1d1d1f] text-center">
                    {type.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {formData.requestType && (
          <>
            {/* Employee Selection */}
            <Card elevated className="mb-6">
              <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">เลือกพนักงาน</h3>
              <select
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                required
                className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
              >
                <option value="">-- เลือกพนักงาน --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.email})
                  </option>
                ))}
              </select>
            </Card>

            {/* OT Form */}
            {formData.requestType === "ot" && (
              <Card elevated className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-5 h-5 text-[#ff9500]" />
                  <h3 className="text-[17px] font-semibold text-[#1d1d1f]">รายละเอียด OT</h3>
                </div>
                <div className="space-y-4">
                  {/* OT Mode Selection */}
                  <div className="p-4 bg-[#f5f5f7] rounded-xl">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.otIsCompleted}
                        onChange={(e) => setFormData({ ...formData, otIsCompleted: e.target.checked })}
                        className="w-5 h-5 rounded"
                      />
                      <div>
                        <span className="text-[15px] font-medium text-[#1d1d1f] flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          OT ทำเสร็จแล้ว (สร้างย้อนหลัง)
                        </span>
                        <p className="text-[13px] text-[#86868b]">
                          {formData.otIsCompleted 
                            ? "บันทึกยอดเงิน OT ทันที พนักงานไม่ต้องกดเริ่ม-จบ"
                            : "พนักงานต้องกดเริ่มและจบ OT เอง"
                          }
                        </p>
                      </div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">วันที่</label>
                    <DateInput
                      value={formData.otDate}
                      onChange={(val) => setFormData({ ...formData, otDate: val })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                        เวลาเริ่ม
                      </label>
                      <TimeInput
                        value={formData.otStartTime}
                        onChange={(val) => setFormData({ ...formData, otStartTime: val })}
                      />
                    </div>
                    <div>
                      <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                        เวลาสิ้นสุด
                      </label>
                      <TimeInput
                        value={formData.otEndTime}
                        onChange={(val) => setFormData({ ...formData, otEndTime: val })}
                      />
                    </div>
                  </div>

                  {/* OT Rate Selection */}
                  <div>
                    <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                      ประเภท OT & อัตราคูณ
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, otType: "workday", otRate: 1.5 })}
                        className={`p-3 rounded-xl text-center transition-all ${
                          formData.otType === "workday"
                            ? "bg-[#0071e3] text-white"
                            : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]"
                        }`}
                      >
                        <span className="block text-[20px] font-bold">1.5x</span>
                        <span className="block text-[11px] mt-0.5">วันธรรมดา</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, otType: "weekend", otRate: 2 })}
                        className={`p-3 rounded-xl text-center transition-all ${
                          formData.otType === "weekend"
                            ? "bg-[#0071e3] text-white"
                            : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]"
                        }`}
                      >
                        <span className="block text-[20px] font-bold">2x</span>
                        <span className="block text-[11px] mt-0.5">วันหยุด</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, otType: "holiday", otRate: 3 })}
                        className={`p-3 rounded-xl text-center transition-all ${
                          formData.otType === "holiday"
                            ? "bg-[#0071e3] text-white"
                            : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]"
                        }`}
                      >
                        <span className="block text-[20px] font-bold">3x</span>
                        <span className="block text-[11px] mt-0.5">วันหยุดนักขัตฤกษ์</span>
                      </button>
                    </div>
                  </div>

                  {/* OT Preview */}
                  {formData.otIsCompleted && formData.otStartTime && formData.otEndTime && (
                    <div className="p-4 bg-[#34c759]/10 rounded-xl">
                      <p className="text-[13px] text-[#34c759] font-medium mb-1 flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4" />
                        ประมาณการ OT
                      </p>
                      <p className="text-[15px] text-[#1d1d1f]">
                        {(() => {
                          const start = new Date(`2000-01-01T${formData.otStartTime}:00`);
                          const end = new Date(`2000-01-01T${formData.otEndTime}:00`);
                          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                          return `${hours.toFixed(2)} ชั่วโมง × ${formData.otRate}x = ${(hours * formData.otRate).toFixed(2)} ชั่วโมง (เทียบเท่า)`;
                        })()}
                      </p>
                      <p className="text-[12px] text-[#86868b] mt-1">
                        * ยอดเงินจริงจะคำนวณจาก base salary ของพนักงาน
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เหตุผล</label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      rows={3}
                      required
                      className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all resize-none"
                      placeholder="ระบุเหตุผล..."
                    />
                  </div>
                </div>
              </Card>
            )}

            {/* Leave Form */}
            {formData.requestType === "leave" && (
              <Card elevated className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="w-5 h-5 text-[#0071e3]" />
                  <h3 className="text-[17px] font-semibold text-[#1d1d1f]">รายละเอียดการลา</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                      ประเภทการลา
                    </label>
                    <select
                      value={formData.leaveType}
                      onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                    >
                      {leaveTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                        วันที่เริ่ม
                      </label>
                      <DateInput
                        value={formData.leaveStartDate}
                        onChange={(val) => setFormData({ ...formData, leaveStartDate: val })}
                      />
                    </div>
                    <div>
                      <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                        วันที่สิ้นสุด
                      </label>
                      <DateInput
                        value={formData.leaveEndDate}
                        onChange={(val) => setFormData({ ...formData, leaveEndDate: val })}
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.leaveIsHalfDay}
                      onChange={(e) => setFormData({ ...formData, leaveIsHalfDay: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-[14px] text-[#1d1d1f]">ลาครึ่งวัน</span>
                  </label>
                  <div>
                    <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เหตุผล</label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all resize-none"
                      placeholder="ระบุเหตุผล (ถ้ามี)..."
                    />
                  </div>
                </div>
              </Card>
            )}

            {/* WFH Form */}
            {formData.requestType === "wfh" && (
              <Card elevated className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <Home className="w-5 h-5 text-[#af52de]" />
                  <h3 className="text-[17px] font-semibold text-[#1d1d1f]">รายละเอียด WFH</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">วันที่</label>
                    <DateInput
                      value={formData.wfhDate}
                      onChange={(val) => setFormData({ ...formData, wfhDate: val })}
                    />
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.wfhIsHalfDay}
                      onChange={(e) => setFormData({ ...formData, wfhIsHalfDay: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-[14px] text-[#1d1d1f]">ครึ่งวัน</span>
                  </label>
                  <div>
                    <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เหตุผล</label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      rows={3}
                      required
                      className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all resize-none"
                      placeholder="ระบุเหตุผล..."
                    />
                  </div>
                </div>
              </Card>
            )}

            {/* Late Form */}
            {formData.requestType === "late" && (
              <Card elevated className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-5 h-5 text-[#ff3b30]" />
                  <h3 className="text-[17px] font-semibold text-[#1d1d1f]">รายละเอียดการมาสาย</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">วันที่</label>
                    <DateInput
                      value={formData.lateDate}
                      onChange={(val) => setFormData({ ...formData, lateDate: val })}
                    />
                  </div>
                  <div>
                    <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                      จำนวนนาทีที่สาย
                    </label>
                    <input
                      type="number"
                      value={formData.lateMinutes}
                      onChange={(e) =>
                        setFormData({ ...formData, lateMinutes: parseInt(e.target.value) || 0 })
                      }
                      min="0"
                      className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เหตุผล</label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      rows={3}
                      required
                      className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all resize-none"
                      placeholder="ระบุเหตุผล..."
                    />
                  </div>
                </div>
              </Card>
            )}

            {/* Field Work Form */}
            {formData.requestType === "field_work" && (
              <Card elevated className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="w-5 h-5 text-[#34c759]" />
                  <h3 className="text-[17px] font-semibold text-[#1d1d1f]">รายละเอียดงานนอกสถานที่</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">วันที่</label>
                    <DateInput
                      value={formData.fieldWorkDate}
                      onChange={(val) => setFormData({ ...formData, fieldWorkDate: val })}
                    />
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.fieldWorkIsHalfDay}
                      onChange={(e) =>
                        setFormData({ ...formData, fieldWorkIsHalfDay: e.target.checked })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-[14px] text-[#1d1d1f]">ครึ่งวัน</span>
                  </label>
                  <div>
                    <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                      สถานที่ *
                    </label>
                    <input
                      type="text"
                      value={formData.fieldWorkLocation}
                      onChange={(e) => setFormData({ ...formData, fieldWorkLocation: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                      placeholder="เช่น บริษัท XYZ, โรงพยาบาล ABC"
                    />
                  </div>
                  <div>
                    <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เหตุผล</label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      rows={3}
                      required
                      className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all resize-none"
                      placeholder="ระบุเหตุผล..."
                    />
                  </div>
                </div>
              </Card>
            )}

            {/* Submit */}
            <div className="flex gap-3">
              <Button type="button" variant="text" onClick={() => router.back()}>
                ยกเลิก
              </Button>
              <Button
                type="submit"
                loading={loading}
                disabled={!formData.employeeId}
                icon={<CheckCircle className="w-5 h-5" />}
              >
                สร้างคำขอ (อนุมัติทันที)
              </Button>
            </div>
          </>
        )}
      </form>
    </AdminLayout>
  );
}

export default function CreateRequestPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <CreateRequestContent />
    </ProtectedRoute>
  );
}

