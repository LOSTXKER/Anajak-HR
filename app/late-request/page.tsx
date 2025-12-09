"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DateInput } from "@/components/ui/DateInput";
import { 
  Clock, 
  ArrowLeft, 
  Send, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  FileText,
} from "lucide-react";
import { format, subDays, addDays } from "date-fns";
import { th } from "date-fns/locale";

interface LateRequest {
  id: string;
  request_date: string;
  reason: string;
  status: string;
  actual_late_minutes: number | null;
  admin_note: string | null;
  created_at: string;
}

interface AttendanceLog {
  id: string;
  work_date: string;
  clock_in_time: string;
  is_late: boolean;
  late_minutes: number | null;
}

function LateRequestContent() {
  const router = useRouter();
  const { employee } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<LateRequest[]>([]);
  const [lateAttendances, setLateAttendances] = useState<AttendanceLog[]>([]);
  
  // Form
  const [selectedDate, setSelectedDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (employee) {
      fetchData();
    }
  }, [employee]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // ดึงคำขอมาสายของตัวเอง
      const { data: requestsData } = await supabase
        .from("late_requests")
        .select("*")
        .eq("employee_id", employee!.id)
        .order("created_at", { ascending: false })
        .limit(20);

      setRequests(requestsData || []);

      // ดึงวันที่มาสายใน 30 วันที่ผ่านมา (ที่ยังไม่มี approved late request)
      const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
      const { data: attendanceData } = await supabase
        .from("attendance_logs")
        .select("id, work_date, clock_in_time, is_late, late_minutes")
        .eq("employee_id", employee!.id)
        .eq("is_late", true)
        .gte("work_date", thirtyDaysAgo)
        .order("work_date", { ascending: false });

      // กรองเอาเฉพาะวันที่ยังไม่มี approved request
      const approvedDates = new Set(
        (requestsData || [])
          .filter((r: any) => r.status === "approved" || r.status === "pending")
          .map((r: any) => r.request_date)
      );
      
      const filteredAttendance = (attendanceData || []).filter(
        (a: any) => !approvedDates.has(a.work_date)
      );

      setLateAttendances(filteredAttendance);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !reason.trim()) {
      setError("กรุณาเลือกวันที่และระบุเหตุผล");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // ดึงข้อมูล late_minutes จาก attendance
      const attendance = lateAttendances.find((a: any) => a.work_date === selectedDate);
      
      const { error: insertError } = await supabase
        .from("late_requests")
        .insert({
          employee_id: employee!.id,
          request_date: selectedDate,
          reason: reason.trim(),
          actual_late_minutes: attendance?.late_minutes || null,
        });

      if (insertError) throw insertError;

      setSuccess(true);
      setSelectedDate("");
      setReason("");
      fetchData();

      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      setError(error.message || "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const { error } = await supabase
        .from("late_requests")
        .update({ status: "cancelled" })
        .eq("id", id)
        .eq("employee_id", employee!.id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error("Error cancelling:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="success">อนุมัติแล้ว</Badge>;
      case "rejected":
        return <Badge variant="danger">ไม่อนุมัติ</Badge>;
      case "cancelled":
        return <Badge variant="default">ยกเลิก</Badge>;
      default:
        return <Badge variant="warning">รออนุมัติ</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <div className="bg-white border-b border-[#e8e8ed] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-[#f5f5f7] rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#1d1d1f]" />
            </button>
            <div>
              <h1 className="text-[21px] font-semibold text-[#1d1d1f]">ขอมาสาย</h1>
              <p className="text-[13px] text-[#86868b]">ส่งคำขอเมื่อมีเหตุจำเป็น</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Success Message */}
        {success && (
          <div className="flex items-center gap-3 p-4 bg-[#34c759]/10 rounded-xl border border-[#34c759]/30">
            <CheckCircle className="w-5 h-5 text-[#34c759]" />
            <span className="text-[15px] text-[#34c759]">ส่งคำขอเรียบร้อยแล้ว</span>
          </div>
        )}

        {/* Form */}
        <Card elevated>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#ff9500]" />
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">ส่งคำขอมาสาย</h2>
              <p className="text-[13px] text-[#86868b]">เลือกวันที่มาสายและระบุเหตุผล</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date Selection */}
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                เลือกวันที่มาสาย
              </label>
              {lateAttendances.length > 0 ? (
                <div className="space-y-2">
                  {lateAttendances.map((att) => (
                    <label
                      key={att.id}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                        selectedDate === att.work_date
                          ? "bg-[#ff9500]/10 border-2 border-[#ff9500]"
                          : "bg-[#f5f5f7] border-2 border-transparent hover:border-[#d2d2d7]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="date"
                          value={att.work_date}
                          checked={selectedDate === att.work_date}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-4 h-4"
                        />
                        <div>
                          <p className="text-[14px] font-medium text-[#1d1d1f]">
                            {format(new Date(att.work_date), "EEEE d MMMM yyyy", { locale: th })}
                          </p>
                          <p className="text-[12px] text-[#86868b]">
                            เข้างาน: {format(new Date(att.clock_in_time), "HH:mm")} น.
                          </p>
                        </div>
                      </div>
                      <span className="text-[14px] font-medium text-[#ff9500]">
                        สาย {att.late_minutes || "?"} นาที
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-[#f5f5f7] rounded-xl text-center">
                  <CheckCircle className="w-8 h-8 text-[#34c759] mx-auto mb-2" />
                  <p className="text-[14px] text-[#86868b]">ไม่มีวันที่มาสายที่ต้องขออนุมัติ</p>
                </div>
              )}
            </div>

            {/* Manual Date Input */}
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                หรือระบุวันที่เอง (สำหรับขอล่วงหน้า)
              </label>
              <DateInput
                value={selectedDate}
                onChange={setSelectedDate}
                max={format(addDays(new Date(), 7), "yyyy-MM-dd")}
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                เหตุผล
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="เช่น รถติด, ไปหาหมอ, มีธุระส่วนตัว..."
                rows={3}
                className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#ff9500]/20 transition-all resize-none"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-[#ff3b30] text-[14px]">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              loading={submitting}
              disabled={!selectedDate || !reason.trim()}
              fullWidth
              icon={<Send className="w-5 h-5" />}
            >
              ส่งคำขอ
            </Button>
          </form>
        </Card>

        {/* History */}
        <Card elevated>
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">ประวัติคำขอ</h3>
          
          {requests.length === 0 ? (
            <p className="text-center text-[#86868b] py-8">ยังไม่มีคำขอ</p>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 bg-[#f5f5f7] rounded-xl"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-[15px] font-medium text-[#1d1d1f]">
                        {format(new Date(req.request_date), "d MMMM yyyy", { locale: th })}
                      </p>
                      <p className="text-[13px] text-[#86868b]">{req.reason}</p>
                    </div>
                    {getStatusBadge(req.status)}
                  </div>
                  
                  {req.actual_late_minutes && (
                    <p className="text-[12px] text-[#ff9500]">
                      สาย {req.actual_late_minutes} นาที
                    </p>
                  )}
                  
                  {req.admin_note && (
                    <p className="text-[12px] text-[#86868b] mt-2 p-2 bg-white rounded-lg">
                      หมายเหตุ: {req.admin_note}
                    </p>
                  )}

                  {req.status === "pending" && (
                    <button
                      onClick={() => handleCancel(req.id)}
                      className="mt-2 text-[13px] text-[#ff3b30] hover:underline"
                    >
                      ยกเลิกคำขอ
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function LateRequestPage() {
  return (
    <ProtectedRoute>
      <LateRequestContent />
    </ProtectedRoute>
  );
}

