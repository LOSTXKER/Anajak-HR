"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Briefcase,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Home,
  Timer,
  FileText,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Camera,
  X,
  Trash2,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { th } from "date-fns/locale";
import Link from "next/link";

// Types
interface AttendanceRecord {
  id: string;
  work_date: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  clock_in_photo_url: string | null;
  clock_out_photo_url: string | null;
  total_hours: number | null;
  is_late: boolean;
  late_minutes: number;
  status: string;
}

interface OTRecord {
  id: string;
  request_date: string;
  ot_type: string;
  approved_ot_hours: number | null;
  actual_ot_hours: number | null;
  ot_amount: number | null;
  ot_rate: number | null;
  status: string;
  reason: string;
}

interface LeaveRecord {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  reason: string;
  status: string;
}

interface WFHRecord {
  id: string;
  date: string;
  is_half_day: boolean;
  reason: string;
  status: string;
}

interface LateRequestRecord {
  id: string;
  request_date: string;
  actual_clock_in_time: string;
  reason: string;
  status: string;
}

interface LeaveQuota {
  type: string;
  label: string;
  quota: number;
  used: number;
  remaining: number;
  color: string;
}

type TabType = "overview" | "attendance" | "ot" | "leave" | "wfh";

export default function MyProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const { user, employee, loading: authLoading } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [photoModal, setPhotoModal] = useState<{ url: string; type: string } | null>(null);
  const [canceling, setCanceling] = useState<string | null>(null);

  // Data
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [otData, setOtData] = useState<OTRecord[]>([]);
  const [leaveData, setLeaveData] = useState<LeaveRecord[]>([]);
  const [wfhData, setWfhData] = useState<WFHRecord[]>([]);
  const [lateData, setLateData] = useState<LateRequestRecord[]>([]);
  const [leaveQuotas, setLeaveQuotas] = useState<LeaveQuota[]>([]);

  // Pending requests
  const [pendingRequests, setPendingRequests] = useState<{
    ot: number;
    leave: number;
    wfh: number;
    late: number;
  }>({ ot: 0, leave: 0, wfh: 0, late: 0 });

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!employee?.id) return;

    setLoading(true);
    const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    try {
      const [attRes, otRes, leaveRes, wfhRes, lateRes, pendingOtRes, pendingLeaveRes, pendingWfhRes, pendingLateRes] =
        await Promise.all([
          // Attendance
          supabase
            .from("attendance_logs")
            .select("*")
            .eq("employee_id", employee.id)
            .gte("work_date", startDate)
            .lte("work_date", endDate)
            .order("work_date", { ascending: false }),
          // OT
          supabase
            .from("ot_requests")
            .select("*")
            .eq("employee_id", employee.id)
            .gte("request_date", startDate)
            .lte("request_date", endDate)
            .order("request_date", { ascending: false }),
          // Leave
          supabase
            .from("leave_requests")
            .select("*")
            .eq("employee_id", employee.id)
            .or(`start_date.lte.${endDate},end_date.gte.${startDate}`)
            .order("start_date", { ascending: false }),
          // WFH
          supabase
            .from("wfh_requests")
            .select("*")
            .eq("employee_id", employee.id)
            .gte("date", startDate)
            .lte("date", endDate)
            .order("date", { ascending: false }),
          // Late
          supabase
            .from("late_requests")
            .select("*")
            .eq("employee_id", employee.id)
            .gte("request_date", startDate)
            .lte("request_date", endDate)
            .order("request_date", { ascending: false }),
          // Pending counts
          supabase.from("ot_requests").select("id", { count: "exact", head: true }).eq("employee_id", employee.id).eq("status", "pending"),
          supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("employee_id", employee.id).eq("status", "pending"),
          supabase.from("wfh_requests").select("id", { count: "exact", head: true }).eq("employee_id", employee.id).eq("status", "pending"),
          supabase.from("late_requests").select("id", { count: "exact", head: true }).eq("employee_id", employee.id).eq("status", "pending"),
        ]);

      setAttendanceData(attRes.data || []);
      setOtData(otRes.data || []);
      setLeaveData(leaveRes.data || []);
      setWfhData(wfhRes.data || []);
      setLateData(lateRes.data || []);

      setPendingRequests({
        ot: pendingOtRes.count || 0,
        leave: pendingLeaveRes.count || 0,
        wfh: pendingWfhRes.count || 0,
        late: pendingLateRes.count || 0,
      });

      // Calculate leave quotas
      const currentYear = new Date().getFullYear();
      const { data: balanceData } = await supabase
        .from("leave_balances")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("year", currentYear)
        .single();

      const quotas: LeaveQuota[] = [
        {
          type: "sick",
          label: "ลาป่วย",
          quota: (employee as any).sick_leave_quota || 30,
          used: balanceData?.sick_used || 0,
          remaining: balanceData?.sick_remaining || (employee as any).sick_leave_quota || 30,
          color: "#ff3b30",
        },
        {
          type: "personal",
          label: "ลากิจ",
          quota: (employee as any).personal_leave_quota || 3,
          used: balanceData?.personal_used || 0,
          remaining: balanceData?.personal_remaining || (employee as any).personal_leave_quota || 3,
          color: "#ff9500",
        },
        {
          type: "annual",
          label: "ลาพักร้อน",
          quota: (employee as any).annual_leave_quota || 10,
          used: balanceData?.annual_used || 0,
          remaining: balanceData?.annual_remaining || (employee as any).annual_leave_quota || 10,
          color: "#0071e3",
        },
      ];
      setLeaveQuotas(quotas);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [employee?.id, currentMonth]);

  useEffect(() => {
    if (employee?.id) {
      fetchData();
    }
  }, [employee?.id, currentMonth, fetchData]);

  // Stats
  const monthlyStats = useMemo(() => {
    return {
      workDays: attendanceData.filter((a) => a.clock_in_time).length,
      lateDays: attendanceData.filter((a) => a.is_late).length,
      totalHours: attendanceData.reduce((sum, a) => sum + (a.total_hours || 0), 0),
      otHours: otData
        .filter((o) => ["approved", "completed"].includes(o.status))
        .reduce((sum, o) => sum + (o.actual_ot_hours || o.approved_ot_hours || 0), 0),
      otAmount: otData
        .filter((o) => ["approved", "completed"].includes(o.status))
        .reduce((sum, o) => sum + (o.ot_amount || 0), 0),
      leaveDays: leaveData.filter((l) => l.status === "approved").length,
      wfhDays: wfhData.filter((w) => w.status === "approved").length,
    };
  }, [attendanceData, otData, leaveData, wfhData]);

  // Cancel request
  const handleCancel = async (type: "leave" | "wfh", id: string) => {
    setCanceling(id);
    try {
      const table = type === "leave" ? "leave_requests" : "wfh_requests";
      const { error } = await supabase
        .from(table)
        .update({ status: "cancelled" })
        .eq("id", id);

      if (error) throw error;

      toast.success("ยกเลิกสำเร็จ", `ยกเลิกคำขอ${type === "leave" ? "ลา" : "WFH"}เรียบร้อย`);
      fetchData();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message || "ไม่สามารถยกเลิกได้");
    } finally {
      setCanceling(null);
    }
  };

  // Helpers
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />อนุมัติ</Badge>;
      case "pending":
        return <Badge variant="warning"><Clock className="w-3 h-3 mr-1" />รออนุมัติ</Badge>;
      case "rejected":
        return <Badge variant="danger"><XCircle className="w-3 h-3 mr-1" />ปฏิเสธ</Badge>;
      case "completed":
        return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />เสร็จสิ้น</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getOTTypeLabel = (type: string) => {
    switch (type) {
      case "weekday": return "วันทำงาน";
      case "weekend": return "วันหยุด";
      case "holiday": return "นักขัตฤกษ์";
      default: return type;
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case "sick": return "ลาป่วย";
      case "personal": return "ลากิจ";
      case "annual": return "ลาพักร้อน";
      default: return type;
    }
  };

  if (authLoading || !employee) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalPending = pendingRequests.ot + pendingRequests.leave + pendingRequests.wfh + pendingRequests.late;

  return (
    <div className="min-h-screen bg-[#fbfbfd]">
      {/* Header */}
      <header className="sticky top-0 z-50 apple-glass border-b border-[#d2d2d7]/30">
        <div className="max-w-[980px] mx-auto px-4 h-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#0071e3]">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">กลับ</span>
          </Link>
          <h1 className="text-[17px] font-semibold text-[#1d1d1f]">ประวัติของฉัน</h1>
          <div className="w-12" /> {/* Spacer */}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[680px] mx-auto px-4 py-6">
        {/* Profile Header */}
        <Card elevated className="mb-6">
          <div className="flex items-center gap-4">
            <Avatar name={employee.name || "User"} size="xl" />
            <div className="flex-1">
              <h2 className="text-xl font-bold text-[#1d1d1f]">{employee.name}</h2>
              <div className="flex flex-wrap gap-2 mt-1">
                <Badge variant="info">{employee.role === "supervisor" ? "หัวหน้างาน" : "พนักงาน"}</Badge>
                {(employee as any).position && (
                  <span className="text-sm text-[#86868b]">{(employee as any).position}</span>
                )}
              </div>
              <p className="text-sm text-[#86868b] mt-1">{employee.email}</p>
            </div>
          </div>
        </Card>

        {/* Pending Requests Alert */}
        {totalPending > 0 && (
          <div className="bg-[#fff7ed] border border-[#fed7aa] rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#ff9500]/20 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#ff9500]" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#1d1d1f]">คำขอรอดำเนินการ</p>
                <p className="text-[13px] text-[#86868b]">
                  {pendingRequests.ot > 0 && `OT ${pendingRequests.ot} `}
                  {pendingRequests.leave > 0 && `ลา ${pendingRequests.leave} `}
                  {pendingRequests.wfh > 0 && `WFH ${pendingRequests.wfh} `}
                  {pendingRequests.late > 0 && `สาย ${pendingRequests.late}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Leave Quota Cards */}
        <div className="mb-6">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-3">โควต้าลาคงเหลือ</h3>
          <div className="grid grid-cols-3 gap-3">
            {leaveQuotas.map((quota) => (
              <Card key={quota.type} elevated className="!p-4">
                <div className="text-center">
                  <div
                    className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center"
                    style={{ backgroundColor: `${quota.color}15` }}
                  >
                    <span className="text-lg font-bold" style={{ color: quota.color }}>
                      {quota.remaining}
                    </span>
                  </div>
                  <p className="text-[13px] font-medium text-[#1d1d1f]">{quota.label}</p>
                  <p className="text-[11px] text-[#86868b]">ใช้ {quota.used}/{quota.quota}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[#6e6e73]" />
          </button>
          <h3 className="text-lg font-semibold text-[#1d1d1f]">
            {format(currentMonth, "MMMM yyyy", { locale: th })}
          </h3>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-[#6e6e73]" />
          </button>
        </div>

        {/* Monthly Stats */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[
            { label: "วันทำงาน", value: monthlyStats.workDays, icon: Calendar, color: "#34c759" },
            { label: "วันสาย", value: monthlyStats.lateDays, icon: AlertTriangle, color: "#ff9500" },
            { label: "ชม. OT", value: monthlyStats.otHours.toFixed(1), icon: Timer, color: "#0071e3" },
            { label: "เงิน OT", value: `฿${monthlyStats.otAmount.toLocaleString()}`, icon: DollarSign, color: "#34c759" },
          ].map((stat, i) => (
            <Card key={i} elevated className="!p-3">
              <div className="text-center">
                <stat.icon className="w-5 h-5 mx-auto mb-1" style={{ color: stat.color }} />
                <p className="text-lg font-bold text-[#1d1d1f]">{stat.value}</p>
                <p className="text-[10px] text-[#86868b]">{stat.label}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[#f5f5f7] rounded-xl mb-4 overflow-x-auto">
          {[
            { id: "overview", label: "ภาพรวม" },
            { id: "attendance", label: "เข้างาน" },
            { id: "ot", label: "OT" },
            { id: "leave", label: "ลา" },
            { id: "wfh", label: "WFH" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-white shadow-sm text-[#1d1d1f]"
                  : "text-[#86868b] hover:text-[#1d1d1f]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Overview - Timeline */}
            {activeTab === "overview" && (
              <div className="space-y-3">
                {[...attendanceData, ...otData, ...leaveData, ...wfhData]
                  .sort((a: any, b: any) => {
                    const dateA = new Date(a.work_date || a.request_date || a.date || a.start_date);
                    const dateB = new Date(b.work_date || b.request_date || b.date || b.start_date);
                    return dateB.getTime() - dateA.getTime();
                  })
                  .slice(0, 10)
                  .map((item: any, i) => {
                    const isAttendance = "clock_in_time" in item;
                    const isOT = "ot_type" in item;
                    const isLeave = "leave_type" in item;
                    const isWFH = "is_half_day" in item && !("leave_type" in item);

                    const date = item.work_date || item.request_date || item.date || item.start_date;

                    return (
                      <Card key={`${i}-${item.id}`} elevated className="!p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              isAttendance
                                ? "bg-[#34c759]/10"
                                : isOT
                                ? "bg-[#ff9500]/10"
                                : isLeave
                                ? "bg-[#af52de]/10"
                                : "bg-[#0071e3]/10"
                            }`}
                          >
                            {isAttendance && <Clock className="w-5 h-5 text-[#34c759]" />}
                            {isOT && <Timer className="w-5 h-5 text-[#ff9500]" />}
                            {isLeave && <Calendar className="w-5 h-5 text-[#af52de]" />}
                            {isWFH && <Home className="w-5 h-5 text-[#0071e3]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[13px] text-[#86868b]">
                                {format(new Date(date), "d MMM yyyy", { locale: th })}
                              </p>
                              {isOT && getStatusBadge(item.status)}
                              {isLeave && getStatusBadge(item.status)}
                              {isWFH && getStatusBadge(item.status)}
                            </div>
                            <p className="text-[15px] font-medium text-[#1d1d1f]">
                              {isAttendance && (
                                <>
                                  เข้างาน {item.clock_in_time ? format(new Date(item.clock_in_time), "HH:mm") : "-"}
                                  {item.clock_out_time && ` - ${format(new Date(item.clock_out_time), "HH:mm")}`}
                                  {item.is_late && <span className="text-[#ff9500]"> (สาย {item.late_minutes}น.)</span>}
                                </>
                              )}
                              {isOT && (
                                <>
                                  OT {getOTTypeLabel(item.ot_type)} {item.actual_ot_hours?.toFixed(1) || item.approved_ot_hours?.toFixed(1) || 0} ชม.
                                  {item.ot_amount && <span className="text-[#34c759]"> ฿{item.ot_amount.toLocaleString()}</span>}
                                </>
                              )}
                              {isLeave && (
                                <>
                                  {getLeaveTypeLabel(item.leave_type)}
                                  {item.is_half_day && " (ครึ่งวัน)"}
                                </>
                              )}
                              {isWFH && (
                                <>
                                  WFH {item.is_half_day && "(ครึ่งวัน)"}
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                {[...attendanceData, ...otData, ...leaveData, ...wfhData].length === 0 && (
                  <div className="text-center py-12 text-[#86868b]">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>ไม่มีข้อมูลในเดือนนี้</p>
                  </div>
                )}
              </div>
            )}

            {/* Attendance Tab */}
            {activeTab === "attendance" && (
              <div className="space-y-2">
                {attendanceData.length === 0 ? (
                  <div className="text-center py-12 text-[#86868b]">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>ไม่มีข้อมูลการเข้างานในเดือนนี้</p>
                  </div>
                ) : (
                  attendanceData.map((att) => (
                    <Card key={att.id} elevated className="!p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-[13px] text-[#86868b]">
                            {format(new Date(att.work_date), "d MMM yyyy", { locale: th })}
                          </p>
                          <p className="text-[15px] font-medium text-[#1d1d1f]">
                            {att.clock_in_time ? format(new Date(att.clock_in_time), "HH:mm") : "-"}
                            {att.clock_out_time && ` - ${format(new Date(att.clock_out_time), "HH:mm")}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-[#0071e3]">{att.total_hours?.toFixed(1) || 0} ชม.</p>
                          {att.is_late ? (
                            <Badge variant="warning">สาย {att.late_minutes}น.</Badge>
                          ) : (
                            <Badge variant="success">ปกติ</Badge>
                          )}
                        </div>
                      </div>
                      {/* Photo buttons */}
                      {(att.clock_in_photo_url || att.clock_out_photo_url) && (
                        <div className="flex gap-2 pt-2 border-t border-[#e8e8ed]">
                          {att.clock_in_photo_url && (
                            <button
                              onClick={() => setPhotoModal({ url: att.clock_in_photo_url!, type: "เข้างาน" })}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0071e3] bg-[#0071e3]/10 rounded-lg hover:bg-[#0071e3]/20 transition-colors"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              รูปเข้างาน
                            </button>
                          )}
                          {att.clock_out_photo_url && (
                            <button
                              onClick={() => setPhotoModal({ url: att.clock_out_photo_url!, type: "ออกงาน" })}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#34c759] bg-[#34c759]/10 rounded-lg hover:bg-[#34c759]/20 transition-colors"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              รูปออกงาน
                            </button>
                          )}
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* OT Tab */}
            {activeTab === "ot" && (
              <div className="space-y-2">
                {otData.length === 0 ? (
                  <div className="text-center py-12 text-[#86868b]">
                    <Timer className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>ไม่มีข้อมูล OT ในเดือนนี้</p>
                  </div>
                ) : (
                  otData.map((ot) => (
                    <Card key={ot.id} elevated className="!p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[13px] text-[#86868b]">
                          {format(new Date(ot.request_date), "d MMM yyyy", { locale: th })}
                        </p>
                        {getStatusBadge(ot.status)}
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[15px] font-medium text-[#1d1d1f]">
                            {getOTTypeLabel(ot.ot_type)}
                          </p>
                          <p className="text-[13px] text-[#86868b] truncate max-w-[200px]">{ot.reason}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-[#ff9500]">
                            {ot.actual_ot_hours?.toFixed(1) || ot.approved_ot_hours?.toFixed(1) || 0} ชม.
                          </p>
                          {ot.ot_amount && (
                            <p className="text-sm font-semibold text-[#34c759]">฿{ot.ot_amount.toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Leave Tab */}
            {activeTab === "leave" && (
              <div className="space-y-2">
                {leaveData.length === 0 ? (
                  <div className="text-center py-12 text-[#86868b]">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>ไม่มีข้อมูลการลาในเดือนนี้</p>
                  </div>
                ) : (
                  leaveData.map((leave) => (
                    <Card key={leave.id} elevated className="!p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="info">{getLeaveTypeLabel(leave.leave_type)}</Badge>
                        {getStatusBadge(leave.status)}
                      </div>
                      <p className="text-[15px] font-medium text-[#1d1d1f]">
                        {format(new Date(leave.start_date), "d MMM", { locale: th })}
                        {leave.start_date !== leave.end_date && (
                          <> - {format(new Date(leave.end_date), "d MMM", { locale: th })}</>
                        )}
                        {leave.is_half_day && " (ครึ่งวัน)"}
                      </p>
                      <p className="text-[13px] text-[#86868b] mt-1">{leave.reason}</p>
                      {leave.status === "pending" && (
                        <button
                          onClick={() => handleCancel("leave", leave.id)}
                          disabled={canceling === leave.id}
                          className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#ff3b30] bg-[#ff3b30]/10 rounded-lg hover:bg-[#ff3b30]/20 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {canceling === leave.id ? "กำลังยกเลิก..." : "ยกเลิกคำขอ"}
                        </button>
                      )}
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* WFH Tab */}
            {activeTab === "wfh" && (
              <div className="space-y-2">
                {wfhData.length === 0 ? (
                  <div className="text-center py-12 text-[#86868b]">
                    <Home className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>ไม่มีข้อมูล WFH ในเดือนนี้</p>
                  </div>
                ) : (
                  wfhData.map((wfh) => (
                    <Card key={wfh.id} elevated className="!p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[13px] text-[#86868b]">
                          {format(new Date(wfh.date), "d MMM yyyy", { locale: th })}
                        </p>
                        {getStatusBadge(wfh.status)}
                      </div>
                      <p className="text-[15px] font-medium text-[#1d1d1f]">
                        Work From Home {wfh.is_half_day && "(ครึ่งวัน)"}
                      </p>
                      <p className="text-[13px] text-[#86868b] mt-1">{wfh.reason}</p>
                      {wfh.status === "pending" && (
                        <button
                          onClick={() => handleCancel("wfh", wfh.id)}
                          disabled={canceling === wfh.id}
                          className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#ff3b30] bg-[#ff3b30]/10 rounded-lg hover:bg-[#ff3b30]/20 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {canceling === wfh.id ? "กำลังยกเลิก..." : "ยกเลิกคำขอ"}
                        </button>
                      )}
                    </Card>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Photo Modal */}
      {photoModal && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPhotoModal(null)}
        >
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPhotoModal(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-[#ff3b30] transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <p className="text-white text-center mb-4 text-lg font-medium">
              รูปถ่าย{photoModal.type}
            </p>
            <img
              src={photoModal.url}
              alt={`รูปถ่าย${photoModal.type}`}
              className="w-full rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

