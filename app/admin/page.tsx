"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
}) {
  return (
    <Card elevated>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-[13px] text-[#86868b] uppercase tracking-wide">
            {title}
          </p>
          <p className="text-[28px] font-semibold text-[#1d1d1f]">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function AdminDashboardContent() {
  const { employee } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    present: 0,
    absent: 0,
    pendingOT: 0,
  });
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [pendingOT, setPendingOT] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      // นับเฉพาะพนักงานที่ไม่ใช่ admin
      const { count: totalEmployees } = await supabase
        .from("employees")
        .select("*", { count: "exact", head: true })
        .neq("role", "admin");

      // ดึงข้อมูลการเข้างานเฉพาะพนักงานที่ไม่ใช่ admin
      const { data: attendance } = await supabase
        .from("attendance_logs")
        .select(`*, employees!inner (name, email, role)`)
        .eq("work_date", today)
        .neq("employees.role", "admin")
        .order("clock_in_time", { ascending: false })
        .limit(8);

      const { data: otRequests } = await supabase
        .from("ot_requests")
        .select(`*, employee:employees!employee_id(name, email), approver:employees!approved_by(name, email)`)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);

      const present = attendance?.filter((a) => a.clock_in_time)?.length || 0;

      setStats({
        totalEmployees: totalEmployees || 0,
        present,
        absent: (totalEmployees || 0) - present,
        pendingOT: otRequests?.length || 0,
      });

      setTodayAttendance(attendance || []);
      setPendingOT(otRequests || []);
    } catch (error) {
      console.error("Error:", error);
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

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Dashboard"
      description={format(new Date(), "EEEE d MMMM yyyy", { locale: th })}
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="พนักงานทั้งหมด"
          value={stats.totalEmployees}
          icon={Users}
          color="bg-[#0071e3]"
        />
        <StatCard
          title="เข้างานแล้ว"
          value={stats.present}
          icon={UserCheck}
          color="bg-[#34c759]"
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
        />
      </div>

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
                      <Avatar name={log.employees?.name || "?"} size="sm" />
                      <div>
                        <p className="text-[15px] font-medium text-[#1d1d1f]">
                          {log.employees?.name}
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

        {/* Pending OT */}
        <div>
          <Card elevated padding="none">
            <div className="px-6 py-4 border-b border-[#e8e8ed]">
              <div className="flex items-center justify-between">
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                  รออนุมัติ OT
                </h3>
                {pendingOT.length > 0 && (
                  <Badge variant="warning">{pendingOT.length}</Badge>
                )}
              </div>
            </div>
            {pendingOT.length === 0 ? (
              <div className="text-center py-16 text-[#86868b]">
                ไม่มีคำขอ OT ที่รออนุมัติ
              </div>
            ) : (
              <div className="divide-y divide-[#e8e8ed]">
                {pendingOT.map((ot) => (
                  <div key={ot.id} className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar name={ot.employee?.name || "?"} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-[#1d1d1f] truncate">
                          {ot.employee?.name}
                        </p>
                        <p className="text-[12px] text-[#86868b]">
                          {format(new Date(ot.requested_start_time), "dd/MM HH:mm")} - {format(new Date(ot.requested_end_time), "HH:mm")}
                        </p>
                      </div>
                    </div>
                    <p className="text-[13px] text-[#6e6e73] mb-3 line-clamp-2">
                      {ot.reason}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApproveOT(ot.id, true)}
                        className="flex-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                        อนุมัติ
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleApproveOT(ot.id, false)}
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4" />
                        ปฏิเสธ
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
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
