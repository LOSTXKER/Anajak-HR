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
  RefreshCw,
  Sun,
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
}

interface DaySummary {
  employee: Employee;
  attendance: {
    id: string;
    clockIn: string | null;
    clockOut: string | null;
    workHours: number | null;
    isLate: boolean;
    lateMinutes: number;
    status: string;
  } | null;
  ot: { hours: number; amount: number } | null;
  leave: { type: string; isHalfDay: boolean } | null;
  wfh: { isHalfDay: boolean } | null;
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
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
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
        supabase.from("employees").select("id, name, email, branch_id").eq("account_status", "approved").order("name"),
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
      const [attRes, otRes, leaveRes, wfhRes] = await Promise.all([
        supabase.from("attendance_logs").select("*").eq("work_date", dateStr),
        supabase.from("ot_requests").select("*").eq("request_date", dateStr).in("status", ["approved", "completed"]),
        supabase.from("leave_requests").select("*").eq("status", "approved").lte("start_date", dateStr).gte("end_date", dateStr),
        supabase.from("wfh_requests").select("*").eq("status", "approved").eq("date", dateStr), // Fixed: use "date" not "work_date"
      ]);

      const summaries: DaySummary[] = employees.map((emp) => {
        const att = (attRes.data || []).find((a: any) => a.employee_id === emp.id);
        const empOt = (otRes.data || []).filter((o: any) => o.employee_id === emp.id);
        const empLeave = (leaveRes.data || []).find((l: any) => l.employee_id === emp.id);
        const empWfh = (wfhRes.data || []).find((w: any) => w.employee_id === emp.id);

        return {
          employee: emp,
          attendance: att ? {
            id: att.id,
            clockIn: att.clock_in_time,
            clockOut: att.clock_out_time,
            workHours: att.total_hours,
            isLate: att.is_late,
            lateMinutes: att.late_minutes || 0,
            status: att.status,
          } : null,
          ot: empOt.length > 0 ? {
            hours: empOt.reduce((sum: number, o: any) => sum + (o.actual_ot_hours || o.approved_ot_hours || 0), 0),
            amount: empOt.reduce((sum: number, o: any) => sum + (o.ot_amount || 0), 0),
          } : null,
          leave: empLeave ? { type: empLeave.leave_type, isHalfDay: empLeave.is_half_day } : null,
          wfh: empWfh ? { isHalfDay: empWfh.is_half_day } : null,
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
        .select("*, employee:employees!employee_id(id, name, email, branch_id)")
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
    const otHours = daySummaries.reduce((sum, s) => sum + (s.ot?.hours || 0), 0);
    
    return { total: employees.length, present, late, leave, wfh, absent, otHours };
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
        employeeId: "", workDate: format(new Date(), "yyyy-MM-dd"),
        clockInTime: "09:00", clockOutTime: "18:00", status: "present", isLate: false, note: "",
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
    const headers = ["วันที่", "ชื่อ", "เข้างาน", "ออกงาน", "ชั่วโมง", "สถานะ"];
    const rows = historyLogs.map((l) => [
      format(new Date(l.work_date), "dd/MM/yyyy"),
      l.employee?.name || "-",
      l.clock_in_time ? format(new Date(l.clock_in_time), "HH:mm") : "-",
      l.clock_out_time ? format(new Date(l.clock_out_time), "HH:mm") : "-",
      l.total_hours?.toFixed(1) || "0",
      l.is_late ? "สาย" : "ปกติ",
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
    if (summary.leave) return <Badge variant="info">{summary.leave.isHalfDay ? "ลาครึ่งวัน" : "ลา"}</Badge>;
    if (summary.wfh) return <Badge variant="success">{summary.wfh.isHalfDay ? "WFH ครึ่งวัน" : "WFH"}</Badge>;
    if (summary.attendance) {
      if (summary.attendance.isLate) return <Badge variant="warning">สาย {summary.attendance.lateMinutes}น.</Badge>;
      if (summary.attendance.status === "holiday") return <Badge variant="info">วันหยุด</Badge>;
      return <Badge variant="success">ปกติ</Badge>;
    }
    return <Badge variant="default">ไม่มาทำงาน</Badge>;
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
            เพิ่ม
          </Button>
          {viewMode === "history" && (
            <Button variant="secondary" onClick={exportCSV} disabled={!historyLogs.length}>
              <Download className="w-4 h-4" />
              Export
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
              <button onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="p-2 hover:bg-[#f5f5f7] rounded-lg">
                <ChevronLeft className="w-5 h-5 text-[#6e6e73]" />
              </button>
              <div className="relative">
                <h2 className="text-lg font-semibold text-[#1d1d1f] min-w-[220px] text-center cursor-pointer hover:bg-[#f5f5f7] px-3 py-1.5 rounded-lg">
                  {format(selectedDate, "EEEE d MMMM yyyy", { locale: th })}
                </h2>
                <input
                  type="date"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  value={format(selectedDate, "yyyy-MM-dd")}
                  onChange={(e) => e.target.value && setSelectedDate(new Date(e.target.value))}
                />
              </div>
              <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-2 hover:bg-[#f5f5f7] rounded-lg">
                <ChevronRight className="w-5 h-5 text-[#6e6e73]" />
              </button>
            </div>
            <button onClick={() => setSelectedDate(new Date())} className="px-3 py-1.5 text-sm text-[#0071e3] hover:bg-[#0071e3]/10 rounded-lg">
              วันนี้
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
            {[
              { label: "ทั้งหมด", value: dailyStats.total, icon: Users, color: "text-[#1d1d1f]", bg: "bg-[#f5f5f7]" },
              { label: "มาทำงาน", value: dailyStats.present, icon: CheckCircle2, color: "text-[#34c759]", bg: "bg-[#34c759]/10" },
              { label: "สาย", value: dailyStats.late, icon: AlertTriangle, color: "text-[#ff9500]", bg: "bg-[#ff9500]/10" },
              { label: "ลา", value: dailyStats.leave, icon: Calendar, color: "text-[#0071e3]", bg: "bg-[#0071e3]/10" },
              { label: "WFH", value: dailyStats.wfh, icon: Home, color: "text-[#af52de]", bg: "bg-[#af52de]/10" },
              { label: "OT (ชม.)", value: dailyStats.otHours.toFixed(1), icon: Clock, color: "text-[#ff9500]", bg: "bg-[#ff9500]/10" },
            ].map((s, i) => (
              <Card key={i} elevated className="!p-3">
                <div className="flex items-center gap-2">
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
              <div className="text-center py-16 text-[#86868b]">ไม่มีข้อมูล</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#e8e8ed] bg-[#f9f9fb]">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#86868b] uppercase">พนักงาน</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">เข้างาน</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">ออกงาน</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">ชั่วโมง</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">OT</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8e8ed]">
                    {daySummaries.map((summary) => (
                      <tr key={summary.employee.id} className="hover:bg-[#f5f5f7]/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={summary.employee.name} size="sm" />
                            <span className="text-sm font-medium text-[#1d1d1f]">{summary.employee.name}</span>
                          </div>
                        </td>
                        <td className="text-center px-3 py-3 text-sm text-[#6e6e73]">
                          {summary.attendance?.clockIn ? format(new Date(summary.attendance.clockIn), "HH:mm") : "-"}
                        </td>
                        <td className="text-center px-3 py-3 text-sm text-[#6e6e73]">
                          {summary.attendance?.clockOut ? format(new Date(summary.attendance.clockOut), "HH:mm") : "-"}
                        </td>
                        <td className="text-center px-3 py-3 text-sm font-medium text-[#0071e3]">
                          {summary.attendance?.workHours?.toFixed(1) || "-"}
                        </td>
                        <td className="text-center px-3 py-3">
                          {summary.ot ? (
                            <span className="text-sm font-medium text-[#ff9500]">
                              {summary.ot.hours.toFixed(1)} <span className="text-xs text-[#86868b]">ชม.</span>
                            </span>
                          ) : (
                            <span className="text-sm text-[#86868b]">-</span>
                          )}
                        </td>
                        <td className="text-center px-3 py-3">{getStatusBadge(summary)}</td>
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
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-[#f5f5f7] rounded-lg">
                <ChevronLeft className="w-5 h-5 text-[#6e6e73]" />
              </button>
              <h2 className="text-lg font-semibold text-[#1d1d1f] min-w-[160px] text-center">
                {format(currentMonth, "MMMM yyyy", { locale: th })}
              </h2>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-[#f5f5f7] rounded-lg">
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
                  onClick={() => { setFilterEmployee(""); setFilterStatus("all"); setFilterBranch(""); }}
                  className="px-3 py-2 text-sm text-[#0071e3] hover:bg-[#0071e3]/10 rounded-lg"
                >
                  ล้าง
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
              <div className="text-center py-16 text-[#86868b]">ไม่มีข้อมูล</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#e8e8ed] bg-[#f9f9fb]">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#86868b] uppercase">วันที่</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#86868b] uppercase">พนักงาน</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">เข้า</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">ออก</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">ชม.</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">สถานะ</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">รูป</th>
                      <th className="text-right px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8e8ed]">
                    {historyLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#f5f5f7]/50">
                        <td className="px-4 py-3 text-sm text-[#1d1d1f]">
                          {format(new Date(log.work_date), "d MMM", { locale: th })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={log.employee?.name || "?"} size="sm" />
                            <span className="text-sm text-[#1d1d1f]">{log.employee?.name}</span>
                          </div>
                        </td>
                        <td className="text-center px-3 py-3 text-sm text-[#6e6e73]">
                          {log.clock_in_time ? format(new Date(log.clock_in_time), "HH:mm") : "-"}
                        </td>
                        <td className="text-center px-3 py-3 text-sm text-[#6e6e73]">
                          {log.clock_out_time ? format(new Date(log.clock_out_time), "HH:mm") : (
                            <span className="text-[#ff9500]">ไม่ได้เช็คเอาท์</span>
                          )}
                        </td>
                        <td className="text-center px-3 py-3 text-sm font-medium text-[#0071e3]">
                          {log.total_hours?.toFixed(1) || "0"}
                        </td>
                        <td className="text-center px-3 py-3">
                          {log.status === "holiday" ? (
                            <Badge variant="info"><Sun className="w-3 h-3 mr-1" />วันหยุด</Badge>
                          ) : (
                            <Badge variant={log.is_late ? "warning" : "success"}>
                              {log.is_late ? `สาย ${log.late_minutes || 0}น.` : "ปกติ"}
                            </Badge>
                          )}
                          {log.auto_checkout && <span className="ml-1 text-[10px] text-[#0071e3]">Auto</span>}
                          {log.edited_at && <span className="ml-1 text-[10px] text-[#86868b]">แก้ไข</span>}
                        </td>
                        <td className="text-center px-3 py-3">
                          <div className="flex justify-center gap-1">
                            {log.clock_in_photo_url && (
                              <button
                                onClick={() => setPhotoModal(log.clock_in_photo_url)}
                                className="p-1.5 text-[#0071e3] bg-[#0071e3]/10 rounded-lg hover:bg-[#0071e3]/20"
                              >
                                <Camera className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {log.clock_out_photo_url && (
                              <button
                                onClick={() => setPhotoModal(log.clock_out_photo_url)}
                                className="p-1.5 text-[#34c759] bg-[#34c759]/10 rounded-lg hover:bg-[#34c759]/20"
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
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-[#0071e3] bg-[#0071e3]/10 rounded-lg hover:bg-[#0071e3]/20"
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
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="เพิ่มการเข้างาน" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">พนักงาน *</label>
            <Select
              value={addForm.employeeId}
              onChange={(v) => setAddForm({ ...addForm, employeeId: v })}
              options={[{ value: "", label: "เลือกพนักงาน" }, ...employees.map((e) => ({ value: e.id, label: e.name }))]}
            />
          </div>
          <DateInput label="วันที่ *" value={addForm.workDate} onChange={(v) => setAddForm({ ...addForm, workDate: v })} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">เวลาเข้า</label>
              <TimeInput value={addForm.clockInTime} onChange={(v) => setAddForm({ ...addForm, clockInTime: v })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">เวลาออก</label>
              <TimeInput value={addForm.clockOutTime} onChange={(v) => setAddForm({ ...addForm, clockOutTime: v })} />
            </div>
          </div>
          <Select
            label="สถานะ"
            value={addForm.status}
            onChange={(v) => setAddForm({ ...addForm, status: v })}
            options={[
              { value: "present", label: "ปกติ" },
              { value: "holiday", label: "วันหยุด (OT)" },
              { value: "wfh", label: "WFH" },
            ]}
          />
          <label className="flex items-center gap-3 p-3 bg-[#f5f5f7] rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={addForm.isLate}
              onChange={(e) => setAddForm({ ...addForm, isLate: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <span className="text-sm text-[#1d1d1f]">มาสาย</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setAddModal(false)} className="flex-1">ยกเลิก</Button>
            <Button onClick={handleAddAttendance} loading={saving} className="flex-1">เพิ่ม</Button>
          </div>
        </div>
      </Modal>

      {/* Photo Modal */}
      {photoModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPhotoModal(null)}>
          <button className="absolute top-4 right-4 p-2 bg-white rounded-full" onClick={() => setPhotoModal(null)}>
            <X className="w-5 h-5" />
          </button>
          <img src={photoModal} alt="" className="max-w-full max-h-[90vh] rounded-2xl" />
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
