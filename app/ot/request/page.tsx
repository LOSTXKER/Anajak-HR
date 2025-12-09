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
import { ArrowLeft, Calendar, Clock, FileText, CheckCircle, AlertCircle, PartyPopper } from "lucide-react";
import { isHoliday, getOTRate } from "@/lib/utils/holiday";

function OTRequestContent() {
  const { employee } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [holidayInfo, setHolidayInfo] = useState<any>(null);
  const [estimatedRate, setEstimatedRate] = useState<number>(1.5);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    startTime: "18:00",
    endTime: "21:00",
    reason: "",
  });

  // Check if selected date is a holiday
  useEffect(() => {
    checkHoliday();
  }, [formData.date, employee]);

  const checkHoliday = async () => {
    if (!formData.date) return;

    const holiday = await isHoliday(formData.date, employee?.branch_id || undefined);
    setHolidayInfo(holiday);

    // Get estimated OT rate
    const rateInfo = await getOTRate("normal", formData.date, employee?.branch_id || undefined, {
      ot_rate_1x: employee?.ot_rate_1x ?? undefined,
      ot_rate_1_5x: employee?.ot_rate_1_5x ?? undefined,
      ot_rate_2x: employee?.ot_rate_2x ?? undefined,
    });
    setEstimatedRate(rateInfo.rate);
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
              {/* Date */}
              <div>
                <label className="flex items-center gap-2 text-[15px] font-medium text-[#1d1d1f] mb-2">
                  <Calendar className="w-4 h-4 text-[#86868b]" />
                  วันที่
                </label>
                <DateInput
                  value={formData.date}
                  onChange={(val) => setFormData({ ...formData, date: val })}
                  min={new Date().toISOString().split("T")[0]}
                />

                {/* Holiday Alert */}
                {holidayInfo && (
                  <div className="mt-3 flex items-center gap-3 p-4 bg-[#ff3b30]/10 rounded-xl">
                    <PartyPopper className="w-5 h-5 text-[#ff3b30] flex-shrink-0" />
                    <div>
                      <p className="text-[14px] font-medium text-[#ff3b30]">
                        {holidayInfo.name}
                      </p>
                      <p className="text-[13px] text-[#ff3b30]/80">
                        OT ในวันหยุด จะได้รับอัตรา {estimatedRate}x
                      </p>
                    </div>
                  </div>
                )}

                {/* OT Rate Info */}
                {!holidayInfo && (
                  <div className="mt-3 flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
                    <span className="text-[13px] text-[#86868b]">อัตรา OT</span>
                    <Badge variant="info">{estimatedRate}x</Badge>
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
