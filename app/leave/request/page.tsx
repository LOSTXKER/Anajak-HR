"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DateInput } from "@/components/ui/DateInput";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, Calendar, FileText, Upload, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";
import { format } from "date-fns";

const leaveTypes = [
  { value: "sick", label: "ลาป่วย", color: "text-[#ff3b30]" },
  { value: "personal", label: "ลากิจ", color: "text-[#ff9500]" },
  { value: "annual", label: "ลาพักร้อน", color: "text-[#34c759]" },
  { value: "maternity", label: "ลาคลอด", color: "text-[#af52de]" },
  { value: "military", label: "ลากรณีทหาร", color: "text-[#0071e3]" },
  { value: "other", label: "อื่นๆ", color: "text-[#86868b]" },
];

function LeaveRequestContent() {
  const { employee } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [leaveSummary, setLeaveSummary] = useState({
    sick: 0,
    personal: 0,
    annual: 0,
  });
  const [leaveQuota, setLeaveQuota] = useState({
    annual: 10,
    sick: 30,
    personal: 3,
  });

  const [formData, setFormData] = useState({
    leaveType: "sick",
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    isHalfDay: false,
    reason: "",
    attachmentFile: null as File | null,
  });

  useEffect(() => {
    if (employee) {
      fetchLeaveSummary();
      fetchLeaveQuota();
    }
  }, [employee]);

  const fetchLeaveQuota = async () => {
    if (!employee) return;
    try {
      const { data } = await supabase
        .from("employees")
        .select("annual_leave_quota, sick_leave_quota, personal_leave_quota")
        .eq("id", employee.id)
        .single();

      if (data) {
        setLeaveQuota({
          annual: data.annual_leave_quota || 10,
          sick: data.sick_leave_quota || 30,
          personal: data.personal_leave_quota || 3,
        });
      }
    } catch (error) {
      console.error("Error fetching leave quota:", error);
    }
  };

  const fetchLeaveSummary = async () => {
    if (!employee) return;

    try {
      const startOfYear = `${new Date().getFullYear()}-01-01`;
      const endOfYear = `${new Date().getFullYear()}-12-31`;

      const { data } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("status", "approved")
        .gte("start_date", startOfYear)
        .lte("end_date", endOfYear);

      if (data) {
        const summary = { sick: 0, personal: 0, annual: 0 };
        data.forEach((leave: any) => {
          const days = calculateDays(leave.start_date, leave.end_date, leave.is_half_day);
          if (leave.leave_type === "sick") summary.sick += days;
          else if (leave.leave_type === "personal") summary.personal += days;
          else if (leave.leave_type === "annual") summary.annual += days;
        });
        setLeaveSummary(summary);
      }
    } catch (error) {
      console.error("Error fetching leave summary:", error);
    }
  };

  const calculateDays = (startDate: string, endDate: string, isHalfDay: boolean) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return isHalfDay ? 0.5 : diffDays;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("ไฟล์ใหญ่เกิน 5MB");
        return;
      }
      setFormData({ ...formData, attachmentFile: file });
      setError("");
    }
  };

  const uploadAttachment = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${employee?.id}-${Date.now()}.${fileExt}`;
    const filePath = `leave-attachments/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("attendance-photos")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("attendance-photos")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    // Validate dates
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      setError("วันสิ้นสุดต้องมากกว่าหรือเท่ากับวันเริ่มต้น");
      return;
    }

    // ตรวจสอบว่าไม่ใช่วันในอดีต
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(formData.startDate) < today) {
      setError("ไม่สามารถขอลาย้อนหลังได้");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // ตรวจสอบว่ามีคำขอลาในช่วงวันเดียวกันหรือไม่
      const { data: existingLeave } = await supabase
        .from("leave_requests")
        .select("id")
        .eq("employee_id", employee.id)
        .in("status", ["pending", "approved"])
        .or(`start_date.lte.${formData.endDate},end_date.gte.${formData.startDate}`);

      if (existingLeave && existingLeave.length > 0) {
        setError("คุณมีคำขอลาในช่วงวันนี้แล้ว");
        setLoading(false);
        return;
      }

      let attachmentUrl = null;

      // Upload attachment if exists
      if (formData.attachmentFile) {
        setUploading(true);
        attachmentUrl = await uploadAttachment(formData.attachmentFile);
        setUploading(false);
      }

      // Insert leave request
      const { error: insertError } = await supabase.from("leave_requests").insert({
        employee_id: employee.id,
        leave_type: formData.leaveType,
        start_date: formData.startDate,
        end_date: formData.endDate,
        is_half_day: formData.isHalfDay,
        reason: formData.reason,
        attachment_url: attachmentUrl,
        status: "pending",
      });

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => router.push("/"), 2000);
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center p-6">
        <div className="text-center animate-scale-in">
          <div className="w-20 h-20 bg-[#34c759] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>
          <h2 className="text-[28px] font-semibold text-[#1d1d1f] mb-2">
            ส่งคำขอสำเร็จ
          </h2>
          <p className="text-[17px] text-[#86868b]">
            รอการอนุมัติจากหัวหน้างาน
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbfd]">
      {/* Header */}
      <header className="sticky top-0 z-50 apple-glass border-b border-[#d2d2d7]/30">
        <div className="max-w-[600px] mx-auto px-6 h-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#0071e3]">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-[15px]">กลับ</span>
          </Link>
          <span className="text-[15px] font-medium text-[#1d1d1f]">ขอลา</span>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-[600px] mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-[32px] font-semibold text-[#1d1d1f] mb-2">
            ขอลางาน
          </h1>
          <p className="text-[15px] text-[#86868b]">
            กรอกข้อมูลเพื่อส่งคำขอลา
          </p>
        </div>

        {/* Leave Summary */}
        <Card elevated className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[#0071e3]" />
            <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
              สรุปการลาปีนี้
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center py-3 bg-[#ff3b30]/10 rounded-xl border border-[#ff3b30]/20">
              <p className="text-[24px] font-semibold text-[#ff3b30]">
                {leaveQuota.sick - leaveSummary.sick}
              </p>
              <p className="text-[12px] text-[#86868b]">ลาป่วยเหลือ (วัน)</p>
              <p className="text-[11px] text-[#ff3b30] mt-1">
                ใช้ {leaveSummary.sick} / {leaveQuota.sick}
              </p>
            </div>
            <div className="text-center py-3 bg-[#ff9500]/10 rounded-xl border border-[#ff9500]/20">
              <p className="text-[24px] font-semibold text-[#ff9500]">
                {leaveQuota.personal - leaveSummary.personal}
              </p>
              <p className="text-[12px] text-[#86868b]">ลากิจเหลือ (วัน)</p>
              <p className="text-[11px] text-[#ff9500] mt-1">
                ใช้ {leaveSummary.personal} / {leaveQuota.personal}
              </p>
            </div>
            <div className="text-center py-3 bg-[#34c759]/10 rounded-xl border border-[#34c759]/20">
              <p className="text-[24px] font-semibold text-[#34c759]">
                {leaveQuota.annual - leaveSummary.annual}
              </p>
              <p className="text-[12px] text-[#86868b]">พักร้อนเหลือ (วัน)</p>
              <p className="text-[11px] text-[#34c759] mt-1">
                ใช้ {leaveSummary.annual} / {leaveQuota.annual}
              </p>
            </div>
          </div>
          <p className="text-[13px] text-[#86868b] text-center mt-3">
            สิทธิ์การลาประจำปี {new Date().getFullYear()}
          </p>
        </Card>

        <form onSubmit={handleSubmit}>
          <Card elevated>
            <div className="space-y-5">
              {/* Leave Type */}
              <div>
                <label className="flex items-center gap-2 text-[15px] font-medium text-[#1d1d1f] mb-3">
                  <FileText className="w-4 h-4 text-[#86868b]" />
                  ประเภทการลา
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {leaveTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, leaveType: type.value })
                      }
                      className={`
                        px-4 py-3 rounded-xl text-[15px] font-medium transition-all
                        ${formData.leaveType === type.value
                          ? "bg-[#0071e3] text-white ring-4 ring-[#0071e3]/20"
                          : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]"
                        }
                      `}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Half Day */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#f5f5f7] rounded-xl">
                <span className="text-[15px] font-medium text-[#1d1d1f]">
                  ลาครึ่งวัน
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, isHalfDay: !formData.isHalfDay })
                  }
                  className={`
                    relative w-12 h-7 rounded-full transition-colors
                    ${formData.isHalfDay ? "bg-[#34c759]" : "bg-[#d2d2d7]"}
                  `}
                >
                  <span
                    className={`
                      absolute top-1 w-5 h-5 bg-white rounded-full transition-transform
                      ${formData.isHalfDay ? "right-1" : "left-1"}
                    `}
                  />
                </button>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-[15px] font-medium text-[#1d1d1f] mb-2">
                    <Calendar className="w-4 h-4 text-[#86868b]" />
                    เริ่มต้น
                  </label>
                  <DateInput
                    value={formData.startDate}
                    onChange={(val) => setFormData({ ...formData, startDate: val })}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-[15px] font-medium text-[#1d1d1f] mb-2">
                    <Calendar className="w-4 h-4 text-[#86868b]" />
                    สิ้นสุด
                  </label>
                  <DateInput
                    value={formData.endDate}
                    onChange={(val) => setFormData({ ...formData, endDate: val })}
                    min={formData.startDate}
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="flex items-center gap-2 text-[15px] font-medium text-[#1d1d1f] mb-2">
                  <FileText className="w-4 h-4 text-[#86868b]" />
                  เหตุผล
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  rows={4}
                  className="w-full px-4 py-3.5 text-[17px] bg-[#f5f5f7] rounded-xl border-0 focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all resize-none"
                  placeholder="ระบุเหตุผลการลา"
                  required
                />
              </div>

              {/* Attachment */}
              <div>
                <label className="flex items-center gap-2 text-[15px] font-medium text-[#1d1d1f] mb-2">
                  <Upload className="w-4 h-4 text-[#86868b]" />
                  แนบเอกสาร (ถ้ามี)
                  <span className="text-[#86868b] font-normal">
                    ใบรับรองแพทย์, หนังสือรับรอง
                  </span>
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="w-full px-4 py-3.5 text-[15px] bg-[#f5f5f7] rounded-xl border-0 focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[14px] file:font-semibold file:bg-[#0071e3] file:text-white hover:file:bg-[#0077ed]"
                />
                {formData.attachmentFile && (
                  <p className="text-[13px] text-[#34c759] mt-2">
                    ✓ {formData.attachmentFile.name}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-[#ff3b30]/10 rounded-xl mt-6">
              <AlertCircle className="w-5 h-5 text-[#ff3b30]" />
              <span className="text-[15px] text-[#ff3b30]">{error}</span>
            </div>
          )}

          {/* Submit */}
          <div className="mt-6">
            <Button
              type="submit"
              fullWidth
              loading={loading || uploading}
              size="lg"
            >
              {uploading ? "กำลังอัปโหลดเอกสาร..." : "ส่งคำขอลา"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function LeaveRequestPage() {
  return (
    <ProtectedRoute>
      <LeaveRequestContent />
    </ProtectedRoute>
  );
}

