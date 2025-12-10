"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { TimeInput } from "@/components/ui/TimeInput";
import { DateInput } from "@/components/ui/DateInput";
import { useToast } from "@/components/ui/Toast";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Clock,
  Camera,
  Edit,
  Plus,
  Users,
  AlertTriangle,
  CheckCircle2,
  Home,
  Calendar,
  X,
  Sun,
  DollarSign,
  Timer,
  UserX,
  Briefcase,
  MapPin,
  Info,
} from "lucide-react";
import Link from "next/link";
import { format, addDays, subDays, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { th } from "date-fns/locale";

// Types
interface Employee {
  id: string;
  name: string;
  email: string;
  branch_id: string | null;
  role: string;
}

interface Branch {
  id: string;
  name: string;
}

interface AttendanceRecord {
  id: string;
  clockIn: string | null;
  clockOut: string | null;
  workHours: number | null;
  isLate: boolean;
  lateMinutes: number;
  status: string;
  autoCheckout: boolean;
  editedAt: string | null;
  clockInPhotoUrl: string | null;
  clockOutPhotoUrl: string | null;
}

interface OTRecord {
  id: string;
  requestDate: string;
  otType: string;
  startTime: string | null;
  endTime: string | null;
  approvedHours: number | null;
  actualHours: number | null;
  amount: number | null;
  rate: number | null;
  status: string;
}

interface LeaveRecord {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  reason: string;
  status: string;
}

interface WFHRecord {
  id: string;
  date: string;
  isHalfDay: boolean;
  reason: string;
  status: string;
}

interface LateRequestRecord {
  id: string;
  requestDate: string;
  clockInTime: string;
  reason: string;
  status: string;
}

interface DaySummary {
  employee: Employee;
  attendance: AttendanceRecord | null;
  ot: OTRecord[];
  leave: LeaveRecord | null;
  wfh: WFHRecord | null;
  lateRequest: LateRequestRecord | null;
}

interface AttendanceLog {
  id: string;
  employee_id: string;
  work_date: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  clock_in_photo_url: string | null;
  clock_out_photo_url: string | null;
  total_hours: number | null;
  is_late: boolean;
  late_minutes: number;
  status: string;
  auto_checkout: boolean;
  edited_at: string | null;
  employee: Employee;
}

type ViewMode = "daily" | "history";

function AttendanceContent() {
  const { employee: currentAdmin } = useAuth();
  const toast = useToast();

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Data state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // Daily view state
  const [daySummaries, setDaySummaries] = useState<DaySummary[]>([]);

  // History view state
  const [historyLogs, setHistoryLogs] = useState<AttendanceLog[]>([]);
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterBranch, setFilterBranch] = useState("");

  // Modals
  const [addModal, setAddModal] = useState(false);
  const [photoModal, setPhotoModal] = useState<string | null>(null);
  const [detailModal, setDetailModal] = useState<{
    type: "ot" | "leave" | "wfh" | "late";
    employee: Employee;
    data: any;
  } | null>(null);

  const [addForm, setAddForm] = useState({
    employeeId: "",
    workDate: format(new Date(), "yyyy-MM-dd"),
    clockInTime: "09:00",
    clockOutTime: "18:00",
    status: "present",
    isLate: false,
    note: "",
  });
  const [saving, setSaving] = useState(false);

  // Fetch base data
  useEffect(() => {
    const fetchBaseData = async () => {
      const [empRes, branchRes] = await Promise.all([
        supabase
          .from("employees")
          .select("id, name, email, branch_id, role")
          .eq("account_status", "approved")
          .neq("role", "admin")
          .order("name"),
        supabase.from("branches").select("id, name").order("name"),
      ]);
      setEmployees(empRes.data || []);
      setBranches(branchRes.data || []);
    };
    fetchBaseData();
  }, []);

  // Fetch daily summary
  const fetchDailySummary = useCallback(async () => {
    if (viewMode !== "daily" || employees.length === 0) return;

    setLoading(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    try {
      const [attRes, otRes, leaveRes, wfhRes, lateReqRes] = await Promise.all([
        supabase.from("attendance_logs").select("*").eq("work_date", dateStr),
        supabase
          .from("ot_requests")
          .select("*")
          .eq("request_date", dateStr)
          .in("status", ["approved", "started", "completed"]),
        supabase
          .from("leave_requests")
          .select("*")
          .eq("status", "approved")
          .lte("start_date", dateStr)
          .gte("end_date", dateStr),
        supabase.from("wfh_requests").select("*").eq("status", "approved").eq("date", dateStr),
        supabase.from("late_requests").select("*").eq("request_date", dateStr),
      ]);

      const summaries: DaySummary[] = employees.map((emp) => {
        const att = (attRes.data || []).find((a: any) => a.employee_id === emp.id);
        const empOt = (otRes.data || []).filter((o: any) => o.employee_id === emp.id);
        const empLeave = (leaveRes.data || []).find((l: any) => l.employee_id === emp.id);
        const empWfh = (wfhRes.data || []).find((w: any) => w.employee_id === emp.id);
        const empLateReq = (lateReqRes.data || []).find((lr: any) => lr.employee_id === emp.id);

        return {
          employee: emp,
          attendance: att
            ? {
                id: att.id,
                clockIn: att.clock_in_time,
                clockOut: att.clock_out_time,
                workHours: att.total_hours,
                isLate: att.is_late,
                lateMinutes: att.late_minutes || 0,
                status: att.status,
                autoCheckout: att.auto_checkout || false,
                editedAt: att.edited_at,
                clockInPhotoUrl: att.clock_in_photo_url,
                clockOutPhotoUrl: att.clock_out_photo_url,
              }
            : null,
          ot: empOt.map((o: any) => ({
            id: o.id,
            requestDate: o.request_date,
            otType: o.ot_type,
            startTime: o.actual_start_time,
            endTime: o.actual_end_time,
            approvedHours: o.approved_ot_hours,
            actualHours: o.actual_ot_hours,
            amount: o.ot_amount,
            rate: o.ot_rate,
            status: o.status,
          })),
          leave: empLeave
            ? {
                id: empLeave.id,
                leaveType: empLeave.leave_type,
                startDate: empLeave.start_date,
                endDate: empLeave.end_date,
                isHalfDay: empLeave.is_half_day,
                reason: empLeave.reason,
                status: empLeave.status,
              }
            : null,
          wfh: empWfh
            ? {
                id: empWfh.id,
                date: empWfh.date,
                isHalfDay: empWfh.is_half_day,
                reason: empWfh.reason,
                status: empWfh.status,
              }
            : null,
          lateRequest: empLateReq
            ? {
                id: empLateReq.id,
                requestDate: empLateReq.request_date,
                clockInTime: empLateReq.actual_clock_in_time,
                reason: empLateReq.reason,
                status: empLateReq.status,
              }
            : null,
        };
      });

      setDaySummaries(summaries);
    } catch (error) {
      console.error("Error fetching daily summary:", error);
    } finally {
      setLoading(false);
    }
  }, [viewMode, selectedDate, employees]);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    if (viewMode !== "history") return;

    setLoading(true);
    try {
      const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      let query = supabase
        .from("attendance_logs")
        .select("*, employee:employees!employee_id(id, name, email, branch_id, role)")
        .gte("work_date", startDate)
        .lte("work_date", endDate)
        .order("work_date", { ascending: false });

      if (filterEmployee) query = query.eq("employee_id", filterEmployee);
      if (filterStatus === "late") query = query.eq("is_late", true);
      else if (filterStatus === "normal") query = query.eq("is_late", false).neq("status", "holiday");
      else if (filterStatus === "holiday") query = query.eq("status", "holiday");
      else if (filterStatus === "no_checkout") query = query.is("clock_out_time", null);

      const { data } = await query;

      let logs = (data || []) as AttendanceLog[];
      if (filterBranch) {
        logs = logs.filter((l) => l.employee?.branch_id === filterBranch);
      }

      setHistoryLogs(logs);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  }, [viewMode, currentMonth, filterEmployee, filterStatus, filterBranch]);

  // Effects
  useEffect(() => {
    if (viewMode === "daily") fetchDailySummary();
    else fetchHistory();
  }, [viewMode, fetchDailySummary, fetchHistory]);

  // Stats
  const dailyStats = useMemo(() => {
    const present = daySummaries.filter((s) => s.attendance && !s.leave).length;
    const late = daySummaries.filter((s) => s.attendance?.isLate).length;
    const leave = daySummaries.filter((s) => s.leave).length;
    const wfh = daySummaries.filter((s) => s.wfh).length;
    const absent = employees.length - present - leave;
    const totalOT = daySummaries.reduce((sum, s) => {
      const hours = s.ot.reduce((h, o) => h + (o.actualHours || o.approvedHours || 0), 0);
      return sum + hours;
    }, 0);
    const totalOTAmount = daySummaries.reduce((sum, s) => {
      const amount = s.ot.reduce((a, o) => a + (o.amount || 0), 0);
      return sum + amount;
    }, 0);
    const lateRequests = daySummaries.filter((s) => s.lateRequest).length;

    return { total: employees.length, present, late, leave, wfh, absent, totalOT, totalOTAmount, lateRequests };
  }, [daySummaries, employees.length]);

  // Add attendance
  const handleAddAttendance = async () => {
    if (!addForm.employeeId || !addForm.workDate) {
      toast.error("กรุณากรอกข้อมูล", "เลือกพนักงานและวันที่");
      return;
    }

    setSaving(true);
    try {
      const clockIn = new Date(`${addForm.workDate}T${addForm.clockInTime}:00`);
      const clockOut = new Date(`${addForm.workDate}T${addForm.clockOutTime}:00`);
      const totalHours = Math.max(0, (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60));

      const { error } = await supabase.from("attendance_logs").insert({
        employee_id: addForm.employeeId,
        work_date: addForm.workDate,
        clock_in_time: clockIn.toISOString(),
        clock_out_time: clockOut.toISOString(),
        total_hours: totalHours,
        status: addForm.status,
        is_late: addForm.isLate,
        note: addForm.note || `เพิ่มโดย Admin`,
      });

      if (error) throw error;

      toast.success("สำเร็จ", "เพิ่มการเข้างานเรียบร้อย");
      setAddModal(false);
      setAddForm({
        employeeId: "",
        workDate: format(new Date(), "yyyy-MM-dd"),
        clockInTime: "09:00",
        clockOutTime: "18:00",
        status: "present",
        isLate: false,
        note: "",
      });
      if (viewMode === "daily") fetchDailySummary();
      else fetchHistory();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message || "ไม่สามารถเพิ่มได้");
    } finally {
      setSaving(false);
    }
  };

  // Export CSV
  const exportCSV = () => {
    if (!historyLogs.length) return;
    const headers = ["วันที่", "ชื่อ", "เข้างาน", "ออกงาน", "ชั่วโมง", "สถานะ", "สาขา"];
    const rows = historyLogs.map((l) => [
      format(new Date(l.work_date), "dd/MM/yyyy"),
      l.employee?.name || "-",
      l.clock_in_time ? format(new Date(l.clock_in_time), "HH:mm") : "-",
      l.clock_out_time ? format(new Date(l.clock_out_time), "HH:mm") : "-",
      l.total_hours?.toFixed(1) || "0",
      l.is_late ? "สาย" : "ปกติ",
      branches.find((b) => b.id === l.employee?.branch_id)?.name || "-",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `attendance-${format(currentMonth, "yyyy-MM")}.csv`;
    link.click();
  };

  // Get status badge
  const getStatusBadge = (summary: DaySummary) => {
    if (summary.leave)
      return (
        <Badge variant="info">
          <Calendar className="w-3 h-3 mr-1" />
          {summary.leave.isHalfDay ? "ลาครึ่งวัน" : "ลา"}
        </Badge>
      );
    if (summary.wfh)
      return (
        <Badge variant="success">
          <Home className="w-3 h-3 mr-1" />
          {summary.wfh.isHalfDay ? "WFH ½" : "WFH"}
        </Badge>
      );
    if (summary.attendance) {
      if (summary.attendance.isLate && summary.lateRequest?.status === "approved")
        return (
          <Badge variant="success">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            อนุมัติสาย
          </Badge>
        );
      if (summary.attendance.isLate)
        return (
          <Badge variant="warning">
            <AlertTriangle className="w-3 h-3 mr-1" />
            สาย {summary.attendance.lateMinutes}น.
          </Badge>
        );
      if (summary.attendance.status === "holiday")
        return (
          <Badge variant="info">
            <Sun className="w-3 h-3 mr-1" />
            วันหยุด
          </Badge>
        );
      return (
        <Badge variant="success">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          ปกติ
        </Badge>
      );
    }
    return (
      <Badge variant="default">
        <UserX className="w-3 h-3 mr-1" />
        ขาด
      </Badge>
    );
  };

  // Get OT status color
  const getOTStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-[#34c759]";
      case "started":
        return "text-[#0071e3]";
      case "approved":
        return "text-[#ff9500]";
      default:
        return "text-[#86868b]";
    }
  };

  // Get OT type label
  const getOTTypeLabel = (type: string) => {
    switch (type) {
      case "weekday":
        return "วันทำงาน";
      case "weekend":
        return "วันหยุด";
      case "holiday":
        return "วันหยุดนักขัตฤกษ์";
      default:
        return type;
    }
  };

  // Get leave type label
  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case "sick":
        return "ลาป่วย";
      case "personal":
        return "ลากิจ";
      case "annual":
        return "ลาพักร้อน";
      case "maternity":
        return "ลาคลอด";
      default:
        return type;
    }
  };

  return (
    <AdminLayout title="การเข้างาน">
      {/* View Toggle & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        {/* View Mode Toggle */}
        <div className="flex p-1 bg-[#f5f5f7] rounded-xl">
          <button
            onClick={() => setViewMode("daily")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "daily" ? "bg-white shadow-sm text-[#1d1d1f]" : "text-[#86868b]"
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-1.5" />
            รายวัน
          </button>
          <button
            onClick={() => setViewMode("history")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "history" ? "bg-white shadow-sm text-[#1d1d1f]" : "text-[#86868b]"
            }`}
          >
            <Clock className="w-4 h-4 inline mr-1.5" />
            ประวัติ
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={() => setAddModal(true)}>
            <Plus className="w-4 h-4" />
            เพิ่มการเข้างาน
          </Button>
          {viewMode === "history" && (
            <Button variant="secondary" onClick={exportCSV} disabled={!historyLogs.length}>
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Daily View */}
      {viewMode === "daily" && (
        <>
          {/* Date Navigation */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-[#6e6e73]" />
              </button>
              <div className="relative">
                <h2 className="text-lg font-semibold text-[#1d1d1f] min-w-[220px] text-center cursor-pointer hover:bg-[#f5f5f7] px-3 py-1.5 rounded-lg transition-colors">
                  {format(selectedDate, "EEEE d MMMM yyyy", { locale: th })}
                </h2>
                <input
                  type="date"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  value={format(selectedDate, "yyyy-MM-dd")}
                  onChange={(e) => e.target.value && setSelectedDate(new Date(e.target.value))}
                />
              </div>
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-[#6e6e73]" />
              </button>
            </div>
            <button
              onClick={() => setSelectedDate(new Date())}
              className="px-3 py-1.5 text-sm text-[#0071e3] hover:bg-[#0071e3]/10 rounded-lg transition-colors"
            >
              วันนี้
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
            {[
              {
                label: "ทั้งหมด",
                value: dailyStats.total,
                icon: Users,
                color: "text-[#1d1d1f]",
                bg: "bg-[#f5f5f7]",
              },
              {
                label: "มาทำงาน",
                value: dailyStats.present,
                icon: CheckCircle2,
                color: "text-[#34c759]",
                bg: "bg-[#34c759]/10",
              },
              {
                label: "สาย",
                value: dailyStats.late,
                icon: AlertTriangle,
                color: "text-[#ff9500]",
                bg: "bg-[#ff9500]/10",
              },
              { label: "ขาด", value: dailyStats.absent, icon: UserX, color: "text-[#ff3b30]", bg: "bg-[#ff3b30]/10" },
              { label: "ลา", value: dailyStats.leave, icon: Calendar, color: "text-[#0071e3]", bg: "bg-[#0071e3]/10" },
              { label: "WFH", value: dailyStats.wfh, icon: Home, color: "text-[#af52de]", bg: "bg-[#af52de]/10" },
              {
                label: "OT (ชม.)",
                value: dailyStats.totalOT.toFixed(1),
                icon: Clock,
                color: "text-[#ff9500]",
                bg: "bg-[#ff9500]/10",
              },
              {
                label: "OT (฿)",
                value: `${dailyStats.totalOTAmount.toLocaleString()}`,
                icon: DollarSign,
                color: "text-[#34c759]",
                bg: "bg-[#34c759]/10",
              },
            ].map((s, i) => (
              <Card key={i} elevated className="!p-3">
                <div className="flex flex-col gap-1.5">
                  <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                  <div>
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-[#86868b]">{s.label}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Employee List */}
          <Card elevated padding="none">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : daySummaries.length === 0 ? (
              <div className="text-center py-16 text-[#86868b]">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>ไม่มีพนักงาน</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#e8e8ed] bg-[#f9f9fb]">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#86868b] uppercase tracking-wide">
                        พนักงาน
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase tracking-wide">
                        เข้างาน
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase tracking-wide">
                        ออกงาน
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase tracking-wide">
                        ชั่วโมง
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase tracking-wide">
                        OT
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase tracking-wide">
                        ลา/WFH
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase tracking-wide">
                        สถานะ
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase tracking-wide">
                        รูป
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8e8ed]">
                    {daySummaries.map((summary) => (
                      <tr key={summary.employee.id} className="hover:bg-[#f5f5f7]/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={summary.employee.name} size="sm" />
                            <div>
                              <p className="text-sm font-medium text-[#1d1d1f]">{summary.employee.name}</p>
                              <p className="text-xs text-[#86868b]">{summary.employee.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-center px-3 py-3">
                          {summary.attendance?.clockIn ? (
                            <span className="text-sm text-[#1d1d1f] font-medium">
                              {format(new Date(summary.attendance.clockIn), "HH:mm")}
                            </span>
                          ) : (
                            <span className="text-sm text-[#86868b]">-</span>
                          )}
                        </td>
                        <td className="text-center px-3 py-3">
                          {summary.attendance?.clockOut ? (
                            <span className="text-sm text-[#1d1d1f] font-medium">
                              {format(new Date(summary.attendance.clockOut), "HH:mm")}
                            </span>
                          ) : summary.attendance?.clockIn ? (
                            <span className="text-xs text-[#ff9500]">ยังไม่เช็คเอาท์</span>
                          ) : (
                            <span className="text-sm text-[#86868b]">-</span>
                          )}
                        </td>
                        <td className="text-center px-3 py-3">
                          {summary.attendance?.workHours ? (
                            <span className="text-sm font-semibold text-[#0071e3]">
                              {summary.attendance.workHours.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-sm text-[#86868b]">-</span>
                          )}
                        </td>
                        <td className="text-center px-3 py-3">
                          {summary.ot.length > 0 ? (
                            <button
                              onClick={() =>
                                setDetailModal({ type: "ot", employee: summary.employee, data: summary.ot })
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#ff9500] bg-[#ff9500]/10 rounded-lg hover:bg-[#ff9500]/20 transition-colors"
                            >
                              <Clock className="w-3 h-3" />
                              {summary.ot.reduce((h, o) => h + (o.actualHours || o.approvedHours || 0), 0).toFixed(1)}{" "}
                              ชม.
                            </button>
                          ) : (
                            <span className="text-sm text-[#86868b]">-</span>
                          )}
                        </td>
                        <td className="text-center px-3 py-3">
                          {summary.leave ? (
                            <button
                              onClick={() =>
                                setDetailModal({ type: "leave", employee: summary.employee, data: summary.leave })
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#0071e3] bg-[#0071e3]/10 rounded-lg hover:bg-[#0071e3]/20 transition-colors"
                            >
                              <Calendar className="w-3 h-3" />
                              {getLeaveTypeLabel(summary.leave.leaveType)}
                            </button>
                          ) : summary.wfh ? (
                            <button
                              onClick={() =>
                                setDetailModal({ type: "wfh", employee: summary.employee, data: summary.wfh })
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#af52de] bg-[#af52de]/10 rounded-lg hover:bg-[#af52de]/20 transition-colors"
                            >
                              <Home className="w-3 h-3" />
                              WFH
                            </button>
                          ) : (
                            <span className="text-sm text-[#86868b]">-</span>
                          )}
                        </td>
                        <td className="text-center px-3 py-3">{getStatusBadge(summary)}</td>
                        <td className="text-center px-3 py-3">
                          <div className="flex justify-center gap-1">
                            {summary.attendance?.clockInPhotoUrl && (
                              <button
                                onClick={() => setPhotoModal(summary.attendance!.clockInPhotoUrl!)}
                                className="p-1.5 text-[#0071e3] bg-[#0071e3]/10 rounded-lg hover:bg-[#0071e3]/20 transition-colors"
                                title="รูปเข้างาน"
                              >
                                <Camera className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {summary.attendance?.clockOutPhotoUrl && (
                              <button
                                onClick={() => setPhotoModal(summary.attendance!.clockOutPhotoUrl!)}
                                className="p-1.5 text-[#34c759] bg-[#34c759]/10 rounded-lg hover:bg-[#34c759]/20 transition-colors"
                                title="รูปออกงาน"
                              >
                                <Camera className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {!summary.attendance?.clockInPhotoUrl && !summary.attendance?.clockOutPhotoUrl && (
                              <span className="text-xs text-[#86868b]">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* History View */}
      {viewMode === "history" && (
        <>
          {/* Month Navigation & Filters */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-[#6e6e73]" />
              </button>
              <h2 className="text-lg font-semibold text-[#1d1d1f] min-w-[160px] text-center">
                {format(currentMonth, "MMMM yyyy", { locale: th })}
              </h2>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-[#6e6e73]" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 flex-1">
              <Select
                value={filterEmployee}
                onChange={setFilterEmployee}
                options={[{ value: "", label: "ทุกคน" }, ...employees.map((e) => ({ value: e.id, label: e.name }))]}
                placeholder="พนักงาน"
              />
              <Select
                value={filterStatus}
                onChange={setFilterStatus}
                options={[
                  { value: "all", label: "ทุกสถานะ" },
                  { value: "normal", label: "ปกติ" },
                  { value: "late", label: "สาย" },
                  { value: "holiday", label: "วันหยุด" },
                  { value: "no_checkout", label: "ไม่เช็คเอาท์" },
                ]}
              />
              {branches.length > 0 && (
                <Select
                  value={filterBranch}
                  onChange={setFilterBranch}
                  options={[{ value: "", label: "ทุกสาขา" }, ...branches.map((b) => ({ value: b.id, label: b.name }))]}
                  placeholder="สาขา"
                />
              )}
              {(filterEmployee || filterStatus !== "all" || filterBranch) && (
                <button
                  onClick={() => {
                    setFilterEmployee("");
                    setFilterStatus("all");
                    setFilterBranch("");
                  }}
                  className="px-3 py-2 text-sm text-[#0071e3] hover:bg-[#0071e3]/10 rounded-lg transition-colors"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>
          </div>

          {/* History Table */}
          <Card elevated padding="none">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : historyLogs.length === 0 ? (
              <div className="text-center py-16 text-[#86868b]">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>ไม่มีข้อมูล</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#e8e8ed] bg-[#f9f9fb]">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#86868b] uppercase tracking-wide">
                        วันที่
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#86868b] uppercase tracking-wide">
                        พนักงาน
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase tracking-wide">
                        เข้า
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase tracking-wide">
                        ออก
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase tracking-wide">
                        ชม.
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase tracking-wide">
                        สถานะ
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase tracking-wide">
                        รูป
                      </th>
                      <th className="text-right px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8e8ed]">
                    {historyLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#f5f5f7]/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-[#1d1d1f]">
                          {format(new Date(log.work_date), "d MMM yyyy", { locale: th })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={log.employee?.name || "?"} size="sm" />
                            <div>
                              <p className="text-sm font-medium text-[#1d1d1f]">{log.employee?.name}</p>
                              {log.employee?.branch_id && (
                                <p className="text-xs text-[#86868b]">
                                  {branches.find((b) => b.id === log.employee.branch_id)?.name}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-center px-3 py-3 text-sm text-[#1d1d1f] font-medium">
                          {log.clock_in_time ? format(new Date(log.clock_in_time), "HH:mm") : "-"}
                        </td>
                        <td className="text-center px-3 py-3 text-sm text-[#1d1d1f] font-medium">
                          {log.clock_out_time ? (
                            format(new Date(log.clock_out_time), "HH:mm")
                          ) : (
                            <span className="text-xs text-[#ff9500]">ยังไม่เช็คเอาท์</span>
                          )}
                        </td>
                        <td className="text-center px-3 py-3 text-sm font-semibold text-[#0071e3]">
                          {log.total_hours?.toFixed(1) || "0"}
                        </td>
                        <td className="text-center px-3 py-3">
                          <div className="flex flex-col items-center gap-1">
                            {log.status === "holiday" ? (
                              <Badge variant="info">
                                <Sun className="w-3 h-3 mr-1" />
                                วันหยุด
                              </Badge>
                            ) : (
                              <Badge variant={log.is_late ? "warning" : "success"}>
                                {log.is_late ? `สาย ${log.late_minutes || 0}น.` : "ปกติ"}
                              </Badge>
                            )}
                            <div className="flex gap-1">
                              {log.auto_checkout && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-[#0071e3]/10 text-[#0071e3] rounded">
                                  Auto
                                </span>
                              )}
                              {log.edited_at && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-[#86868b]/10 text-[#86868b] rounded">
                                  แก้ไข
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-center px-3 py-3">
                          <div className="flex justify-center gap-1">
                            {log.clock_in_photo_url && (
                              <button
                                onClick={() => setPhotoModal(log.clock_in_photo_url)}
                                className="p-1.5 text-[#0071e3] bg-[#0071e3]/10 rounded-lg hover:bg-[#0071e3]/20 transition-colors"
                                title="รูปเข้างาน"
                              >
                                <Camera className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {log.clock_out_photo_url && (
                              <button
                                onClick={() => setPhotoModal(log.clock_out_photo_url)}
                                className="p-1.5 text-[#34c759] bg-[#34c759]/10 rounded-lg hover:bg-[#34c759]/20 transition-colors"
                                title="รูปออกงาน"
                              >
                                <Camera className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {!log.clock_in_photo_url && !log.clock_out_photo_url && (
                              <span className="text-xs text-[#86868b]">-</span>
                            )}
                          </div>
                        </td>
                        <td className="text-right px-4 py-3">
                          <Link
                            href={`/admin/attendance/edit/${log.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#0071e3] bg-[#0071e3]/10 rounded-lg hover:bg-[#0071e3]/20 transition-colors"
                          >
                            <Edit className="w-3 h-3" />
                            แก้ไข
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Add Modal */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="เพิ่มการเข้างาน Manual" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">พนักงาน *</label>
            <Select
              value={addForm.employeeId}
              onChange={(v) => setAddForm({ ...addForm, employeeId: v })}
              options={[{ value: "", label: "เลือกพนักงาน" }, ...employees.map((e) => ({ value: e.id, label: e.name }))]}
            />
          </div>
          <DateInput
            label="วันที่ *"
            value={addForm.workDate}
            onChange={(v) => setAddForm({ ...addForm, workDate: v })}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">เวลาเข้า *</label>
              <TimeInput value={addForm.clockInTime} onChange={(v) => setAddForm({ ...addForm, clockInTime: v })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">เวลาออก *</label>
              <TimeInput value={addForm.clockOutTime} onChange={(v) => setAddForm({ ...addForm, clockOutTime: v })} />
            </div>
          </div>
          <Select
            label="สถานะ"
            value={addForm.status}
            onChange={(v) => setAddForm({ ...addForm, status: v })}
            options={[
              { value: "present", label: "มาทำงานปกติ" },
              { value: "holiday", label: "วันหยุด (OT)" },
              { value: "wfh", label: "Work From Home" },
            ]}
          />
          <label className="flex items-center gap-3 p-3 bg-[#f5f5f7] rounded-xl cursor-pointer hover:bg-[#e8e8ed] transition-colors">
            <input
              type="checkbox"
              checked={addForm.isLate}
              onChange={(e) => setAddForm({ ...addForm, isLate: e.target.checked })}
              className="w-5 h-5 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
            />
            <span className="text-sm font-medium text-[#1d1d1f]">มาสาย</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setAddModal(false)} className="flex-1">
              ยกเลิก
            </Button>
            <Button onClick={handleAddAttendance} loading={saving} className="flex-1">
              เพิ่มการเข้างาน
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modals */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-in">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center justify-between bg-[#fbfbfd]">
              <div>
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                  {detailModal.type === "ot"
                    ? "รายละเอียด OT"
                    : detailModal.type === "leave"
                    ? "รายละเอียดการลา"
                    : detailModal.type === "wfh"
                    ? "รายละเอียด WFH"
                    : "รายละเอียดคำขอสาย"}
                </h3>
                <p className="text-[13px] text-[#86868b] mt-0.5">
                  {detailModal.employee.name} - {format(selectedDate, "d MMMM yyyy", { locale: th })}
                </p>
              </div>
              <button
                onClick={() => setDetailModal(null)}
                className="p-2 hover:bg-[#e8e8ed] rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-[#86868b]" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {detailModal.type === "ot" && (
                <div className="space-y-3">
                  {(detailModal.data as OTRecord[]).map((ot) => (
                    <Card key={ot.id} elevated className="!p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant={
                                ot.otType === "holiday"
                                  ? "info"
                                  : ot.otType === "weekend"
                                  ? "warning"
                                  : "default"
                              }
                            >
                              {getOTTypeLabel(ot.otType)}
                            </Badge>
                            <span className={`text-xs font-medium ${getOTStatusColor(ot.status)}`}>
                              {ot.status === "completed"
                                ? "เสร็จสิ้น"
                                : ot.status === "started"
                                ? "กำลัง OT"
                                : "อนุมัติแล้ว"}
                            </span>
                          </div>
                          <p className="text-xs text-[#86868b]">#{ot.id.slice(0, 8)}</p>
                        </div>
                        {ot.amount && (
                          <div className="text-right">
                            <p className="text-lg font-bold text-[#34c759]">฿{ot.amount.toLocaleString()}</p>
                            <p className="text-xs text-[#86868b]">อัตรา {ot.rate?.toFixed(1)}x</p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 p-2 bg-[#f5f5f7] rounded-lg">
                          <Clock className="w-4 h-4 text-[#0071e3]" />
                          <div>
                            <p className="text-[10px] text-[#86868b]">เวลาเริ่ม</p>
                            <p className="text-sm font-medium text-[#1d1d1f]">
                              {ot.startTime ? format(new Date(ot.startTime), "HH:mm") : "-"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-[#f5f5f7] rounded-lg">
                          <Clock className="w-4 h-4 text-[#ff9500]" />
                          <div>
                            <p className="text-[10px] text-[#86868b]">เวลาจบ</p>
                            <p className="text-sm font-medium text-[#1d1d1f]">
                              {ot.endTime ? format(new Date(ot.endTime), "HH:mm") : "-"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-[#e8e8ed] flex items-center justify-between">
                        <div>
                          <p className="text-xs text-[#86868b]">อนุมัติ</p>
                          <p className="text-sm font-semibold text-[#1d1d1f]">
                            {ot.approvedHours?.toFixed(1) || 0} ชั่วโมง
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[#86868b]">ทำจริง</p>
                          <p className="text-sm font-semibold text-[#0071e3]">
                            {ot.actualHours?.toFixed(1) || "-"} ชั่วโมง
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {(detailModal.data as OTRecord[]).length === 0 && (
                    <div className="text-center py-8 text-[#86868b]">
                      <Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>ไม่มีข้อมูล OT</p>
                    </div>
                  )}
                </div>
              )}

              {detailModal.type === "leave" && (
                <Card elevated className="!p-4">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge variant="info">{getLeaveTypeLabel((detailModal.data as LeaveRecord).leaveType)}</Badge>
                        {(detailModal.data as LeaveRecord).isHalfDay && (
                          <span className="ml-2 text-xs text-[#86868b]">(ครึ่งวัน)</span>
                        )}
                      </div>
                      <Badge variant="success">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        อนุมัติแล้ว
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-[#f5f5f7] rounded-lg">
                        <p className="text-xs text-[#86868b] mb-1">วันที่เริ่ม</p>
                        <p className="text-sm font-medium text-[#1d1d1f]">
                          {format(new Date((detailModal.data as LeaveRecord).startDate), "d MMM yyyy", { locale: th })}
                        </p>
                      </div>
                      <div className="p-3 bg-[#f5f5f7] rounded-lg">
                        <p className="text-xs text-[#86868b] mb-1">วันที่สิ้นสุด</p>
                        <p className="text-sm font-medium text-[#1d1d1f]">
                          {format(new Date((detailModal.data as LeaveRecord).endDate), "d MMM yyyy", { locale: th })}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-[#86868b] mb-1.5">เหตุผล</p>
                      <div className="p-3 bg-[#f5f5f7] rounded-lg">
                        <p className="text-sm text-[#1d1d1f]">{(detailModal.data as LeaveRecord).reason || "-"}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {detailModal.type === "wfh" && (
                <Card elevated className="!p-4">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge variant="success">
                          <Home className="w-3 h-3 mr-1" />
                          Work From Home
                        </Badge>
                        {(detailModal.data as WFHRecord).isHalfDay && (
                          <span className="ml-2 text-xs text-[#86868b]">(ครึ่งวัน)</span>
                        )}
                      </div>
                      <Badge variant="success">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        อนุมัติแล้ว
                      </Badge>
                    </div>

                    <div className="p-3 bg-[#f5f5f7] rounded-lg">
                      <p className="text-xs text-[#86868b] mb-1">วันที่</p>
                      <p className="text-sm font-medium text-[#1d1d1f]">
                        {format(new Date((detailModal.data as WFHRecord).date), "d MMMM yyyy", { locale: th })}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#86868b] mb-1.5">เหตุผล</p>
                      <div className="p-3 bg-[#f5f5f7] rounded-lg">
                        <p className="text-sm text-[#1d1d1f]">{(detailModal.data as WFHRecord).reason || "-"}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#e8e8ed] bg-[#fbfbfd]">
              <Button variant="secondary" onClick={() => setDetailModal(null)} className="w-full">
                ปิด
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {photoModal && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setPhotoModal(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-colors"
            onClick={() => setPhotoModal(null)}
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <img src={photoModal} alt="Attendance Photo" className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl" />
        </div>
      )}
    </AdminLayout>
  );
}

export default function AttendancePage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <AttendanceContent />
    </ProtectedRoute>
  );
}
