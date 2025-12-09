"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  Users,
  Clock,
  Play,
  Square,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Timer,
  MapPin,
  Calendar,
  Activity,
} from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { th } from "date-fns/locale";

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

function MonitorContent() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<TodayStats>({
    totalEmployees: 0,
    checkedIn: 0,
    checkedOut: 0,
    notCheckedIn: 0,
    late: 0,
    onOT: 0,
    pendingOT: 0,
    pendingLeave: 0,
    pendingWFH: 0,
  });
  const [activeOTs, setActiveOTs] = useState<ActiveOT[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [otTimes, setOtTimes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAllData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAllData, 30000);

    // Update clock every second
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      clearInterval(interval);
      clearInterval(clockInterval);
    };
  }, []);

  // Update OT elapsed times
  useEffect(() => {
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
  }, [activeOTs]);

  const fetchAllData = async () => {
    setRefreshing(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");

      // Fetch all data in parallel
      const [
        employeesResult,
        attendanceResult,
        activeOTResult,
        pendingOTResult,
        pendingLeaveResult,
        pendingWFHResult,
        recentResult,
      ] = await Promise.all([
        // กรองเฉพาะพนักงานจริง (ไม่รวมบัญชีระบบ)
        supabase
          .from("employees")
          .select("id")
          .neq("role", "admin")
          .or("is_system_account.is.null,is_system_account.eq.false"),
        // ดึง attendance พร้อมข้อมูลพนักงาน
        supabase
          .from("attendance_logs")
          .select("*, employee:employees!employee_id(id, is_system_account)")
          .eq("work_date", today),
        supabase
          .from("ot_requests")
          .select("*, employee:employees!employee_id(id, name, email, is_system_account)")
          .eq("status", "approved")
          .not("actual_start_time", "is", null)
          .is("actual_end_time", null),
        supabase.from("ot_requests").select("id", { count: "exact" }).eq("status", "pending"),
        supabase.from("leave_requests").select("id", { count: "exact" }).eq("status", "pending"),
        supabase.from("wfh_requests").select("id", { count: "exact" }).eq("status", "pending"),
        supabase
          .from("attendance_logs")
          .select("*, employee:employees!employee_id(name, is_system_account)")
          .eq("work_date", today)
          .order("clock_in_time", { ascending: false })
          .limit(20), // Fetch more to filter
      ]);

      const totalEmployees = employeesResult.data?.length || 0;

      // กรอง attendance เฉพาะพนักงานจริง (ไม่รวมบัญชีระบบ)
      const attendance = (attendanceResult.data || []).filter(
        (a: any) => !a.employee?.is_system_account
      );
      const checkedIn = attendance.filter((a: any) => a.clock_in_time).length;
      const checkedOut = attendance.filter((a: any) => a.clock_out_time).length;
      const late = attendance.filter((a: any) => a.is_late).length;

      // กรอง OT เฉพาะพนักงานจริง
      const activeOTFiltered = (activeOTResult.data || []).filter(
        (ot: any) => !ot.employee?.is_system_account
      );

      // กรอง activity เฉพาะพนักงานจริง
      const recentFiltered = (recentResult.data || [])
        .filter((a: any) => !a.employee?.is_system_account)
        .slice(0, 10);

      setStats({
        totalEmployees,
        checkedIn,
        checkedOut,
        notCheckedIn: totalEmployees - checkedIn,
        late,
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

  if (loading) {
    return (
      <AdminLayout title="Monitor">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="📊 Real-time Monitor" description="ติดตามสถานะพนักงานแบบเรียลไทม์">
      {/* Header with Clock */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-[40px] font-light text-[#1d1d1f]">
              {format(currentTime, "HH:mm:ss")}
            </p>
            <p className="text-[14px] text-[#86868b]">
              {format(currentTime, "EEEE d MMMM yyyy", { locale: th })}
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={fetchAllData}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "กำลังอัปเดต..." : "อัปเดต"}
        </Button>
      </div>

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
        <Card elevated className="mb-6 border-l-4 border-l-[#ff9500] bg-[#ff9500]/5">
          <div className="flex items-center gap-4">
            <AlertTriangle className="w-6 h-6 text-[#ff9500]" />
            <div className="flex-1">
              <p className="text-[15px] font-semibold text-[#1d1d1f]">คำขอรออนุมัติ</p>
              <div className="flex gap-4 mt-1">
                {stats.pendingOT > 0 && (
                  <span className="text-[13px] text-[#ff9500]">OT: {stats.pendingOT} รายการ</span>
                )}
                {stats.pendingLeave > 0 && (
                  <span className="text-[13px] text-[#af52de]">ลา: {stats.pendingLeave} รายการ</span>
                )}
                {stats.pendingWFH > 0 && (
                  <span className="text-[13px] text-[#0071e3]">WFH: {stats.pendingWFH} รายการ</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active OT Section */}
        <Card elevated padding="none">
          <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className="w-5 h-5 text-[#ff9500]" />
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">กำลังทำ OT</h3>
            </div>
            {activeOTs.length > 0 && (
              <Badge variant="warning">{activeOTs.length} คน</Badge>
            )}
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
                  <div
                    key={ot.id}
                    className="flex items-center justify-between p-4 bg-[#ff9500]/10 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={ot.employee.name} size="sm" />
                      <div>
                        <p className="text-[15px] font-medium text-[#1d1d1f]">
                          {ot.employee.name}
                        </p>
                        <p className="text-[13px] text-[#86868b]">
                          เริ่ม: {format(new Date(ot.actual_start_time), "HH:mm")} น.
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[24px] font-semibold text-[#ff9500]">
                        {otTimes[ot.id] || "00:00"}
                      </p>
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
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-3 hover:bg-[#f5f5f7] rounded-xl transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activity.clock_out_time
                        ? "bg-[#34c759]/10"
                        : activity.is_late
                          ? "bg-[#ff9500]/10"
                          : "bg-[#0071e3]/10"
                      }`}>
                      {activity.clock_out_time ? (
                        <XCircle className="w-5 h-5 text-[#34c759]" />
                      ) : (
                        <CheckCircle className={`w-5 h-5 ${activity.is_late ? "text-[#ff9500]" : "text-[#0071e3]"}`} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-[14px] font-medium text-[#1d1d1f]">
                        {activity.employee?.name}
                      </p>
                      <p className="text-[13px] text-[#86868b]">
                        {activity.clock_out_time
                          ? `เช็คเอาท์ ${format(new Date(activity.clock_out_time), "HH:mm")} น.`
                          : `เช็คอิน ${format(new Date(activity.clock_in_time), "HH:mm")} น.`
                        }
                        {activity.is_late && !activity.clock_out_time && (
                          <span className="text-[#ff9500]"> (สาย)</span>
                        )}
                      </p>
                    </div>
                    <p className="text-[12px] text-[#86868b]">
                      {format(new Date(activity.clock_in_time), "HH:mm")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Attendance Progress */}
      <Card elevated className="mt-6">
        <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">
          สรุปการเข้างานวันนี้
        </h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-[14px] mb-2">
              <span className="text-[#6e6e73]">เช็คอินแล้ว</span>
              <span className="font-medium text-[#34c759]">
                {stats.checkedIn} / {stats.totalEmployees} คน ({Math.round((stats.checkedIn / stats.totalEmployees) * 100) || 0}%)
              </span>
            </div>
            <div className="h-3 bg-[#f5f5f7] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#34c759] to-[#28a745] rounded-full transition-all duration-500"
                style={{ width: `${(stats.checkedIn / stats.totalEmployees) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[14px] mb-2">
              <span className="text-[#6e6e73]">เช็คเอาท์แล้ว</span>
              <span className="font-medium text-[#0071e3]">
                {stats.checkedOut} / {stats.checkedIn} คน ({Math.round((stats.checkedOut / stats.checkedIn) * 100) || 0}%)
              </span>
            </div>
            <div className="h-3 bg-[#f5f5f7] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#0071e3] to-[#005bb5] rounded-full transition-all duration-500"
                style={{ width: `${(stats.checkedOut / stats.checkedIn) * 100 || 0}%` }}
              />
            </div>
          </div>
        </div>
      </Card>
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

