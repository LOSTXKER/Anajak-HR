"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import {
  Users,
  Clock,
  Play,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Timer,
  Activity,
  Eye,
  Edit,
  MapPin,
  Filter,
  Calendar,
} from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { th } from "date-fns/locale";
import Link from "next/link";

// Types
type ViewMode = "realtime" | "anomalies";

interface ActiveOT {
  id: string;
  employee: { id: string; name: string; email: string; is_system_account?: boolean };
  request_date: string;
  actual_start_time: string;
  approved_end_time: string;
  reason: string;
}

interface TodayStats {
  totalEmployees: number;
  checkedIn: number;
  checkedOut: number;
  notCheckedIn: number;
  late: number;
  onOT: number;
  pendingOT: number;
  pendingLeave: number;
  pendingWFH: number;
}

interface Anomaly {
  id: string;
  attendance_id: string;
  employee_id: string;
  date: string;
  anomaly_type: string;
  description: string;
  status: string;
  resolved_by: string;
  resolved_at: string;
  resolution_note: string;
  created_at: string;
  employee?: { name: string; email: string };
  resolver?: { name: string };
}

const anomalyTypeLabels: Record<string, { label: string; icon: any; color: string }> = {
  forgot_checkout: { label: "ลืมเช็คเอาท์", icon: Clock, color: "text-[#ff9500] bg-[#ff9500]/10" },
  auto_checkout: { label: "Auto Check-out", icon: Clock, color: "text-[#0071e3] bg-[#0071e3]/10" },
  overtime_no_request: { label: "อยู่เกินเวลาไม่ขอ OT", icon: AlertTriangle, color: "text-[#ff3b30] bg-[#ff3b30]/10" },
  late_checkin: { label: "เช็คอินสาย", icon: Clock, color: "text-[#ff9500] bg-[#ff9500]/10" },
  early_checkout: { label: "เช็คเอาท์ก่อนเวลา", icon: Clock, color: "text-[#ff9500] bg-[#ff9500]/10" },
  location_mismatch: { label: "ตำแหน่งไม่ตรง", icon: MapPin, color: "text-[#ff3b30] bg-[#ff3b30]/10" },
  manual_edit: { label: "แก้ไขข้อมูล", icon: Edit, color: "text-[#5856d6] bg-[#5856d6]/10" },
};

