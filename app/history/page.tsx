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
} from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { th } from "date-fns/locale";

type TabType = "attendance" | "leave" | "ot";

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
  const [otRequests, setOtRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

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
      } else if (activeTab === "ot") {
        const { data } = await supabase
          .from("ot_requests")
          .select("*")
          .eq("employee_id", employee.id)
          .gte("request_date", startDate)
          .lte("request_date", endDate)
          .order("created_at", { ascending: false });
        setOtRequests(data || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const attendanceStats = {
    total: attendance.length,
    normal: attendance.filter((a) => !a.is_late).length,
    late: attendance.filter((a) => a.is_late).length,
    hours: attendance.reduce((sum, a) => sum + (a.total_hours || 0), 0),
  };

  const leaveStats = {
    total: leaveRequests.length,
    pending: leaveRequests.filter((l) => l.status === "pending").length,
    approved: leaveRequests.filter((l) => l.status === "approved").length,
    rejected: leaveRequests.filter((l) => l.status === "rejected").length,
  };

  const otStats = {
    total: otRequests.length,
    pending: otRequests.filter((o) => o.status === "pending").length,
    approved: otRequests.filter((o) => o.status === "approved").length,
    hours: otRequests
      .filter((o) => o.status === "approved" || o.status === "completed")
      .reduce((sum, o) => sum + (o.actual_ot_hours || o.approved_ot_hours || 0), 0),
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="warning">รออนุมัติ</Badge>;
      case "approved":
        return <Badge variant="success">อนุมัติแล้ว</Badge>;
      case "rejected":
        return <Badge variant="danger">ปฏิเสธ</Badge>;
      case "completed":
        return <Badge variant="info">เสร็จสิ้น</Badge>;
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
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { key: "attendance" as TabType, label: "การเข้างาน", icon: Clock },
            { key: "leave" as TabType, label: "การลา", icon: FileText },
            { key: "ot" as TabType, label: "OT", icon: Calendar },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-[14px] font-medium whitespace-nowrap
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
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: "วัน", value: attendanceStats.total },
              { label: "ปกติ", value: attendanceStats.normal, color: "text-[#34c759]" },
              { label: "สาย", value: attendanceStats.late, color: "text-[#ff9500]" },
              { label: "ชม.", value: attendanceStats.hours.toFixed(0), color: "text-[#0071e3]" },
            ].map((stat, i) => (
              <Card key={i} elevated>
                <div className="text-center py-2">
                  <p className={`text-[24px] font-semibold ${stat.color || "text-[#1d1d1f]"}`}>
                    {stat.value}
                  </p>
                  <p className="text-[12px] text-[#86868b]">{stat.label}</p>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === "leave" && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: "ทั้งหมด", value: leaveStats.total },
              { label: "รออนุมัติ", value: leaveStats.pending, color: "text-[#ff9500]" },
              { label: "อนุมัติ", value: leaveStats.approved, color: "text-[#34c759]" },
              { label: "ปฏิเสธ", value: leaveStats.rejected, color: "text-[#ff3b30]" },
            ].map((stat, i) => (
              <Card key={i} elevated>
                <div className="text-center py-2">
                  <p className={`text-[24px] font-semibold ${stat.color || "text-[#1d1d1f]"}`}>
                    {stat.value}
                  </p>
                  <p className="text-[12px] text-[#86868b]">{stat.label}</p>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === "ot" && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: "ทั้งหมด", value: otStats.total },
              { label: "รออนุมัติ", value: otStats.pending, color: "text-[#ff9500]" },
              { label: "อนุมัติ", value: otStats.approved, color: "text-[#34c759]" },
              { label: "ชม.", value: otStats.hours.toFixed(1), color: "text-[#0071e3]" },
            ].map((stat, i) => (
              <Card key={i} elevated>
                <div className="text-center py-2">
                  <p className={`text-[24px] font-semibold ${stat.color || "text-[#1d1d1f]"}`}>
                    {stat.value}
                  </p>
                  <p className="text-[12px] text-[#86868b]">{stat.label}</p>
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
                          <div className="w-12 h-12 bg-[#f5f5f7] rounded-xl flex flex-col items-center justify-center">
                            <span className="text-[16px] font-semibold text-[#1d1d1f]">
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
                          </div>
                        </div>
                        <Badge variant={log.is_late ? "warning" : "success"}>
                          {log.is_late ? "สาย" : "ปกติ"}
                        </Badge>
                      </div>
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
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
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

            {/* OT List */}
            {activeTab === "ot" &&
              (otRequests.length === 0 ? (
                <Card elevated>
                  <div className="text-center py-16 text-[#86868b]">ไม่มีข้อมูลในเดือนนี้</div>
                </Card>
              ) : (
                <div className="space-y-3">
                  {otRequests.map((ot) => (
                    <Card key={ot.id} elevated>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusBadge(ot.status)}
                          </div>
                          <div className="flex items-center gap-2 text-[14px] text-[#6e6e73] mb-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(ot.request_date), "d MMMM yyyy", { locale: th })}
                          </div>
                          <div className="flex items-center gap-2 text-[14px] text-[#6e6e73] mb-2">
                            <Clock className="w-4 h-4" />
                            {format(new Date(ot.requested_start_time), "HH:mm")} -{" "}
                            {format(new Date(ot.requested_end_time), "HH:mm")} น.
                          </div>
                          <div className="bg-[#f5f5f7] rounded-xl p-3">
                            <p className="text-[13px] text-[#6e6e73]">{ot.reason}</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ))}
          </>
        )}
      </main>
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
