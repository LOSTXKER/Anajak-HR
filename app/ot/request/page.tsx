"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TimeInput } from "@/components/ui/TimeInput";
import { DateInput } from "@/components/ui/DateInput";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, Calendar, Clock, FileText, CheckCircle, AlertCircle, PartyPopper, Sun, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { getOTRateForDate } from "@/lib/utils/holiday";

function OTRequestContent() {
  const { employee } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [dayInfo, setDayInfo] = useState<{
    rate: number;
    type: "holiday" | "weekend" | "workday";
    typeName: string;
    requireCheckin: boolean;
    holidayName?: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "18:00",
    endTime: "21:00",
    reason: "",
    otType: "normal", // "normal" | "pre_shift"
  });

  // Check day type (holiday, weekend, or workday)
  useEffect(() => {
    checkDayType();
  }, [formData.date, employee]);

  const checkDayType = async () => {
    if (!formData.date) return;

    const info = await getOTRateForDate(formData.date, employee?.branch_id || undefined);
    setDayInfo(info);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    setLoading(true);
    setError("");

    try {
      const requestDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // ตรวจสอบว่าไม่ใช่วันในอดีต
      if (requestDate < today) {
        setError("ไม่สามารถขอ OT ย้อนหลังได้");
        setLoading(false);
        return;
      }

      const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`);

      if (endDateTime <= startDateTime) {
        setError("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น");
        setLoading(false);
        return;
      }

      // ตรวจสอบ OT ที่ซ้ำซ้อน (pending หรือ approved)
      const { data: existingOT } = await supabase
        .from("ot_requests")
        .select("id")
        .eq("employee_id", employee.id)
        .eq("request_date", formData.date)
        .in("status", ["pending", "approved"]);

      if (existingOT && existingOT.length > 0) {
        setError("คุณมีคำขอ OT ในวันนี้แล้ว");
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from("ot_requests").insert({
        employee_id: employee.id,
        ot_type: formData.otType,
        request_date: formData.date,
        requested_start_time: startDateTime.toISOString(),
        requested_end_time: endDateTime.toISOString(),
        reason: formData.reason,
        status: "pending",
      });

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => router.push("/"), 2000);
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center p-6">
        <div className="text-center animate-scale-in">
          <div className="w-20 h-20 bg-[#ff9500] rounded-full flex items-center justify-center mx-auto mb-6">
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
          <span className="text-[15px] font-medium text-[#1d1d1f]">ขอ OT</span>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-[600px] mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-[32px] font-semibold text-[#1d1d1f] mb-2">
            ขอทำงานล่วงเวลา
          </h1>
          <p className="text-[15px] text-[#86868b]">
            กรอกข้อมูลเพื่อส่งคำขอ OT
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card elevated>
            <div className="space-y-5">
              {/* OT Type */}
              <div>
                <label className="flex items-center gap-2 text-[15px] font-medium text-[#1d1d1f] mb-3">
                  <Clock className="w-4 h-4 text-[#86868b]" />
                  ประเภท OT
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, otType: "normal", startTime: "18:00", endTime: "21:00" });
                    }}
                    className={`px-4 py-3 rounded-xl text-[15px] font-medium transition-all ${
                      formData.otType === "normal"
                        ? "bg-[#0071e3] text-white ring-4 ring-[#0071e3]/20"
                        : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]"
                    }`}
                  >
                    <div>
                      <p className="font-semibold">OT ปกติ</p>
                      <p className="text-xs opacity-70 mt-1">หลังเวลางาน</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, otType: "pre_shift", startTime: "06:00", endTime: "09:00" });
                    }}
                    className={`px-4 py-3 rounded-xl text-[15px] font-medium transition-all ${
                      formData.otType === "pre_shift"
                        ? "bg-[#ff9500] text-white ring-4 ring-[#ff9500]/20"
                        : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]"
                    }`}
                  >
                    <div>
                      <p className="font-semibold">Pre-shift OT</p>
                      <p className="text-xs opacity-70 mt-1">ก่อนเวลางาน</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="flex items-center gap-2 text-[15px] font-medium text-[#1d1d1f] mb-2">
                  <Calendar className="w-4 h-4 text-[#86868b]" />
                  วันที่
                </label>
                <DateInput
                  value={formData.date}
                  onChange={(val) => setFormData({ ...formData, date: val })}
                  min={format(new Date(), "yyyy-MM-dd")}
                />

                {/* Day Type Info */}
                {dayInfo && (
                  <div className={`mt-3 p-4 rounded-xl ${dayInfo.type === "holiday"
                    ? "bg-[#ff3b30]/10 border border-[#ff3b30]/20"
                    : dayInfo.type === "weekend"
                      ? "bg-[#ff9500]/10 border border-[#ff9500]/20"
                      : "bg-[#0071e3]/10 border border-[#0071e3]/20"
                    }`}>
                    <div className="flex items-center gap-3">
                      {dayInfo.type === "holiday" ? (
                        <PartyPopper className="w-5 h-5 text-[#ff3b30] flex-shrink-0" />
                      ) : dayInfo.type === "weekend" ? (
                        <Sun className="w-5 h-5 text-[#ff9500] flex-shrink-0" />
                      ) : (
                        <Briefcase className="w-5 h-5 text-[#0071e3] flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className={`text-[14px] font-medium ${dayInfo.type === "holiday"
                            ? "text-[#ff3b30]"
                            : dayInfo.type === "weekend"
                              ? "text-[#ff9500]"
                              : "text-[#0071e3]"
                            }`}>
                            {dayInfo.type === "holiday"
                              ? `🎉 ${dayInfo.holidayName}`
                              : dayInfo.type === "weekend"
                                ? "🌅 วันหยุดสุดสัปดาห์"
                                : "📋 วันทำงานปกติ"}
                          </p>
                          <Badge variant={
                            dayInfo.type === "holiday"
                              ? "danger"
                              : dayInfo.type === "weekend"
                                ? "warning"
                                : "info"
                          }>
                            {dayInfo.rate}x
                          </Badge>
                        </div>
                        <p className={`text-[13px] mt-1 ${dayInfo.type === "holiday"
                          ? "text-[#ff3b30]/80"
                          : dayInfo.type === "weekend"
                            ? "text-[#ff9500]/80"
                            : "text-[#0071e3]/80"
                          }`}>
                          {dayInfo.requireCheckin
                            ? "⚠️ ต้องเช็คอินก่อนเริ่ม OT"
                            : "✅ ไม่ต้องเช็คอินก่อน"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-4">
                <TimeInput
                  label="เริ่ม"
                  value={formData.startTime}
                  onChange={(val) => setFormData({ ...formData, startTime: val })}
                />
                <TimeInput
                  label="สิ้นสุด"
                  value={formData.endTime}
                  onChange={(val) => setFormData({ ...formData, endTime: val })}
                />
              </div>

              {/* Reason */}
              <div>
                <label className="flex items-center gap-2 text-[15px] font-medium text-[#1d1d1f] mb-2">
                  <FileText className="w-4 h-4 text-[#86868b]" />
                  เหตุผล
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3.5 text-[17px] bg-[#f5f5f7] rounded-xl border-0 focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all resize-none"
                  placeholder="ระบุเหตุผลในการขอ OT"
                  required
                />
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
              loading={loading}
              size="lg"
            >
              ส่งคำขอ OT
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function OTRequestPage() {
  return (
    <ProtectedRoute>
      <OTRequestContent />
    </ProtectedRoute>
  );
}
