/**
 * Admin Monitor Hook
 * =============================================
 * State management and data fetching for the admin monitor page
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { useToast } from "@/components/ui/Toast";
import { format, differenceInMinutes } from "date-fns";

export type ViewMode = "realtime" | "anomalies";

export interface ActiveOT {
  id: string;
  employee: { id: string; name: string; email: string; is_system_account?: boolean };
  request_date: string;
  actual_start_time: string;
  approved_end_time: string;
  reason: string;
}

export interface TodayStats {
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

export interface Anomaly {
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

export interface RecentActivity {
  id: string;
  clock_in_time: string;
  clock_out_time?: string;
  is_late?: boolean;
  employee?: { name: string; is_system_account?: boolean };
}

export function useMonitor() {
  const { employee: currentAdmin } = useAuth();
  const toast = useToast();

  // View State
  const [viewMode, setViewMode] = useState<ViewMode>("realtime");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anomalyError, setAnomalyError] = useState<string | null>(null);

  // Realtime State
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
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [otTimes, setOtTimes] = useState<Record<string, string>>({});

  // Anomalies State
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [pendingAnomaliesCount, setPendingAnomaliesCount] = useState(0);
  const [anomalyFilter, setAnomalyFilter] = useState("pending");
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");

  const fetchRealtimeData = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const dayOfWeek = new Date().getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const [
        employeesResult,
        attendanceResult,
        activeOTResult,
        pendingOTResult,
        pendingLeaveResult,
        pendingWFHResult,
        recentResult,
        holidayResult,
        anomalyCountResult,
      ] = await Promise.all([
        supabase
          .from("employees")
          .select("id")
          .neq("role", "admin")
          .is("deleted_at", null)
          .or("is_system_account.is.null,is_system_account.eq.false"),
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
          .limit(20),
        supabase.from("holidays").select("id").eq("date", today).limit(1),
        supabase
          .from("attendance_anomalies")
          .select("id", { count: "exact" })
          .eq("status", "pending"),
      ]);

      setPendingAnomaliesCount(anomalyCountResult.count || 0);

      const isHoliday = (holidayResult.data?.length || 0) > 0;
      const isNonWorkingDay = isWeekend || isHoliday;
      const totalEmployees = employeesResult.data?.length || 0;

      const attendance = (attendanceResult.data || []).filter(
        (a: any) => !a.employee?.is_system_account
      );
      const checkedIn = attendance.filter((a: any) => a.clock_in_time).length;
      const checkedOut = attendance.filter((a: any) => a.clock_out_time).length;
      const late = attendance.filter((a: any) => a.is_late).length;
      const activeOTFiltered = (activeOTResult.data || []).filter(
        (ot: any) => !ot.employee?.is_system_account
      );
      const recentFiltered = (recentResult.data || [])
        .filter((a: any) => !a.employee?.is_system_account)
        .slice(0, 10);

      const now = new Date();
      const currentHour = now.getHours();
      const workStartHour = 9;
      const isBeforeWorkStart = currentHour < workStartHour;
      const notCheckedIn =
        isNonWorkingDay || isBeforeWorkStart ? 0 : totalEmployees - checkedIn;

      setStats({
        totalEmployees,
        checkedIn,
        checkedOut,
        notCheckedIn,
        late,
        onOT: activeOTFiltered.length,
        pendingOT: pendingOTResult.count || 0,
        pendingLeave: pendingLeaveResult.count || 0,
        pendingWFH: pendingWFHResult.count || 0,
      });
      setActiveOTs(activeOTFiltered);
      setRecentActivity(recentFiltered);
    } catch (err) {
      console.error("Error fetching monitor data:", err);
      setError(err instanceof Error ? err.message : "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchAnomalies = useCallback(async () => {
    setLoading(true);
    setAnomalyError(null);
    try {
      let query = supabase
        .from("attendance_anomalies")
        .select(
          `*, employee:employees!employee_id(name, email), resolver:employees!resolved_by(name)`
        )
        .order("created_at", { ascending: false });

      if (anomalyFilter !== "all") {
        query = query.eq("status", anomalyFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      const anomalyData = data || [];
      setAnomalies(anomalyData);
      if (anomalyFilter === "pending" || anomalyFilter === "all") {
        setPendingAnomaliesCount(
          anomalyData.filter((a: Anomaly) => a.status === "pending").length
        );
      }
    } catch (err) {
      console.error("Error fetching anomalies:", err);
      setAnomalyError(err instanceof Error ? err.message : "ไม่สามารถโหลดรายการความผิดปกติได้");
    } finally {
      setLoading(false);
    }
  }, [anomalyFilter]);

  // Auto-refresh based on view mode
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
  }, [viewMode, anomalyFilter, fetchRealtimeData, fetchAnomalies]);

  // Update OT elapsed times
  useEffect(() => {
    if (viewMode !== "realtime") return;
    const timer = setInterval(() => {
      const times: Record<string, string> = {};
      activeOTs.forEach((ot: ActiveOT) => {
        const minutes = differenceInMinutes(
          new Date(),
          new Date(ot.actual_start_time)
        );
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        times[ot.id] = `${hours.toString().padStart(2, "0")}:${mins
          .toString()
          .padStart(2, "0")}`;
      });
      setOtTimes(times);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeOTs, viewMode]);

  const handleResolve = useCallback(
    async (status: "resolved" | "ignored") => {
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

        toast.success(
          "บันทึกสำเร็จ",
          status === "resolved" ? "ตรวจสอบเรียบร้อยแล้ว" : "ไม่ต้องดำเนินการ"
        );
        setShowModal(false);
        setSelectedAnomaly(null);
        setResolutionNote("");
        fetchAnomalies();
      } catch (err) {
        toast.error("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกได้");
      } finally {
        setResolving(false);
      }
    },
    [selectedAnomaly, resolutionNote, currentAdmin?.id, toast, fetchAnomalies]
  );

  return {
    // View
    viewMode,
    setViewMode,
    loading,
    refreshing,
    error,
    anomalyError,

    // Realtime data
    stats,
    activeOTs,
    recentActivity,
    currentTime,
    otTimes,
    fetchRealtimeData,

    // Anomalies
    anomalies,
    anomalyFilter,
    setAnomalyFilter,
    fetchAnomalies,
    pendingAnomaliesCount,

    // Modal
    selectedAnomaly,
    setSelectedAnomaly,
    showModal,
    setShowModal,
    resolving,
    resolutionNote,
    setResolutionNote,
    handleResolve,
  };
}