function MonitorContent() {
  const { employee: currentAdmin } = useAuth();
  const toast = useToast();
  
  // View State
  const [viewMode, setViewMode] = useState<ViewMode>("realtime");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Realtime State
  const [stats, setStats] = useState<TodayStats>({
    totalEmployees: 0, checkedIn: 0, checkedOut: 0, notCheckedIn: 0,
    late: 0, onOT: 0, pendingOT: 0, pendingLeave: 0, pendingWFH: 0,
  });
  const [activeOTs, setActiveOTs] = useState<ActiveOT[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [otTimes, setOtTimes] = useState<Record<string, string>>({});

  // Anomalies State
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [anomalyFilter, setAnomalyFilter] = useState("pending");
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");

  // Auto-refresh
  useEffect(() => {
    if (viewMode === "realtime") {
      fetchRealtimeData();
      const interval = setInterval(fetchRealtimeData, 30000);
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(clockInterval);
    };
    } else {
      fetchAnomalies();
    }
  }, [viewMode, anomalyFilter]);

  // Update OT elapsed times
  useEffect(() => {
    if (viewMode !== "realtime") return;
    const timer = setInterval(() => {
      const times: Record<string, string> = {};
      activeOTs.forEach((ot: any) => {
        const minutes = differenceInMinutes(new Date(), new Date(ot.actual_start_time));
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        times[ot.id] = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
      });
      setOtTimes(times);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeOTs, viewMode]);

  const fetchRealtimeData = async () => {
    setRefreshing(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const dayOfWeek = new Date().getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const [
        employeesResult, attendanceResult, activeOTResult,
        pendingOTResult, pendingLeaveResult, pendingWFHResult,
        recentResult, holidayResult, anomalyCountResult,
      ] = await Promise.all([
        supabase.from("employees").select("id").neq("role", "admin").or("is_system_account.is.null,is_system_account.eq.false"),
        supabase.from("attendance_logs").select("*, employee:employees!employee_id(id, is_system_account)").eq("work_date", today),
        supabase.from("ot_requests").select("*, employee:employees!employee_id(id, name, email, is_system_account)").eq("status", "approved").not("actual_start_time", "is", null).is("actual_end_time", null),
        supabase.from("ot_requests").select("id", { count: "exact" }).eq("status", "pending"),
        supabase.from("leave_requests").select("id", { count: "exact" }).eq("status", "pending"),
        supabase.from("wfh_requests").select("id", { count: "exact" }).eq("status", "pending"),
        supabase.from("attendance_logs").select("*, employee:employees!employee_id(name, is_system_account)").eq("work_date", today).order("clock_in_time", { ascending: false }).limit(20),
        supabase.from("holidays").select("id").eq("date", today).limit(1),
        supabase.from("attendance_anomalies").select("id", { count: "exact" }).eq("status", "pending"),
      ]);

      const isHoliday = (holidayResult.data?.length || 0) > 0;
      const isNonWorkingDay = isWeekend || isHoliday;
      const totalEmployees = employeesResult.data?.length || 0;

      const attendance = (attendanceResult.data || []).filter((a: any) => !a.employee?.is_system_account);
      const checkedIn = attendance.filter((a: any) => a.clock_in_time).length;
      const checkedOut = attendance.filter((a: any) => a.clock_out_time).length;
      const late = attendance.filter((a: any) => a.is_late).length;
      const activeOTFiltered = (activeOTResult.data || []).filter((ot: any) => !ot.employee?.is_system_account);
      const recentFiltered = (recentResult.data || []).filter((a: any) => !a.employee?.is_system_account).slice(0, 10);

      const now = new Date();
      const currentHour = now.getHours();
      const workStartHour = 9;
      const isBeforeWorkStart = currentHour < workStartHour;
      const notCheckedIn = (isNonWorkingDay || isBeforeWorkStart) ? 0 : totalEmployees - checkedIn;

      setStats({
        totalEmployees, checkedIn, checkedOut, notCheckedIn, late,
        onOT: activeOTFiltered.length,
        pendingOT: pendingOTResult.count || 0,
        pendingLeave: pendingLeaveResult.count || 0,
        pendingWFH: pendingWFHResult.count || 0,
      });
      setActiveOTs(activeOTFiltered);
      setRecentActivity(recentFiltered);
    } catch (error) {
      console.error("Error fetching monitor data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAnomalies = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("attendance_anomalies")
        .select(`*, employee:employees!employee_id(name, email), resolver:employees!resolved_by(name)`)
        .order("created_at", { ascending: false });

      if (anomalyFilter !== "all") {
        query = query.eq("status", anomalyFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAnomalies(data || []);
    } catch (error) {
      console.error("Error fetching anomalies:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (status: "resolved" | "ignored") => {
    if (!selectedAnomaly) return;
    setResolving(true);
    try {
      const { error } = await supabase
        .from("attendance_anomalies")
        .update({
          status,
          resolution_note: resolutionNote,
          resolved_at: new Date().toISOString(),
          resolved_by: currentAdmin?.id || null,
        })
        .eq("id", selectedAnomaly.id);

      if (error) throw error;

      toast.success("บันทึกสำเร็จ", status === "resolved" ? "ตรวจสอบเรียบร้อยแล้ว" : "ไม่ต้องดำเนินการ");
      setShowModal(false);
      setSelectedAnomaly(null);
      setResolutionNote("");
      fetchAnomalies();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกได้");
    } finally {
      setResolving(false);
    }
  };

  const pendingAnomaliesCount = anomalies.filter(a => a.status === "pending").length;

  if (loading && viewMode === "realtime") {
    return (
      <AdminLayout title="Monitor">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Monitor" description="ติดตามสถานะและความผิดปกติ">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 p-1 bg-[#f5f5f7] rounded-2xl w-fit">
          <button
            onClick={() => setViewMode("realtime")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[14px] font-medium transition-all ${
              viewMode === "realtime"
                ? "bg-white text-[#1d1d1f] shadow-sm"
                : "text-[#6e6e73] hover:text-[#1d1d1f]"
            }`}
          >
            <Activity className="w-4 h-4" />
            Real-time
          </button>
          <button
            onClick={() => setViewMode("anomalies")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[14px] font-medium transition-all ${
              viewMode === "anomalies"
                ? "bg-white text-[#1d1d1f] shadow-sm"
                : "text-[#6e6e73] hover:text-[#1d1d1f]"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            ความผิดปกติ
            {pendingAnomaliesCount > 0 && (
              <span className="px-2 py-0.5 bg-[#ff3b30] text-white text-[11px] font-bold rounded-full">
                {pendingAnomaliesCount}
              </span>
            )}
          </button>
        </div>

        {viewMode === "realtime" && (
        <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[28px] font-light text-[#1d1d1f]">
              {format(currentTime, "HH:mm:ss")}
            </p>
              <p className="text-[13px] text-[#86868b]">
              {format(currentTime, "EEEE d MMMM yyyy", { locale: th })}
            </p>
          </div>
            <Button variant="secondary" size="sm" onClick={fetchRealtimeData} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
          </div>
        )}
      </div>

      {/* Realtime View */}
      {viewMode === "realtime" && (
        <>
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
        <Card elevated className="bg-gradient-to-br from-[#0071e3] to-[#005bb5] text-white">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 opacity-80" />
            <div>
              <p className="text-[32px] font-semibold">{stats.totalEmployees}</p>
              <p className="text-[13px] opacity-80">พนักงานทั้งหมด</p>
            </div>
          </div>
        </Card>

        <Card elevated className="bg-gradient-to-br from-[#34c759] to-[#28a745]">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-white opacity-80" />
            <div>
              <p className="text-[32px] font-semibold text-white">{stats.checkedIn}</p>
              <p className="text-[13px] text-white/80">เช็คอินแล้ว</p>
            </div>
          </div>
        </Card>

        <Card elevated className="bg-gradient-to-br from-[#ff9500] to-[#e68600]">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-white opacity-80" />
            <div>
              <p className="text-[32px] font-semibold text-white">{stats.notCheckedIn}</p>
              <p className="text-[13px] text-white/80">ยังไม่เช็คอิน</p>
            </div>
          </div>
        </Card>

        <Card elevated className="bg-gradient-to-br from-[#ff3b30] to-[#d63031]">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-white opacity-80" />
            <div>
              <p className="text-[32px] font-semibold text-white">{stats.late}</p>
              <p className="text-[13px] text-white/80">มาสาย</p>
            </div>
          </div>
        </Card>

        <Card elevated className="bg-gradient-to-br from-[#af52de] to-[#9b59b6]">
          <div className="flex items-center gap-3">
            <Timer className="w-8 h-8 text-white opacity-80" />
            <div>
              <p className="text-[32px] font-semibold text-white">{stats.onOT}</p>
              <p className="text-[13px] text-white/80">กำลังทำ OT</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pending Requests Alert */}
      {(stats.pendingOT > 0 || stats.pendingLeave > 0 || stats.pendingWFH > 0) && (
            <Link href="/admin/approvals">
              <Card elevated className="mb-6 border-l-4 border-l-[#ff9500] bg-[#ff9500]/5 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center gap-4">
            <AlertTriangle className="w-6 h-6 text-[#ff9500]" />
            <div className="flex-1">
              <p className="text-[15px] font-semibold text-[#1d1d1f]">คำขอรออนุมัติ</p>
              <div className="flex gap-4 mt-1">
                      {stats.pendingOT > 0 && <span className="text-[13px] text-[#ff9500]">OT: {stats.pendingOT}</span>}
                      {stats.pendingLeave > 0 && <span className="text-[13px] text-[#af52de]">ลา: {stats.pendingLeave}</span>}
                      {stats.pendingWFH > 0 && <span className="text-[13px] text-[#0071e3]">WFH: {stats.pendingWFH}</span>}
              </div>
            </div>
          </div>
        </Card>
            </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active OT Section */}
        <Card elevated padding="none">
          <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className="w-5 h-5 text-[#ff9500]" />
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">กำลังทำ OT</h3>
            </div>
                {activeOTs.length > 0 && <Badge variant="warning">{activeOTs.length} คน</Badge>}
          </div>

          <div className="p-4">
            {activeOTs.length === 0 ? (
              <div className="text-center py-10 text-[#86868b]">
                <Timer className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>ไม่มีใครกำลังทำ OT</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeOTs.map((ot) => (
                      <div key={ot.id} className="flex items-center justify-between p-4 bg-[#ff9500]/10 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Avatar name={ot.employee.name} size="sm" />
                      <div>
                            <p className="text-[15px] font-medium text-[#1d1d1f]">{ot.employee.name}</p>
                            <p className="text-[13px] text-[#86868b]">เริ่ม: {format(new Date(ot.actual_start_time), "HH:mm")} น.</p>
                      </div>
                    </div>
                    <div className="text-right">
                          <p className="text-[24px] font-semibold text-[#ff9500]">{otTimes[ot.id] || "00:00"}</p>
                      <p className="text-[12px] text-[#86868b]">ชม:นาที</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card elevated padding="none">
          <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#0071e3]" />
            <h3 className="text-[17px] font-semibold text-[#1d1d1f]">กิจกรรมล่าสุด</h3>
          </div>

          <div className="p-4 max-h-[400px] overflow-y-auto">
            {recentActivity.length === 0 ? (
              <div className="text-center py-10 text-[#86868b]">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>ยังไม่มีกิจกรรมวันนี้</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center gap-3 p-3 hover:bg-[#f5f5f7] rounded-xl transition-colors">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          activity.clock_out_time ? "bg-[#34c759]/10" : activity.is_late ? "bg-[#ff9500]/10" : "bg-[#0071e3]/10"
                      }`}>
                      {activity.clock_out_time ? (
                        <XCircle className="w-5 h-5 text-[#34c759]" />
                      ) : (
                        <CheckCircle className={`w-5 h-5 ${activity.is_late ? "text-[#ff9500]" : "text-[#0071e3]"}`} />
                      )}
                    </div>
                    <div className="flex-1">
                          <p className="text-[14px] font-medium text-[#1d1d1f]">{activity.employee?.name}</p>
                      <p className="text-[13px] text-[#86868b]">
                        {activity.clock_out_time
                          ? `เช็คเอาท์ ${format(new Date(activity.clock_out_time), "HH:mm")} น.`
                          : `เช็คอิน ${format(new Date(activity.clock_in_time), "HH:mm")} น.`
                        }
                            {activity.is_late && !activity.clock_out_time && <span className="text-[#ff9500]"> (สาย)</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
        </>
      )}

      {/* Anomalies View */}
      {viewMode === "anomalies" && (
        <>
          {/* Filter */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2 p-1 bg-[#f5f5f7] rounded-xl">
              {["pending", "resolved", "ignored", "all"].map((status) => (
                <button
                  key={status}
                  onClick={() => setAnomalyFilter(status)}
                  className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-all ${
                    anomalyFilter === status
                      ? "bg-white text-[#1d1d1f] shadow-sm"
                      : "text-[#6e6e73] hover:text-[#1d1d1f]"
                  }`}
                >
                  {status === "pending" && "รอตรวจสอบ"}
                  {status === "resolved" && "ตรวจสอบแล้ว"}
                  {status === "ignored" && "ไม่ต้องดำเนินการ"}
                  {status === "all" && "ทั้งหมด"}
                </button>
              ))}
            </div>
            <Button variant="secondary" size="sm" onClick={fetchAnomalies}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Anomalies List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : anomalies.length === 0 ? (
            <Card elevated className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-[#34c759] mx-auto mb-4" />
              <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">ไม่มีรายการที่ต้องตรวจสอบ</h3>
              <p className="text-[15px] text-[#86868b]">ระบบทำงานปกติ</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {anomalies.map((anomaly) => {
                const typeInfo = anomalyTypeLabels[anomaly.anomaly_type] || {
                  label: anomaly.anomaly_type,
                  icon: AlertTriangle,
                  color: "text-[#86868b] bg-[#f5f5f7]",
                };
                const Icon = typeInfo.icon;

                return (
                  <Card key={anomaly.id} elevated className="hover:shadow-lg transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${typeInfo.color}`}>
                        <Icon className="w-6 h-6" />
          </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                          {anomaly.status === "pending" && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#ff3b30]/10 text-[#ff3b30]">
                              รอตรวจสอบ
                            </span>
                          )}
                          {anomaly.status === "resolved" && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#34c759]/10 text-[#34c759]">
                              ตรวจสอบแล้ว
                            </span>
                          )}
                          {anomaly.status === "ignored" && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#86868b]/10 text-[#86868b]">
                              ไม่ต้องดำเนินการ
              </span>
                          )}
                        </div>

                        <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-1">
                          {anomaly.employee?.name || "ไม่ระบุ"}
                        </h3>

                        <p className="text-[13px] text-[#86868b] mb-2">{anomaly.description}</p>

                        <p className="text-[12px] text-[#86868b] flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(anomaly.date), "d MMM yyyy", { locale: th })}
                        </p>
                      </div>

                      {anomaly.status === "pending" && (
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedAnomaly(anomaly);
                              setShowModal(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                            ตรวจสอบ
                          </Button>
                          <Link href={`/admin/attendance/edit/${anomaly.attendance_id}`}>
                            <Button size="sm" variant="secondary" fullWidth>
                              <Edit className="w-4 h-4" />
                              แก้ไข
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Resolve Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="ตรวจสอบความผิดปกติ">
        <div className="space-y-4">
          {selectedAnomaly && (
            <>
              <div className="p-4 bg-[#f5f5f7] rounded-xl">
                <p className="text-[13px] text-[#86868b] mb-1">พนักงาน</p>
                <p className="text-[15px] font-medium text-[#1d1d1f]">{selectedAnomaly.employee?.name}</p>
              </div>
              <div className="p-4 bg-[#f5f5f7] rounded-xl">
                <p className="text-[13px] text-[#86868b] mb-1">รายละเอียด</p>
                <p className="text-[15px] text-[#1d1d1f]">{selectedAnomaly.description}</p>
              </div>
            </>
          )}

          <div>
            <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">หมายเหตุ</label>
            <textarea
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all resize-none"
              placeholder="เพิ่มหมายเหตุ (ไม่บังคับ)..."
              />
            </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => setShowModal(false)} fullWidth>
              ยกเลิก
            </Button>
            <Button variant="secondary" onClick={() => handleResolve("ignored")} loading={resolving} fullWidth>
              <XCircle className="w-4 h-4" />
              ไม่ต้องดำเนินการ
            </Button>
            <Button onClick={() => handleResolve("resolved")} loading={resolving} fullWidth>
              <CheckCircle className="w-4 h-4" />
              ตรวจสอบแล้ว
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}

export default function MonitorPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <MonitorContent />
    </ProtectedRoute>
  );
}
