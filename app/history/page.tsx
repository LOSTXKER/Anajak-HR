"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  ArrowLeft,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  ExternalLink,
  Camera,
  X,
  Trash2,
  Sun,
  Home,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { th } from "date-fns/locale";

type TabType = "attendance" | "leave" | "wfh";

const leaveTypeLabels: Record<string, { label: string; color: string }> = {
  sick: { label: "ลาป่วย", color: "text-[#ff3b30] bg-[#ff3b30]/10" },
  personal: { label: "ลากิจ", color: "text-[#ff9500] bg-[#ff9500]/10" },
  annual: { label: "ลาพักร้อน", color: "text-[#34c759] bg-[#34c759]/10" },
  maternity: { label: "ลาคลอด", color: "text-[#af52de] bg-[#af52de]/10" },
  military: { label: "ลากรณีทหาร", color: "text-[#0071e3] bg-[#0071e3]/10" },
  other: { label: "อื่นๆ", color: "text-[#86868b] bg-[#86868b]/10" },
};

function HistoryContent() {
  const { employee } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("attendance");
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [wfhRequests, setWfhRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewingPhoto, setViewingPhoto] = useState<{ url: string; type: string } | null>(null);
  const [canceling, setCanceling] = useState<string | null>(null);

  useEffect(() => {
    if (employee) fetchHistory();
  }, [employee, currentMonth, activeTab]);

  const fetchHistory = async () => {
    if (!employee) return;
    setLoading(true);

    try {
      const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      if (activeTab === "attendance") {
        const { data } = await supabase
          .from("attendance_logs")
          .select("*")
          .eq("employee_id", employee.id)
          .gte("work_date", startDate)
          .lte("work_date", endDate)
          .order("work_date", { ascending: false });
        setAttendance(data || []);
      } else if (activeTab === "leave") {
        const { data } = await supabase
          .from("leave_requests")
          .select("*")
          .eq("employee_id", employee.id)
          .gte("start_date", startDate)
          .lte("end_date", endDate)
          .order("created_at", { ascending: false });
        setLeaveRequests(data || []);
      } else if (activeTab === "wfh") {
        const { data } = await supabase
          .from("wfh_requests")
          .select("*")
          .eq("employee_id", employee.id)
          .gte("date", startDate)
          .lte("date", endDate)
          .order("created_at", { ascending: false });
        setWfhRequests(data || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const attendanceStats = {
    total: attendance.length,
    normal: attendance.filter((a) => !a.is_late && a.status !== "holiday").length,
    late: attendance.filter((a) => a.is_late).length,
    holiday: attendance.filter((a) => a.status === "holiday").length,
    hours: attendance.reduce((sum, a) => sum + (a.total_hours || 0), 0),
  };

  const leaveStats = {
    total: leaveRequests.length,
    pending: leaveRequests.filter((l) => l.status === "pending").length,
    approved: leaveRequests.filter((l) => l.status === "approved").length,
    rejected: leaveRequests.filter((l) => l.status === "rejected").length,
  };

  const wfhStats = {
    total: wfhRequests.length,
    pending: wfhRequests.filter((w) => w.status === "pending").length,
    approved: wfhRequests.filter((w) => w.status === "approved").length,
    rejected: wfhRequests.filter((w) => w.status === "rejected").length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="warning">รออนุมัติ</Badge>;
      case "approved":
        return <Badge variant="success">อนุมัติแล้ว</Badge>;
      case "rejected":
        return <Badge variant="danger">ปฏิเสธ</Badge>;
      case "cancelled":
        return <Badge variant="default">ยกเลิก</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const calculateDays = (startDate: string, endDate: string, isHalfDay: boolean) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return isHalfDay ? 0.5 : diffDays;
  };

  const handleCancelLeave = async (id: string) => {
    if (!confirm("ต้องการยกเลิกคำขอลานี้ใช่หรือไม่?")) return;
    if (!employee) return;
    
    setCanceling(id);
    try {
      const { error } = await supabase
        .from("leave_requests")
        .update({ status: "cancelled" })
        .eq("id", id)
        .eq("employee_id", employee.id)
        .eq("status", "pending");
      
      if (error) throw error;
      fetchHistory();
    } catch (error: any) {
      console.error("Error canceling leave:", error);
      alert(error?.message || "ไม่สามารถยกเลิกคำขอได้");
    } finally {
      setCanceling(null);
    }
  };

  const handleCancelWFH = async (id: string) => {
    if (!confirm("ต้องการยกเลิกคำขอ WFH นี้ใช่หรือไม่?")) return;
    if (!employee) return;
    
    setCanceling(id);
    try {
      const { error } = await supabase
        .from("wfh_requests")
        .update({ status: "cancelled" })
        .eq("id", id)
        .eq("employee_id", employee.id)
        .eq("status", "pending");
      
      if (error) throw error;
      fetchHistory();
    } catch (error: any) {
      console.error("Error canceling WFH:", error);
      alert(error?.message || "ไม่สามารถยกเลิกคำขอได้");
    } finally {
      setCanceling(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfbfd]">
      {/* Header */}
      <header className="sticky top-0 z-50 apple-glass border-b border-[#d2d2d7]/30">
        <div className="max-w-[600px] mx-auto px-6 h-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#0071e3]">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-[15px]">กลับ</span>
          </Link>
          <span className="text-[15px] font-medium text-[#1d1d1f]">ประวัติ</span>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-[600px] mx-auto px-6 py-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[#6e6e73]" />
          </button>
          <h2 className="text-[17px] font-semibold text-[#1d1d1f] min-w-[160px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: th })}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-[#6e6e73]" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: "attendance" as TabType, label: "เข้างาน", icon: Clock },
            { key: "leave" as TabType, label: "การลา", icon: FileText },
            { key: "wfh" as TabType, label: "WFH", icon: Home },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-[14px] font-medium
                transition-colors
                ${
                  activeTab === tab.key
                    ? "bg-[#0071e3] text-white"
                    : "bg-[#f5f5f7] text-[#6e6e73] hover:bg-[#e8e8ed]"
                }
              `}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        {activeTab === "attendance" && (
          <div className="grid grid-cols-5 gap-2 mb-6">
            {[
              { label: "วัน", value: attendanceStats.total },
              { label: "ปกติ", value: attendanceStats.normal, color: "text-[#34c759]" },
              { label: "สาย", value: attendanceStats.late, color: "text-[#ff9500]" },
              { label: "หยุด", value: attendanceStats.holiday, color: "text-[#af52de]" },
              { label: "ชม.", value: attendanceStats.hours.toFixed(0), color: "text-[#0071e3]" },
            ].map((stat, i) => (
              <Card key={i} elevated>
                <div className="text-center py-2">
                  <p className={`text-[18px] font-semibold ${stat.color || "text-[#1d1d1f]"}`}>
                    {stat.value}
                  </p>
                  <p className="text-[10px] text-[#86868b]">{stat.label}</p>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === "leave" && (
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[
              { label: "ทั้งหมด", value: leaveStats.total },
              { label: "รอ", value: leaveStats.pending, color: "text-[#ff9500]" },
              { label: "อนุมัติ", value: leaveStats.approved, color: "text-[#34c759]" },
              { label: "ปฏิเสธ", value: leaveStats.rejected, color: "text-[#ff3b30]" },
            ].map((stat, i) => (
              <Card key={i} elevated>
                <div className="text-center py-2">
                  <p className={`text-[20px] font-semibold ${stat.color || "text-[#1d1d1f]"}`}>
                    {stat.value}
                  </p>
                  <p className="text-[10px] text-[#86868b]">{stat.label}</p>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === "wfh" && (
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[
              { label: "ทั้งหมด", value: wfhStats.total },
              { label: "รอ", value: wfhStats.pending, color: "text-[#ff9500]" },
              { label: "อนุมัติ", value: wfhStats.approved, color: "text-[#34c759]" },
              { label: "ปฏิเสธ", value: wfhStats.rejected, color: "text-[#ff3b30]" },
            ].map((stat, i) => (
              <Card key={i} elevated>
                <div className="text-center py-2">
                  <p className={`text-[20px] font-semibold ${stat.color || "text-[#1d1d1f]"}`}>
                    {stat.value}
                  </p>
                  <p className="text-[10px] text-[#86868b]">{stat.label}</p>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Attendance List */}
            {activeTab === "attendance" &&
              (attendance.length === 0 ? (
                <Card elevated>
                  <div className="text-center py-16 text-[#86868b]">ไม่มีข้อมูลในเดือนนี้</div>
                </Card>
              ) : (
                <div className="space-y-3">
                  {attendance.map((log) => (
                    <Card key={log.id} elevated>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center ${
                            log.status === "holiday" 
                              ? "bg-[#af52de]/10" 
                              : "bg-[#f5f5f7]"
                          }`}>
                            <span className={`text-[16px] font-semibold ${
                              log.status === "holiday" ? "text-[#af52de]" : "text-[#1d1d1f]"
                            }`}>
                              {format(new Date(log.work_date), "d")}
                            </span>
                            <span className="text-[10px] text-[#86868b] uppercase">
                              {format(new Date(log.work_date), "EEE", { locale: th })}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 text-[15px] text-[#1d1d1f]">
                              <Clock className="w-4 h-4 text-[#86868b]" />
                              {log.clock_in_time
                                ? format(new Date(log.clock_in_time), "HH:mm")
                                : "--:--"}
                              <span className="text-[#86868b]">-</span>
                              {log.clock_out_time
                                ? format(new Date(log.clock_out_time), "HH:mm")
                                : "--:--"}
                            </div>
                            <p className="text-[13px] text-[#86868b]">
                              {log.total_hours ? `${log.total_hours.toFixed(1)} ชั่วโมง` : "กำลังทำงาน"}
                            </p>
                            {log.note && (
                              <p className="text-[12px] text-[#af52de] mt-1">
                                📝 {log.note}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {log.status === "holiday" ? (
                            <Badge variant="info">
                              <Sun className="w-3 h-3 mr-1" />
                              วันหยุด
                            </Badge>
                          ) : (
                            <Badge variant={log.is_late ? "warning" : "success"}>
                              {log.is_late ? "สาย" : "ปกติ"}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {/* รูปภาพเช็คอิน/เช็คเอาท์ */}
                      {(log.clock_in_photo_url || log.clock_out_photo_url) && (
                        <div className="mt-3 pt-3 border-t border-[#e8e8ed] flex gap-2">
                          {log.clock_in_photo_url && (
                            <button
                              onClick={() => setViewingPhoto({ url: log.clock_in_photo_url, type: "เช็คอิน" })}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-[#0071e3] bg-[#0071e3]/10 rounded-lg hover:bg-[#0071e3]/20 transition-colors"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              ดูรูปเข้างาน
                            </button>
                          )}
                          {log.clock_out_photo_url && (
                            <button
                              onClick={() => setViewingPhoto({ url: log.clock_out_photo_url, type: "เช็คเอาท์" })}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-[#34c759] bg-[#34c759]/10 rounded-lg hover:bg-[#34c759]/20 transition-colors"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              ดูรูปออกงาน
                            </button>
                          )}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              ))}

            {/* Leave List */}
            {activeTab === "leave" &&
              (leaveRequests.length === 0 ? (
                <Card elevated>
                  <div className="text-center py-16 text-[#86868b]">ไม่มีข้อมูลในเดือนนี้</div>
                </Card>
              ) : (
                <div className="space-y-3">
                  {leaveRequests.map((leave) => {
                    const leaveTypeInfo =
                      leaveTypeLabels[leave.leave_type] || leaveTypeLabels.other;
                    const days = calculateDays(leave.start_date, leave.end_date, leave.is_half_day);

                    return (
                      <Card key={leave.id} elevated>
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span
                                  className={`
                                    inline-flex items-center gap-1 px-3 py-1 rounded-full text-[13px] font-medium
                                    ${leaveTypeInfo.color}
                                  `}
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  {leaveTypeInfo.label}
                                </span>
                                {getStatusBadge(leave.status)}
                              </div>
                              <div className="flex items-center gap-2 text-[14px] text-[#6e6e73] mb-1">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(leave.start_date), "d MMM", { locale: th })} -{" "}
                                {format(new Date(leave.end_date), "d MMM yyyy", { locale: th })}
                                {leave.is_half_day && " (ครึ่งวัน)"}
                              </div>
                              <p className="text-[13px] text-[#86868b]">{days} วัน</p>
                            </div>
                            {leave.status === "pending" && (
                              <button
                                onClick={() => handleCancelLeave(leave.id)}
                                disabled={canceling === leave.id}
                                className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[#ff3b30] bg-[#ff3b30]/10 rounded-lg hover:bg-[#ff3b30]/20 transition-colors disabled:opacity-50 whitespace-nowrap"
                              >
                                {canceling === leave.id ? (
                                  <div className="w-4 h-4 border-2 border-[#ff3b30] border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                                ยกเลิก
                              </button>
                            )}
                          </div>
                          <div className="bg-[#f5f5f7] rounded-xl p-3">
                            <p className="text-[13px] text-[#6e6e73]">{leave.reason}</p>
                          </div>
                          {leave.attachment_url && (
                            <a
                              href={leave.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-[13px] text-[#0071e3] hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              ดูเอกสารแนบ
                            </a>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ))}

            {/* WFH List */}
            {activeTab === "wfh" &&
              (wfhRequests.length === 0 ? (
                <Card elevated>
                  <div className="text-center py-16 text-[#86868b]">ไม่มีข้อมูลในเดือนนี้</div>
                </Card>
              ) : (
                <div className="space-y-3">
                  {wfhRequests.map((wfh) => (
                    <Card key={wfh.id} elevated>
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[13px] font-medium text-[#0071e3] bg-[#0071e3]/10">
                                <Home className="w-3.5 h-3.5" />
                                Work From Home
                              </span>
                              {getStatusBadge(wfh.status)}
                            </div>
                            <div className="flex items-center gap-2 text-[14px] text-[#6e6e73] mb-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(wfh.date), "EEEE d MMM yyyy", { locale: th })}
                              {wfh.is_half_day && " (ครึ่งวัน)"}
                            </div>
                          </div>
                          {wfh.status === "pending" && (
                            <button
                              onClick={() => handleCancelWFH(wfh.id)}
                              disabled={canceling === wfh.id}
                              className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[#ff3b30] bg-[#ff3b30]/10 rounded-lg hover:bg-[#ff3b30]/20 transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              {canceling === wfh.id ? (
                                <div className="w-4 h-4 border-2 border-[#ff3b30] border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                              ยกเลิก
                            </button>
                          )}
                        </div>
                        <div className="bg-[#f5f5f7] rounded-xl p-3">
                          <p className="text-[13px] text-[#6e6e73]">{wfh.reason}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ))}
          </>
        )}
      </main>

      {/* Photo Modal */}
      {viewingPhoto && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingPhoto(null)}
        >
          <div className="relative max-w-full max-h-[90vh]">
            <button
              className="absolute -top-12 right-0 p-2 bg-white rounded-full shadow-lg"
              onClick={() => setViewingPhoto(null)}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="bg-white rounded-2xl overflow-hidden">
              <div className="px-4 py-2 bg-[#f5f5f7] border-b border-[#e8e8ed]">
                <p className="text-[14px] font-medium text-[#1d1d1f]">
                  รูปภาพ{viewingPhoto.type}
                </p>
              </div>
              <img
                src={viewingPhoto.url}
                alt={viewingPhoto.type}
                className="max-w-[90vw] max-h-[70vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <ProtectedRoute>
      <HistoryContent />
    </ProtectedRoute>
  );
}
