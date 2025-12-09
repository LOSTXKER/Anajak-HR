"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DateInput } from "@/components/ui/DateInput";
import { ArrowLeft, Calendar, FileText, CheckCircle, AlertCircle, Home } from "lucide-react";

function WFHRequestContent() {
  const { employee } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    isHalfDay: false,
    reason: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    // ตรวจสอบว่าไม่ใช่วันในอดีต
    const requestDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (requestDate < today) {
      setError("ไม่สามารถขอ WFH ย้อนหลังได้");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // ตรวจสอบว่ามีคำขอ WFH ในวันเดียวกันหรือไม่
      const { data: existingWFH } = await supabase
        .from("wfh_requests")
        .select("id")
        .eq("employee_id", employee.id)
        .eq("date", formData.date)
        .in("status", ["pending", "approved"]);
        
      if (existingWFH && existingWFH.length > 0) {
        setError("คุณมีคำขอ WFH ในวันนี้แล้ว");
        setLoading(false);
        return;
      }
      
      const { error: insertError } = await supabase.from("wfh_requests").insert({
        employee_id: employee.id,
        date: formData.date,
        is_half_day: formData.isHalfDay,
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
          <div className="w-20 h-20 bg-[#0071e3] rounded-full flex items-center justify-center mx-auto mb-6">
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
          <span className="text-[15px] font-medium text-[#1d1d1f]">ขอ WFH</span>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-[600px] mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#0071e3]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Home className="w-8 h-8 text-[#0071e3]" />
          </div>
          <h1 className="text-[32px] font-semibold text-[#1d1d1f] mb-2">
            ขอทำงานที่บ้าน
          </h1>
          <p className="text-[15px] text-[#86868b]">
            Work From Home
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card elevated>
            <div className="space-y-5">
              {/* Date */}
              <div>
                <label className="flex items-center gap-2 text-[15px] font-medium text-[#1d1d1f] mb-2">
                  <Calendar className="w-4 h-4 text-[#86868b]" />
                  วันที่ต้องการ WFH
                </label>
                <DateInput
                  value={formData.date}
                  onChange={(val) => setFormData({ ...formData, date: val })}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              {/* Half Day */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#f5f5f7] rounded-xl">
                <div>
                  <span className="text-[15px] font-medium text-[#1d1d1f] block mb-1">
                    WFH ครึ่งวัน
                  </span>
                  <span className="text-[13px] text-[#86868b]">
                    เช้าหรือบ่าย
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, isHalfDay: !formData.isHalfDay })
                  }
                  className={`
                    relative w-12 h-7 rounded-full transition-colors
                    ${formData.isHalfDay ? "bg-[#0071e3]" : "bg-[#d2d2d7]"}
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
                  placeholder="ระบุเหตุผลการขอ WFH"
                  required
                />
              </div>

              {/* Info Box */}
              <div className="bg-[#0071e3]/10 rounded-xl p-4">
                <p className="text-[14px] text-[#0071e3] leading-relaxed">
                  <strong>หมายเหตุ:</strong> เมื่อได้รับอนุมัติแล้ว ในวันที่ทำงานที่บ้านคุณยังคงต้องเช็คอิน-เช็คเอาท์ตามปกติ แต่ไม่ต้องเปิด GPS
                </p>
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
              ส่งคำขอ WFH
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function WFHRequestPage() {
  return (
    <ProtectedRoute>
      <WFHRequestContent />
    </ProtectedRoute>
  );
}

