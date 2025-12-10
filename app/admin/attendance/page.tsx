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
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { TimeInput } from "@/components/ui/TimeInput";
import { DateInput } from "@/components/ui/DateInput";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import * as Tabs from "@radix-ui/react-tabs";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Clock,
  X,
  Camera,
  Edit,
  AlertCircle,
  Plus,
  User,
  Calendar,
  Sun,
  Home,
  FileText,
  Users,
  DollarSign,
  MapPin
} from "lucide-react";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, addDays, subDays } from "date-fns";
import { th } from "date-fns/locale";

// --- Types for Daily Summary ---
interface EmployeeDaySummary {
  id: string;
  name: string;
  email: string;
  attendance: {
    clock_in?: string;
    clock_out?: string;
    work_hours?: number;
    is_late?: boolean;
    status?: string;
  } | null;
  ot: {
    hours: number;
    amount: number;
    status: string;
  } | null;
  leave: {
    type: string;
    is_half_day: boolean;
  } | null;
  wfh: {
    is_half_day: boolean;
  } | null;
}

function AttendanceContent() {
  const { employee: currentAdmin } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("daily");

  // --- Common Data ---
  const [employees, setEmployees] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  // --- Daily Summary State ---
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyLoading, setDailyLoading] = useState(true);
  const [dailySummaries, setDailySummaries] = useState<EmployeeDaySummary[]>([]);
  const [dailyStats, setDailyStats] = useState({
    total: 0,
    present: 0,
    late: 0,
    leave: 0,
    wfh: 0,
    absent: 0,
    otHours: 0,
    otAmount: 0,
  });

  // --- Attendance History State ---
  const [attendance, setAttendance] = useState<any[]>([]);
  const [otData, setOtData] = useState<Record<string, any[]>>({});
  const [historyLoading, setHistoryLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

  // Filters for History
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterBranch, setFilterBranch] = useState("");
  const [filterDate, setFilterDate] = useState("");

  // Add attendance modal
  const [addModal, setAddModal] = useState(false);
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

  useEffect(() => {
    fetchEmployees();
    fetchBranches();
  }, []);

  // Fetch Daily Summary when date changes
  useEffect(() => {
    if (activeTab === "daily") {
      fetchDailySummary();
    }
  }, [selectedDate, activeTab]);

  // Fetch History when month/filters change
  useEffect(() => {
    if (activeTab === "history") {
      fetchAttendanceHistory();
    }
  }, [currentMonth, filterEmployee, filterStatus, filterBranch, filterDate, activeTab]);

  const fetchEmployees = async () => {
    try {
      const { data } = await supabase
        .from("employees")
        .select("id, name, email, branch_id")
        .eq("account_status", "approved")
        .order("name");
      setEmployees(data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data } = await supabase
        .from("branches")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      setBranches(data || []);
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  // --- Daily Summary Logic ---
  const fetchDailySummary = async () => {
    setDailyLoading(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    try {
      // Re-fetch basic employee list to ensure we have everyone (logic copied from original page)
      // Actually existing `employees` state is enough, but original code fetched specifically non-system accounts.
      // Let's reuse `employees` state but filter if needed, OR fetch again to be safe like original code.
      // Using `employees` state is better for performance, assuming it loads all approved staff.

      if (!employees.length && dailyLoading) return; // Wait for employees

      const { data: attendance } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("work_date", dateStr);

      const { data: otData } = await supabase
        .from("ot_requests")
        .select("*")
        .eq("request_date", dateStr)
        .not("actual_end_time", "is", null);

      const { data: leaveData } = await supabase
        .from("leave_requests")
        .select("*")
        .lte("start_date", dateStr)
        .gte("end_date", dateStr)
        .eq("status", "approved");

      const { data: wfhData } = await supabase
        .from("wfh_requests")
        .select("*")
        .eq("work_date", dateStr) // Changed from 'date' to 'work_date' based on schema
        .eq("status", "approved");

      // Build summary
      const employeeSummaries: EmployeeDaySummary[] = employees.map((emp: any) => {
        const empAttendance = attendance?.find((a: any) => a.employee_id === emp.id);
        const empOT = otData?.filter((o: any) => o.employee_id === emp.id);
        const empLeave = leaveData?.find((l: any) => l.employee_id === emp.id);
        const empWFH = wfhData?.find((w: any) => w.employee_id === emp.id);

        const totalOTHours = empOT?.reduce((sum: number, o: any) => sum + (o.actual_ot_hours || 0), 0) || 0;
        const totalOTAmount = empOT?.reduce((sum: number, o: any) => sum + (o.ot_amount || 0), 0) || 0;

        return {
          id: emp.id,
          name: emp.name,
          email: emp.email,
          attendance: empAttendance ? {
            clock_in: empAttendance.clock_in_time,
            clock_out: empAttendance.clock_out_time,
            work_hours: empAttendance.total_hours || empAttendance.work_hours,
            is_late: empAttendance.is_late,
            status: empAttendance.status,
          } : null,
          ot: totalOTHours > 0 ? {
            hours: totalOTHours,
            amount: totalOTAmount,
            status: "completed",
          } : null,
          leave: empLeave ? {
            type: empLeave.leave_type,
            is_half_day: empLeave.is_half_day,
          } : null,
          wfh: empWFH ? {
            is_half_day: empWFH.is_half_day,
          } : null,
        };
      });

      setDailySummaries(employeeSummaries);

      // Calculate stats
      const present = employeeSummaries.filter((s) => s.attendance && !s.leave).length;
      const late = employeeSummaries.filter((s) => s.attendance?.is_late).length;
      const leave = employeeSummaries.filter((s) => s.leave).length;
      const wfh = employeeSummaries.filter((s) => s.wfh).length;
      const totalOTHours = employeeSummaries.reduce((sum, s) => sum + (s.ot?.hours || 0), 0);
      const totalOTAmount = employeeSummaries.reduce((sum, s) => sum + (s.ot?.amount || 0), 0);

      setDailyStats({
        total: employees.length,
        present,
        late,
        leave,
        wfh,
        absent: employees.length - present - leave,
        otHours: totalOTHours,
        otAmount: totalOTAmount,
      });
    } catch (error) {
      console.error("Error fetching daily summary:", error);
    } finally {
      setDailyLoading(false);
    }
  };

  const getDailyStatusBadge = (summary: EmployeeDaySummary) => {
    if (summary.leave) {
      return <Badge variant="info">ลา{summary.leave.is_half_day ? " (ครึ่งวัน)" : ""}</Badge>;
    }
    if (summary.wfh) {
      return <Badge variant="success">WFH{summary.wfh.is_half_day ? " (ครึ่งวัน)" : ""}</Badge>;
    }
    if (summary.attendance) {
      if (summary.attendance.is_late) {
        return <Badge variant="warning">สาย</Badge>;
      }
      return <Badge variant="success">ปกติ</Badge>;
    }
    return <Badge variant="default">ไม่มาทำงาน</Badge>;
  };

  // --- History Logic ---
  const fetchAttendanceHistory = async () => {
    setHistoryLoading(true);
    try {
      const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      let query = supabase
        .from("attendance_logs")
        .select(`*, employee:employees!employee_id (id, name, email, role, branch_id)`)
        .gte("work_date", startDate)
        .lte("work_date", endDate)
        .order("work_date", { ascending: false });

      if (filterEmployee) query = query.eq("employee_id", filterEmployee);
      if (filterDate) query = query.eq("work_date", filterDate);

      if (filterStatus === "late") {
        query = query.eq("is_late", true);
      } else if (filterStatus === "normal") {
        query = query.eq("is_late", false).neq("status", "holiday");
      } else if (filterStatus === "holiday") {
        query = query.eq("status", "holiday");
      } else if (filterStatus === "no_checkout") {
        query = query.is("clock_out_time", null);
      }

      const { data } = await query;

      let filteredData = data || [];
      if (filterBranch) {
        filteredData = filteredData.filter((a: any) => a.employee?.branch_id === filterBranch);
      }

      const { data: otRecords } = await supabase
        .from("ot_requests")
        .select("*")
        .gte("request_date", startDate)
        .lte("request_date", endDate)
        .not("actual_end_time", "is", null);

      const otMap: Record<string, any[]> = {};
      (otRecords || []).forEach((ot: any) => {
        const key = `${ot.employee_id}_${ot.request_date}`;
        if (!otMap[key]) otMap[key] = [];
        otMap[key].push(ot);
      });
      setOtData(otMap);
      setAttendance(filteredData);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAddAttendance = async () => {
    if (!addForm.employeeId || !addForm.workDate) {
      toast.error("กรุณากรอกข้อมูล", "เลือกพนักงานและวันที่");
      return;
    }

    setSaving(true);
    try {
      const clockIn = new Date(`${addForm.workDate}T${addForm.clockInTime}:00`);
      const clockOut = new Date(`${addForm.workDate}T${addForm.clockOutTime}:00`);
      const totalHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

      const { error } = await supabase
        .from("attendance_logs")
        .insert({
          employee_id: addForm.employeeId,
          work_date: addForm.workDate,
          clock_in_time: clockIn.toISOString(),
          clock_out_time: clockOut.toISOString(),
          total_hours: totalHours > 0 ? totalHours : 0,
          status: addForm.status,
          is_late: addForm.isLate,
          note: addForm.note || `เพิ่มโดย Admin`,
          created_by: currentAdmin?.id,
        });

      if (error) throw error;

      toast.success("สำเร็จ", "เพิ่มการเข้างานเรียบร้อยแล้ว");
      setAddModal(false);
      fetchAttendanceHistory(); // Refresh history if active
      if (activeTab === "daily") fetchDailySummary(); // Refresh daily if active
    } catch (error: any) {
      console.error("Error adding attendance:", error);
      toast.error("เกิดข้อผิดพลาด", error?.message || "ไม่สามารถเพิ่มการเข้างานได้");
    } finally {
      setSaving(false);
    }
  };

  const exportHistoryCSV = () => {
    if (!attendance.length) return;
    const headers = ["วันที่", "ชื่อ", "เข้างาน", "ออกงาน", "ชั่วโมง", "สถานะ"];
    const rows = attendance.map((a) => [
      format(new Date(a.work_date), "dd/MM/yyyy"),
      a.employee?.name || "-",
      a.clock_in_time ? format(new Date(a.clock_in_time), "HH:mm") : "-",
      a.clock_out_time ? format(new Date(a.clock_out_time), "HH:mm") : "-",
      a.total_hours?.toFixed(1) || "0",
      a.is_late ? "สาย" : "ปกติ",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `attendance-${format(currentMonth, "yyyy-MM")}.csv`;
    link.click();
  };

  const getHistoryStatusBadge = (log: any) => {
    if (log.status === "holiday") {
      return <Badge variant="info"><Sun className="w-3 h-3 mr-1" />วันหยุด</Badge>;
    }
    return <Badge variant={log.is_late ? "warning" : "success"}>{log.is_late ? "สาย" : "ปกติ"}</Badge>;
  };

  return (
    <AdminLayout title="การเข้างาน">
      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Tab List */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <Tabs.List className="flex gap-2 p-1 bg-[#f5f5f7] rounded-xl">
            <Tabs.Trigger
              value="daily"
              className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-all ${activeTab === "daily"
                ? "bg-white text-[#1d1d1f] shadow-sm"
                : "text-[#86868b] hover:text-[#1d1d1f]"
                }`}
            >
              สรุปรายวัน
            </Tabs.Trigger>
            <Tabs.Trigger
              value="history"
              className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-all ${activeTab === "history"
                ? "bg-white text-[#1d1d1f] shadow-sm"
                : "text-[#86868b] hover:text-[#1d1d1f]"
                }`}
            >
              ประวัติการเข้างาน
            </Tabs.Trigger>
          </Tabs.List>

          <div className="flex gap-2">
            <Button onClick={() => setAddModal(true)}>
              <Plus className="w-4 h-4" />
              เพิ่มการเข้างาน
            </Button>
            {activeTab === "history" && (
              <Button variant="secondary" size="sm" onClick={exportHistoryCSV}>
                <Download className="w-4 h-4" />
                Export
              </Button>
            )}
          </div>
        </div>

        {/* ================== TAB 1: DAILY SUMMARY ================== */}
        <Tabs.Content value="daily" className="outline-none">
          {/* Date Navigation */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-[#6e6e73]" />
              </button>
              <div className="relative group">
                {/* Calendar Picker Trigger */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#f5f5f7] cursor-pointer">
                  <Calendar className="w-4 h-4 text-[#86868b]" />
                  <h2 className="text-[17px] font-semibold text-[#1d1d1f] min-w-[200px] text-center">
                    {format(selectedDate, "EEEE d MMMM yyyy", { locale: th })}
                  </h2>
                </div>
                {/* Hidden native date input for simpler calendar filter implementation */}
                <input
                  type="date"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  value={format(selectedDate, "yyyy-MM-dd")}
                  onChange={(e) => {
                    if (e.target.value) setSelectedDate(new Date(e.target.value));
                  }}
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
              className="px-3 py-1.5 text-[14px] text-[#0071e3] hover:bg-[#0071e3]/10 rounded-lg transition-colors"
            >
              วันนี้
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
            {[
              { label: "ทั้งหมด", value: dailyStats.total, icon: Users, color: "text-[#1d1d1f]" },
              { label: "มาทำงาน", value: dailyStats.present, icon: Clock, color: "text-[#34c759]" },
              { label: "สาย", value: dailyStats.late, icon: Clock, color: "text-[#ff9500]" },
              { label: "ลา", value: dailyStats.leave, icon: FileText, color: "text-[#0071e3]" },
              { label: "WFH", value: dailyStats.wfh, icon: Home, color: "text-[#af52de]" },
              { label: "ไม่มา", value: dailyStats.absent, icon: Users, color: "text-[#ff3b30]" },
              { label: "OT ชม.", value: dailyStats.otHours.toFixed(1), icon: Clock, color: "text-[#ff9500]" },
              { label: "OT ฿", value: dailyStats.otAmount.toFixed(0), icon: DollarSign, color: "text-[#34c759]" },
            ].map((stat, i) => (
              <Card key={i} elevated>
                <div className="text-center py-1">
                  <p className={`text-[20px] font-semibold ${stat.color}`}>{stat.value}</p>
                  <p className="text-[11px] text-[#86868b]">{stat.label}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Employee List */}
          <Card elevated padding="none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e8e8ed]">
                    <th className="text-left px-4 py-3 text-[13px] font-semibold text-[#86868b]">พนักงาน</th>
                    <th className="text-center px-4 py-3 text-[13px] font-semibold text-[#86868b]">เข้างาน</th>
                    <th className="text-center px-4 py-3 text-[13px] font-semibold text-[#86868b]">ออกงาน</th>
                    <th className="text-center px-4 py-3 text-[13px] font-semibold text-[#86868b]">ชั่วโมง</th>
                    <th className="text-center px-4 py-3 text-[13px] font-semibold text-[#86868b]">OT</th>
                    <th className="text-center px-4 py-3 text-[13px] font-semibold text-[#86868b]">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12">
                        <div className="w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : dailySummaries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-[#86868b]">
                        ไม่มีข้อมูล
                      </td>
                    </tr>
                  ) : (
                    dailySummaries.map((summary) => (
                      <tr key={summary.id} className="border-b border-[#e8e8ed] hover:bg-[#f5f5f7]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={summary.name} size="sm" />
                            <span className="text-[14px] font-medium text-[#1d1d1f]">{summary.name}</span>
                          </div>
                        </td>
                        <td className="text-center px-4 py-3 text-[14px] text-[#6e6e73]">
                          {summary.attendance?.clock_in
                            ? format(new Date(summary.attendance.clock_in), "HH:mm")
                            : "-"}
                        </td>
                        <td className="text-center px-4 py-3 text-[14px] text-[#6e6e73]">
                          {summary.attendance?.clock_out
                            ? format(new Date(summary.attendance.clock_out), "HH:mm")
                            : "-"}
                        </td>
                        <td className="text-center px-4 py-3 text-[14px] text-[#6e6e73]">
                          {summary.attendance?.work_hours
                            ? `${summary.attendance.work_hours.toFixed(1)} ชม.`
                            : "-"}
                        </td>
                        <td className="text-center px-4 py-3">
                          {summary.ot ? (
                            <span className="text-[14px] font-medium text-[#ff9500]">
                              {summary.ot.hours.toFixed(1)} ชม.
                              <span className="text-[#34c759] ml-1">(฿{summary.ot.amount.toFixed(0)})</span>
                            </span>
                          ) : (
                            <span className="text-[14px] text-[#86868b]">-</span>
                          )}
                        </td>
                        <td className="text-center px-4 py-3">
                          {getDailyStatusBadge(summary)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </Tabs.Content>

        {/* ================== TAB 2: HISTORY ================== */}
        <Tabs.Content value="history" className="outline-none">
          {/* Month Navigation & Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-[#6e6e73]" />
              </button>
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] min-w-[200px] text-center">
                {format(currentMonth, "MMMM yyyy", { locale: th })}
              </h2>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-[#6e6e73]" />
              </button>
            </div>
          </div>

          <Card elevated className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-[#86868b] mb-1">พนักงาน</label>
                <Select
                  value={filterEmployee}
                  onChange={setFilterEmployee}
                  options={[
                    { value: "", label: "ทั้งหมด" },
                    ...employees.map((emp) => ({ value: emp.id, label: emp.name })),
                  ]}
                  placeholder="เลือกพนักงาน"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#86868b] mb-1">สถานะ</label>
                <Select
                  value={filterStatus}
                  onChange={setFilterStatus}
                  options={[
                    { value: "all", label: "ทั้งหมด" },
                    { value: "normal", label: "ปกติ" },
                    { value: "late", label: "มาสาย" },
                    { value: "holiday", label: "วันหยุด" },
                    { value: "no_checkout", label: "ไม่ได้เช็คเอาท์" },
                  ]}
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#86868b] mb-1">สาขา</label>
                <Select
                  value={filterBranch}
                  onChange={setFilterBranch}
                  options={[
                    { value: "", label: "ทั้งหมด" },
                    ...branches.map((b) => ({ value: b.id, label: b.name })),
                  ]}
                  placeholder="เลือกสาขา"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#86868b] mb-1">วันที่</label>
                <DateInput
                  value={filterDate}
                  onChange={setFilterDate}
                  placeholder="วว/ดด/ปปปป"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilterEmployee("");
                    setFilterStatus("all");
                    setFilterBranch("");
                    setFilterDate("");
                  }}
                  className="px-4 py-2 text-[14px] text-[#0071e3] hover:bg-[#0071e3]/10 rounded-lg transition-colors"
                >
                  ล้าง Filter
                </button>
              </div>
            </div>
          </Card>

          {/* Table */}
          <Card elevated padding="none">
            {historyLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : attendance.length === 0 ? (
              <div className="text-center py-20 text-[#86868b]">
                ไม่มีข้อมูลการเข้างานในเดือนนี้
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#e8e8ed]">
                      <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">วันที่</th>
                      <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">พนักงาน</th>
                      <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">เข้างาน</th>
                      <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">ออกงาน</th>
                      <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">ชั่วโมง</th>
                      <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">OT</th>
                      <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">สถานะ</th>
                      <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">รูปภาพ</th>
                      <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8e8ed]">
                    {attendance.map((log) => (
                      <tr key={log.id} className="hover:bg-[#f5f5f7] transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-[14px] text-[#1d1d1f]">
                            {format(new Date(log.work_date), "dd/MM/yyyy")}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={log.employee?.name || "?"} size="sm" />
                            <span className="text-[14px] text-[#1d1d1f]">{log.employee?.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-[14px] text-[#6e6e73]">
                            <Clock className="w-4 h-4" />
                            {log.clock_in_time ? format(new Date(log.clock_in_time), "HH:mm") : "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-[14px] text-[#6e6e73]">
                            <Clock className="w-4 h-4" />
                            {log.clock_out_time ? format(new Date(log.clock_out_time), "HH:mm") : "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[14px] font-medium text-[#1d1d1f]">
                            {log.total_hours?.toFixed(1) || "0"} ชม.
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {(() => {
                            const key = `${log.employee_id}_${log.work_date}`;
                            const ots = otData[key] || [];
                            if (ots.length === 0) return <span className="text-[12px] text-[#86868b]">-</span>;
                            const totalHours = ots.reduce((sum: number, ot: any) => sum + (ot.actual_ot_hours || 0), 0);
                            const totalAmount = ots.reduce((sum: number, ot: any) => sum + (ot.ot_amount || 0), 0);
                            return (
                              <div className="text-[13px]">
                                <span className="font-medium text-orange-600">{totalHours.toFixed(1)} ชม.</span>
                                <span className="text-[#86868b] ml-1">(฿{totalAmount.toFixed(0)})</span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4">{getHistoryStatusBadge(log)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {log.clock_in_photo_url && (
                              <button
                                onClick={() => setViewingPhoto(log.clock_in_photo_url)}
                                className="flex items-center gap-1 px-2 py-1 text-[12px] text-[#0071e3] bg-[#0071e3]/10 rounded-lg hover:bg-[#0071e3]/20"
                              >
                                <Camera className="w-3 h-3" />
                                เข้า
                              </button>
                            )}
                            {log.clock_out_photo_url && (
                              <button
                                onClick={() => setViewingPhoto(log.clock_out_photo_url)}
                                className="flex items-center gap-1 px-2 py-1 text-[12px] text-[#34c759] bg-[#34c759]/10 rounded-lg hover:bg-[#34c759]/20"
                              >
                                <Camera className="w-3 h-3" />
                                ออก
                              </button>
                            )}
                            {!log.clock_in_photo_url && !log.clock_out_photo_url && (
                              <span className="text-[12px] text-[#86868b]">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/admin/attendance/edit/${log.id}`}
                              className="flex items-center gap-1 px-3 py-1.5 text-[12px] text-[#0071e3] bg-[#0071e3]/10 rounded-lg hover:bg-[#0071e3]/20"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              แก้ไข
                            </Link>
                            {!log.clock_out_time && (
                              <span className="flex items-center gap-1 px-2 py-1 text-[11px] text-[#ff9500] bg-[#ff9500]/10 rounded-lg">
                                <AlertCircle className="w-3 h-3" />
                                ไม่เช็คเอาท์
                              </span>
                            )}
                            {log.auto_checkout && (
                              <span className="px-2 py-1 text-[11px] text-[#0071e3] bg-[#0071e3]/10 rounded-lg">Auto</span>
                            )}
                            {log.edited_at && (
                              <span className="px-2 py-1 text-[11px] text-[#86868b] bg-[#f5f5f7] rounded-lg">แก้ไขแล้ว</span>
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
        </Tabs.Content>
      </Tabs.Root>

      {/* Add Attendance Modal */}
      <Modal
        isOpen={addModal}
        onClose={() => setAddModal(false)}
        title="เพิ่มการเข้างาน"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
              <User className="w-4 h-4 inline mr-1" />
              พนักงาน *
            </label>
            <Select
              value={addForm.employeeId}
              onChange={(val) => setAddForm({ ...addForm, employeeId: val })}
              options={[
                { value: "", label: "เลือกพนักงาน" },
                ...employees.map((emp) => ({
                  value: emp.id,
                  label: `${emp.name} (${emp.email})`,
                })),
              ]}
              placeholder="เลือกพนักงาน"
            />
          </div>

          <DateInput
            label="วันที่ *"
            value={addForm.workDate}
            onChange={(val) => setAddForm({ ...addForm, workDate: val })}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เวลาเข้างาน</label>
              <TimeInput
                value={addForm.clockInTime}
                onChange={(val) => setAddForm({ ...addForm, clockInTime: val })}
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เวลาออกงาน</label>
              <TimeInput
                value={addForm.clockOutTime}
                onChange={(val) => setAddForm({ ...addForm, clockOutTime: val })}
              />
            </div>
          </div>

          <div>
            <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">สถานะ</label>
            <Select
              value={addForm.status}
              onChange={(val) => setAddForm({ ...addForm, status: val })}
              options={[
                { value: "present", label: "ปกติ" },
                { value: "holiday", label: "วันหยุด (OT)" },
                { value: "wfh", label: "WFH" },
              ]}
            />
          </div>

          <label className="flex items-center gap-3 p-3 bg-[#f5f5f7] rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={addForm.isLate}
              onChange={(e) => setAddForm({ ...addForm, isLate: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <span className="text-[15px] text-[#1d1d1f]">มาสาย</span>
          </label>

          <div>
            <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">หมายเหตุ</label>
            <Input
              value={addForm.note}
              onChange={(e) => setAddForm({ ...addForm, note: e.target.value })}
              placeholder="เช่น เพิ่มให้เพราะลืมเช็คอิน"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={() => setAddModal(false)} className="flex-1">
              ยกเลิก
            </Button>
            <Button onClick={handleAddAttendance} loading={saving} className="flex-1">
              <Plus className="w-4 h-4" />
              เพิ่ม
            </Button>
          </div>
        </div>
      </Modal>

      {/* Photo Modal */}
      {viewingPhoto && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white rounded-full"
            onClick={() => setViewingPhoto(null)}
          >
            <X className="w-5 h-5" />
          </button>
          <img src={viewingPhoto} alt="" className="max-w-full max-h-[90vh] rounded-2xl" />
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
