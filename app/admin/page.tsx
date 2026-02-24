"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { useWorkSettings } from "@/lib/hooks/use-settings";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Home,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  AlertTriangle,
  Trophy,
  Flame,
  Star,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { getLeaderboard, type LeaderboardEntry, RANK_TIERS } from "@/lib/services/gamification.service";

const RANK_BADGE_SOLID: Record<string, { bg: string; text: string; icon: string }> = {
  Unranked: { bg: "bg-[#636366]", text: "text-white", icon: "🔒" },
  Bronze:   { bg: "bg-gradient-to-r from-[#d97706] to-[#b45309]", text: "text-white", icon: "🥉" },
  Silver:   { bg: "bg-gradient-to-r from-[#6b7280] to-[#4b5563]", text: "text-white", icon: "🥈" },
  Gold:     { bg: "bg-gradient-to-r from-[#f59e0b] to-[#d97706]", text: "text-[#1c0a00]", icon: "🥇" },
  Platinum: { bg: "bg-gradient-to-r from-[#0ea5e9] to-[#6366f1]", text: "text-white", icon: "💎" },
  Diamond:  { bg: "bg-gradient-to-r from-[#d946ef] via-[#818cf8] to-[#22d3ee]", text: "text-white", icon: "👑" },
};

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  href,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  href?: string;
}) {
  const content = (
    <Card elevated className={href ? "hover:shadow-lg transition-shadow cursor-pointer" : ""}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-[13px] text-[#86868b] uppercase tracking-wide">
            {title}
          </p>
          <p className="text-[28px] font-semibold text-[#1d1d1f]">{value}</p>
        </div>
        {href && <ChevronRight className="w-5 h-5 text-[#86868b]" />}
      </div>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function AdminDashboardContent() {
  const { employee } = useAuth();
  const { settings: workSettings } = useWorkSettings();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    present: 0,
    absent: 0,
    pendingOT: 0,
    pendingLeave: 0,
    pendingWFH: 0,
  });
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<{
    ot: any[];
    leave: any[];
    wfh: any[];
  }>({ ot: [], leave: [], wfh: [] });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const dayOfWeek = new Date().getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // ตรวจสอบว่าวันนี้เป็นวันหยุดหรือไม่
      const { data: holidayData } = await supabase
        .from("holidays")
        .select("id")
        .eq("date", today)
        .limit(1);
      const isHoliday = (holidayData?.length || 0) > 0;
      const isNonWorkingDay = isWeekend || isHoliday;

      // นับเฉพาะพนักงานที่ไม่ใช่ admin และยังไม่ถูกลบ
      const { count: totalEmployees } = await supabase
        .from("employees")
        .select("*", { count: "exact", head: true })
        .neq("role", "admin")
        .eq("account_status", "approved")
        .is("deleted_at", null);

      // ดึงข้อมูลการเข้างานวันนี้ (ระบุ foreign key ชัดเจน)
      const { data: attendanceRaw, error: attendanceError } = await supabase
        .from("attendance_logs")
        .select(`*, employee:employees!employee_id (id, name, email, role)`)
        .eq("work_date", today)
        .order("clock_in_time", { ascending: false });

      if (attendanceError) {
        console.error("Attendance fetch error:", attendanceError);
      }

      // Filter เฉพาะที่ไม่ใช่ admin
      const attendance = (attendanceRaw || [])
        .filter((a: any) => a.employee?.role !== "admin")
        .slice(0, 8);

      // ดึงคำขอ OT ที่รออนุมัติ
      const { data: otRequests } = await supabase
        .from("ot_requests")
        .select(`*, employee:employees!employee_id(name, email)`)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);

      // ดึงคำขอลาที่รออนุมัติ
      const { data: leaveRequests } = await supabase
        .from("leave_requests")
        .select(`*, employee:employees!employee_id(name, email)`)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);

      // ดึงคำขอ WFH ที่รออนุมัติ
      const { data: wfhRequests } = await supabase
        .from("wfh_requests")
        .select(`*, employee:employees!employee_id(name, email)`)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);

      const present = attendance?.filter((a: any) => a.clock_in_time)?.length || 0;
      
      const now = new Date();
      const currentHour = now.getHours();
      const workStartTime = workSettings?.workStartTime || "09:00";
      const workStartHour = parseInt(workStartTime.split(":")[0], 10);
      const isBeforeWorkStart = currentHour < workStartHour;
      
      // วันหยุด/สุดสัปดาห์ หรือ ก่อนเวลาเข้างาน → ไม่นับขาดงาน
      const absent = (isNonWorkingDay || isBeforeWorkStart) ? 0 : (totalEmployees || 0) - present;

      // Fetch leaderboard
      let lb: LeaderboardEntry[] = [];
      try {
        lb = await getLeaderboard("quarterly");
      } catch {
        // gamification might be disabled
      }

      setStats({
        totalEmployees: totalEmployees || 0,
        present,
        absent,
        pendingOT: otRequests?.length || 0,
        pendingLeave: leaveRequests?.length || 0,
        pendingWFH: wfhRequests?.length || 0,
      });

      setTodayAttendance(attendance || []);
      setPendingRequests({
        ot: otRequests || [],
        leave: leaveRequests || [],
        wfh: wfhRequests || [],
      });
      setLeaderboard(lb.slice(0, 5));
    } catch (err: any) {
      console.error("Error:", err);
      setError("ไม่สามารถโหลดข้อมูล Dashboard ได้");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveOT = async (id: string, approved: boolean) => {
    try {
      await supabase
        .from("ot_requests")
        .update({
          status: approved ? "approved" : "rejected",
          approved_by: employee?.id,
        })
        .eq("id", id);
      fetchDashboardData();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleApproveLeave = async (id: string, approved: boolean) => {
    try {
      await supabase
        .from("leave_requests")
        .update({
          status: approved ? "approved" : "rejected",
          approved_by: employee?.id,
        })
        .eq("id", id);
      fetchDashboardData();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleApproveWFH = async (id: string, approved: boolean) => {
    try {
      await supabase
        .from("wfh_requests")
        .update({
          status: approved ? "approved" : "rejected",
          approved_by: employee?.id,
        })
        .eq("id", id);
      fetchDashboardData();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const totalPending = stats.pendingOT + stats.pendingLeave + stats.pendingWFH;

  if (loading) {
    return (
      <AdminLayout title="Dashboard" description={format(new Date(), "EEEE d MMMM yyyy", { locale: th })}>
        <DashboardSkeleton />
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Dashboard" description={format(new Date(), "EEEE d MMMM yyyy", { locale: th })}>
        <Card elevated className="border-l-4 border-l-[#ff3b30]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#ff3b30]/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-[#ff3b30]" />
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-semibold text-[#1d1d1f]">{error}</p>
              <p className="text-[13px] text-[#86868b]">กรุณาลองใหม่อีกครั้ง</p>
            </div>
            <button
              onClick={fetchDashboardData}
              className="flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-[#0071e3] bg-[#0071e3]/10 rounded-xl hover:bg-[#0071e3]/15 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              ลองใหม่
            </button>
          </div>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Dashboard"
      description={format(new Date(), "EEEE d MMMM yyyy", { locale: th })}
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard
          title="พนักงานทั้งหมด"
          value={stats.totalEmployees}
          icon={Users}
          color="bg-[#0071e3]"
          href="/admin/employees"
        />
        <StatCard
          title="เข้างานแล้ว"
          value={stats.present}
          icon={UserCheck}
          color="bg-[#34c759]"
          href="/admin/attendance"
        />
        <StatCard
          title="ยังไม่เข้างาน"
          value={stats.absent}
          icon={UserX}
          color="bg-[#ff3b30]"
        />
        <StatCard
          title="รอ OT"
          value={stats.pendingOT}
          icon={Clock}
          color="bg-[#ff9500]"
          href="/admin/requests?tab=pending&type=ot"
        />
        <StatCard
          title="รอลา"
          value={stats.pendingLeave}
          icon={FileText}
          color="bg-[#af52de]"
          href="/admin/requests?tab=pending&type=leave"
        />
        <StatCard
          title="รอ WFH"
          value={stats.pendingWFH}
          icon={Home}
          color="bg-[#5856d6]"
          href="/admin/requests?tab=pending&type=wfh"
        />
      </div>

      {/* Alert for pending requests */}
      {totalPending > 0 && (
        <Card elevated className="mb-6 border-l-4 border-l-[#ff9500] bg-[#ff9500]/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ff9500]/20 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#ff9500]" />
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-semibold text-[#1d1d1f]">
                มี {totalPending} คำขอรออนุมัติ
              </p>
              <p className="text-[13px] text-[#86868b]">
                OT: {stats.pendingOT} • ลา: {stats.pendingLeave} • WFH: {stats.pendingWFH}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Attendance */}
        <div className="lg:col-span-2">
          <Card elevated padding="none">
            <div className="px-6 py-4 border-b border-[#e8e8ed]">
              <div className="flex items-center justify-between">
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                  การเข้างานวันนี้
                </h3>
                <Badge variant="info">{todayAttendance.length} คน</Badge>
              </div>
            </div>
            {todayAttendance.length === 0 ? (
              <div className="text-center py-16 text-[#86868b]">
                ยังไม่มีข้อมูลการเข้างานวันนี้
              </div>
            ) : (
              <div className="divide-y divide-[#e8e8ed]">
                {todayAttendance.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={log.employee?.name || "?"} size="sm" />
                      <div>
                        <p className="text-[15px] font-medium text-[#1d1d1f]">
                          {log.employee?.name}
                        </p>
                        <p className="text-[13px] text-[#86868b]">
                          เข้า: {log.clock_in_time ? format(new Date(log.clock_in_time), "HH:mm") : "-"}
                          {log.clock_out_time && ` • ออก: ${format(new Date(log.clock_out_time), "HH:mm")}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant={log.is_late ? "warning" : "success"}>
                      {log.is_late ? "สาย" : "ปกติ"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Pending Requests Summary */}
        <div className="space-y-6">
          <Card elevated>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#ff9500]" />
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                  รอการอนุมัติ
              </h3>
              </div>
              <Link
                href="/admin/requests?tab=pending"
                className="text-[14px] text-[#0071e3] hover:underline"
              >
                จัดการทั้งหมด →
              </Link>
            </div>

            {totalPending === 0 ? (
              <div className="flex items-center gap-3 p-4 bg-[#34c759]/10 rounded-xl">
                <CheckCircle className="w-6 h-6 text-[#34c759]" />
                <p className="text-[14px] text-[#1d1d1f]">ไม่มีรายการรออนุมัติ</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.ot.length > 0 && (
                  <Link
                    href="/admin/requests?tab=pending&type=ot"
                    className="flex items-center justify-between p-3 bg-[#ff9500]/10 rounded-xl hover:bg-[#ff9500]/15 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-[#ff9500]" />
                      <span className="text-[14px] text-[#1d1d1f]">คำขอ OT</span>
                    </div>
                    <Badge variant="warning">{pendingRequests.ot.length}</Badge>
                  </Link>
                )}

                {pendingRequests.leave.length > 0 && (
                  <Link
                    href="/admin/requests?tab=pending&type=leave"
                    className="flex items-center justify-between p-3 bg-[#0071e3]/10 rounded-xl hover:bg-[#0071e3]/15 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-[#af52de]" />
                      <span className="text-[14px] text-[#1d1d1f]">คำขอลางาน</span>
                    </div>
                    <Badge variant="info">{pendingRequests.leave.length}</Badge>
                  </Link>
                )}

                {pendingRequests.wfh.length > 0 && (
                  <Link
                    href="/admin/requests?tab=pending&type=wfh"
                    className="flex items-center justify-between p-3 bg-[#34c759]/10 rounded-xl hover:bg-[#34c759]/15 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Home className="w-5 h-5 text-[#5856d6]" />
                      <span className="text-[14px] text-[#1d1d1f]">คำขอ WFH</span>
                    </div>
                    <Badge variant="success">{pendingRequests.wfh.length}</Badge>
                  </Link>
                )}
              </div>
            )}
          </Card>

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <Card elevated padding="none">
              <div className="px-5 py-4 border-b border-[#e8e8ed]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-[#ffd700]" />
                    <h3 className="text-[17px] font-semibold text-[#1d1d1f]">Leaderboard</h3>
                  </div>
                  <Link
                    href="/leaderboard"
                    className="text-[14px] text-[#0071e3] hover:underline"
                  >
                    ดูทั้งหมด →
                  </Link>
                </div>
                <p className="text-[12px] text-[#86868b] mt-0.5">อันดับเดือนนี้</p>
              </div>
              <div className="divide-y divide-[#f5f5f7]">
                {leaderboard.map((entry) => {
                  const medals = ["text-[#ffd700]", "text-[#c0c0c0]", "text-[#cd7f32]"];
                  return (
                    <Link
                      key={entry.employeeId}
                      href={`/admin/employees/${entry.employeeId}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-[#f5f5f7]/50 transition-colors"
                    >
                      <div className="w-7 text-center">
                        {entry.rank <= 3 ? (
                          <Trophy className={`w-4 h-4 mx-auto ${medals[entry.rank - 1]}`} />
                        ) : (
                          <span className="text-[14px] font-bold text-[#86868b]">{entry.rank}</span>
                        )}
                      </div>
                      <Avatar name={entry.employeeName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-[#1d1d1f] truncate">{entry.employeeName}</p>
                        <div className="flex items-center gap-2 text-[11px] text-[#86868b]">
                          <span>Lv.{entry.level}</span>
                          {entry.currentStreak > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Flame className="w-3 h-3 text-[#ff9500]" />
                              {entry.currentStreak}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {(() => {
                          const tier = entry.rankTier || "Unranked";
                          const s = RANK_BADGE_SOLID[tier] || RANK_BADGE_SOLID.Unranked;
                          if (tier === "Unranked") return null;
                          return (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
                              <span>{s.icon}</span>{tier}
                            </span>
                          );
                        })()}
                        <p className="text-[15px] font-bold text-[#1d1d1f]">{entry.quarterlyPoints}</p>
                        <p className="text-[10px] text-[#86868b]">pts</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
