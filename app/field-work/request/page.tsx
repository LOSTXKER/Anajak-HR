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
import { X, Calendar, FileText, CheckCircle, AlertCircle, MapPin, Info } from "lucide-react";
import { format } from "date-fns";

function FieldWorkRequestContent() {
  const { employee } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Admin is system account - redirect to admin panel
  useEffect(() => {
    if (employee?.role === "admin") {
      router.replace("/admin");
    }
  }, [employee, router]);

  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    isHalfDay: false,
    location: "",
    reason: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    // Validation
    if (!formData.location.trim()) {
      setError("กรุณาระบุสถานที่");
      return;
    }

    if (!formData.reason.trim()) {
      setError("กรุณาระบุเหตุผล");
      return;
    }

    // ตรวจสอบว่าไม่ใช่วันในอดีต
    const requestDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (requestDate < today) {
      setError("ไม่สามารถขอทำงานนอกสถานที่ย้อนหลังได้");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // ตรวจสอบว่ามีคำขอในวันเดียวกันหรือไม่
      const { data: existingRequest } = await supabase
        .from("field_work_requests")
        .select("id")
        .eq("employee_id", employee.id)
        .eq("date", formData.date)
        .in("status", ["pending", "approved"]);

      if (existingRequest && existingRequest.length > 0) {
        setError("คุณมีคำขอทำงานนอกสถานที่ในวันนี้แล้ว");
        setLoading(false);
        return;
      }

      // Check auto approve setting
      const { data: autoApproveSetting } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "auto_approve_field_work")
        .single();

      const isAutoApprove = autoApproveSetting?.setting_value === "true";

      const insertData: any = {
        employee_id: employee.id,
        date: formData.date,
        is_half_day: formData.isHalfDay,
        location: formData.location.trim(),
        reason: formData.reason.trim(),
        status: isAutoApprove ? "approved" : "pending",
      };

      if (isAutoApprove) {
        insertData.approved_at = new Date().toISOString();
        const { data: systemUser } = await supabase
          .from("employees")
          .select("id")
          .eq("email", "system@anajak.com")
          .single();
        if (systemUser) insertData.approved_by = systemUser.id;
      }

      const { error: insertError } = await supabase.from("field_work_requests").insert(insertData);

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
    <div className="min-h-screen bg-[#fbfbfd] pt-safe">
      <main className="max-w-[600px] mx-auto px-4 pt-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
              <MapPin className="w-6 h-6 text-[#ff9500]" />
            </div>
            <div>
              <h1 className="text-[24px] font-bold text-[#1d1d1f]">งานนอกสถานที่</h1>
              <p className="text-[14px] text-[#86868b]">ส่งคำขอล่วงหน้า</p>
            </div>
          </div>
          <Link
            href="/"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-colors active:scale-95"
          >
            <X className="w-5 h-5 text-[#86868b]" />
          </Link>
        </div>

        {/* Content */}
        <div>
        <Card elevated>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-[#ff9500]" />
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
                รายละเอียดการทำงานนอกสถานที่
              </h2>
              <p className="text-[13px] text-[#86868b]">
                ระบุสถานที่และเหตุผลในการทำงานภายนอก
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date */}
            <div>
              <label className="flex items-center gap-2 text-[15px] font-medium text-[#1d1d1f] mb-2">
                <Calendar className="w-4 h-4" />
                วันที่
              </label>
              <DateInput
                value={formData.date}
                onChange={(val) => setFormData({ ...formData, date: val })}
                min={format(new Date(), "yyyy-MM-dd")}
              />
            </div>

            {/* Half Day */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isHalfDay}
                  onChange={(e) =>
                    setFormData({ ...formData, isHalfDay: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/20"
                />
                <span className="text-[15px] text-[#1d1d1f]">
                  ครึ่งวัน
                </span>
              </label>
            </div>

            {/* Location */}
            <div>
              <label className="flex items-center gap-2 text-[15px] font-medium text-[#1d1d1f] mb-2">
                <MapPin className="w-4 h-4" />
                สถานที่ / ที่อยู่
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="เช่น โรงพยาบาลกรุงเทพ, บริษัทลูกค้า XYZ, งานแสดงสินค้า ณ BITEC"
                className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="flex items-center gap-2 text-[15px] font-medium text-[#1d1d1f] mb-2">
                <FileText className="w-4 h-4" />
                เหตุผล
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                rows={4}
                placeholder="เช่น ประชุมลูกค้า, ติดตั้งระบบที่สาขา, ร่วมงานแสดงสินค้า..."
                className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all resize-none"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-[#ff3b30]/10 border border-[#ff3b30]/30 rounded-xl">
                <AlertCircle className="w-5 h-5 text-[#ff3b30] flex-shrink-0 mt-0.5" />
                <span className="text-[14px] text-[#ff3b30]">{error}</span>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              loading={loading}
              disabled={!formData.location.trim() || !formData.reason.trim()}
              fullWidth
            >
              ส่งคำขอ
            </Button>
          </form>
        </Card>

        {/* Info Card */}
        <Card className="mt-4 bg-[#f5f5f7] border-none">
          <p className="text-[13px] text-[#86868b] leading-relaxed flex items-start gap-1">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span><strong>หมายเหตุ:</strong> ทำงานนอกสถานที่จะไม่ถูกตรวจสอบตำแหน่ง GPS เมื่อเช็คอินเข้างาน
            แต่ต้องได้รับการอนุมัติจากหัวหน้างานล่วงหน้า</span>
          </p>
        </Card>
        </div>
      </main>
    </div>
  );
}

export default function FieldWorkRequestPage() {
  return (
    <ProtectedRoute>
      <FieldWorkRequestContent />
    </ProtectedRoute>
  );
}

