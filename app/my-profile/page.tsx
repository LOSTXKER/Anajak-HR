"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Card } from "@/components/ui/Card";
import { BottomNav } from "@/components/BottomNav";
import { ProfileSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { X } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { MonthNavigator } from "@/components/profile/MonthNavigator";
import { OverviewTab } from "@/components/profile/OverviewTab";
import { AttendanceTab } from "@/components/profile/AttendanceTab";
import { OTTab } from "@/components/profile/OTTab";
import { LeaveTab } from "@/components/profile/LeaveTab";
import { WFHTab } from "@/components/profile/WFHTab";
import { LateTab } from "@/components/profile/LateTab";
import type { TabType, AttendanceRecord, OTRecord, LeaveRecord, WFHRecord, LateRequestRecord, LeaveQuota } from "@/components/profile/types";

export default function MyProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const { user, employee, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [photoModal, setPhotoModal] = useState<{ url: string; type: string } | null>(null);
  const [canceling, setCanceling] = useState<string | null>(null);

  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [otData, setOtData] = useState<OTRecord[]>([]);
  const [leaveData, setLeaveData] = useState<LeaveRecord[]>([]);
  const [wfhData, setWfhData] = useState<WFHRecord[]>([]);
  const [lateData, setLateData] = useState<LateRequestRecord[]>([]);
  const [leaveQuotas, setLeaveQuotas] = useState<LeaveQuota[]>([]);
  const [pendingRequests, setPendingRequests] = useState({ ot: 0, leave: 0, wfh: 0, late: 0 });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const fetchData = useCallback(async () => {
    if (!employee?.id) return;

    setLoading(true);
    const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    try {
      const [attRes, otRes, leaveRes, wfhRes, lateRes, pendingOtRes, pendingLeaveRes, pendingWfhRes, pendingLateRes] =
        await Promise.all([
          supabase.from("attendance_logs").select("*").eq("employee_id", employee.id).gte("work_date", startDate).lte("work_date", endDate).order("work_date", { ascending: false }),
          supabase.from("ot_requests").select("*").eq("employee_id", employee.id).gte("request_date", startDate).lte("request_date", endDate).order("request_date", { ascending: false }),
          supabase.from("leave_requests").select("*").eq("employee_id", employee.id).or(`start_date.lte.${endDate},end_date.gte.${startDate}`).order("start_date", { ascending: false }),
          supabase.from("wfh_requests").select("*").eq("employee_id", employee.id).gte("date", startDate).lte("date", endDate).order("date", { ascending: false }),
          supabase.from("late_requests").select("*").eq("employee_id", employee.id).gte("request_date", startDate).lte("request_date", endDate).order("request_date", { ascending: false }),
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

      const currentYear = new Date().getFullYear();
      const { data: balanceData } = await supabase
        .from("leave_balances")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("year", currentYear)
        .single();

      setLeaveQuotas([
        { type: "sick", label: "ลาป่วย", quota: (employee as any).sick_leave_quota || 30, used: balanceData?.sick_leave_used || 0, remaining: balanceData?.sick_leave_remaining || (employee as any).sick_leave_quota || 30, color: "#ff3b30" },
        { type: "personal", label: "ลากิจ", quota: (employee as any).personal_leave_quota || 3, used: balanceData?.personal_leave_used || 0, remaining: balanceData?.personal_leave_remaining || (employee as any).personal_leave_quota || 3, color: "#ff9500" },
        { type: "annual", label: "ลาพักร้อน", quota: (employee as any).annual_leave_quota || 10, used: balanceData?.annual_leave_used || 0, remaining: balanceData?.annual_leave_remaining || (employee as any).annual_leave_quota || 10, color: "#0071e3" },
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [employee?.id, currentMonth]);

  useEffect(() => {
    if (employee?.id) {
      fetchData();
    }
  }, [employee?.id, currentMonth, fetchData]);

  const monthlyStats = useMemo(() => ({
    workDays: attendanceData.filter((a) => a.clock_in_time).length,
    lateDays: attendanceData.filter((a) => a.is_late).length,
    totalHours: attendanceData.reduce((sum, a) => sum + (a.total_hours || 0), 0),
    otHours: otData.filter((o) => ["approved", "completed"].includes(o.status)).reduce((sum, o) => sum + (o.actual_ot_hours || o.approved_ot_hours || 0), 0),
    otAmount: otData.filter((o) => ["approved", "completed"].includes(o.status)).reduce((sum, o) => sum + (o.ot_amount || 0), 0),
    leaveDays: leaveData.filter((l) => l.status === "approved").length,
    wfhDays: new Set([
      ...wfhData.filter((w) => w.status === "approved").map((w) => w.date),
      ...attendanceData.filter((a) => a.work_mode === "wfh").map((a) => a.work_date),
    ]).size,
  }), [attendanceData, otData, leaveData, wfhData]);

  const handleCancel = async (type: "leave" | "wfh", id: string) => {
    setCanceling(id);
    try {
      const table = type === "leave" ? "leave_requests" : "wfh_requests";
      const { error } = await supabase.from(table).update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
      toast.success("ยกเลิกสำเร็จ", `ยกเลิกคำขอ${type === "leave" ? "ลา" : "WFH"}เรียบร้อย`);
      fetchData();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message || "ไม่สามารถยกเลิกได้");
    } finally {
      setCanceling(null);
    }
  };

  if (authLoading || !employee) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] pb-20 pt-safe">
        <main className="max-w-[600px] mx-auto px-4 pt-6 pb-4">
          <ProfileSkeleton />
        </main>
        <BottomNav />
      </div>
    );
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: "overview", label: "ภาพรวม" },
    { id: "attendance", label: "เข้างาน" },
    { id: "ot", label: "OT" },
    { id: "leave", label: "ลา" },
    { id: "wfh", label: "WFH" },
    { id: "late", label: "ขอสาย" },
  ];

  return (
    <div className="min-h-screen bg-[#fbfbfd] pb-20 pt-safe">
      <main className="max-w-[600px] mx-auto px-4 pt-6 pb-4">
        <h1 className="text-[32px] font-bold text-[#1d1d1f] mb-6">ประวัติของฉัน</h1>

        <ProfileHeader employee={employee} pendingRequests={pendingRequests} />

        {/* Leave Quota Cards */}
        {leaveQuotas.length > 0 && (
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
        )}

        <MonthNavigator
          currentMonth={currentMonth}
          onChangeMonth={setCurrentMonth}
          stats={monthlyStats}
        />

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[#f5f5f7] rounded-xl mb-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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
            {activeTab === "overview" && (
              <OverviewTab attendanceData={attendanceData} otData={otData} leaveData={leaveData} wfhData={wfhData} />
            )}
            {activeTab === "attendance" && (
              <AttendanceTab data={attendanceData} onViewPhoto={(url, type) => setPhotoModal({ url, type })} />
            )}
            {activeTab === "ot" && <OTTab data={otData} />}
            {activeTab === "leave" && <LeaveTab data={leaveData} canceling={canceling} onCancel={handleCancel} />}
            {activeTab === "wfh" && <WFHTab data={wfhData} canceling={canceling} onCancel={handleCancel} />}
            {activeTab === "late" && <LateTab data={lateData} />}
          </>
        )}
      </main>

      <BottomNav />

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
