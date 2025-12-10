"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  Download,
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
  Clock,
  Calendar,
  Home,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  FileText,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isWeekend } from "date-fns";
import { th } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// =====================
// TYPES
// =====================
interface Branch {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  branch_id: string | null;
}

interface AttendanceLog {
  id: string;
  employee_id: string;
  work_date: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  total_hours: number | null;
  is_late: boolean;
  late_minutes: number | null;
  status: string;
}

interface OTRequest {
  id: string;
  employee_id: string;
  request_date: string;
  ot_type: string;
  status: string;
  actual_ot_hours: number | null;
  approved_ot_hours: number | null;
  ot_amount: number | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
}

interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  status: string;
}

interface WFHRequest {
  id: string;
  employee_id: string;
  date: string;
  is_half_day: boolean;
  status: string;
}

interface EmployeeReport {
  id: string;
  name: string;
  email: string;
  role: string;
  branch_id: string | null;
  branchName: string;
  workDays: number;
  workHours: number;
  lateDays: number;
  lateMinutes: number;
  leaveDays: number;
  wfhDays: number;
  otHours: number;
  otAmount: number;
}

// =====================
// MAIN COMPONENT
// =====================
function ReportsContent() {
  // State
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [otRequests, setOtRequests] = useState<OTRequest[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [wfhRequests, setWfhRequests] = useState<WFHRequest[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");

  // =====================
  // DATA FETCHING
  // =====================
  
  // Fetch branches on mount
  useEffect(() => {
    const fetchBranches = async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name")
        .order("name");
      
      if (error) {
        console.error("Error fetching branches:", error);
      }
      setBranches(data || []);
    };
    fetchBranches();
  }, []);

  // Main data fetch
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    
    try {
      const startDate = startOfMonth(currentMonth);
      const endDate = endOfMonth(currentMonth);
      const startStr = format(startDate, "yyyy-MM-dd");
      const endStr = format(endDate, "yyyy-MM-dd");

      console.log("📅 Fetching data for:", startStr, "to", endStr);

      // Fetch all data in parallel
      const [employeesRes, attendanceRes, otRes, leaveRes, wfhRes] = await Promise.all([
        // Employees - get all approved employees (exclude admin)
        supabase
          .from("employees")
          .select("id, name, email, role, branch_id")
          .eq("account_status", "approved")
          .neq("role", "admin"),
        
        // Attendance - all logs in date range
        supabase
          .from("attendance_logs")
          .select("*")
          .gte("work_date", startStr)
          .lte("work_date", endStr),
        
        // OT - approved OR completed (both count as valid OT)
        supabase
          .from("ot_requests")
          .select("*")
          .in("status", ["approved", "completed"])
          .gte("request_date", startStr)
          .lte("request_date", endStr),
        
        // Leave - approved only
        supabase
          .from("leave_requests")
          .select("*")
          .eq("status", "approved")
          .lte("start_date", endStr)
          .gte("end_date", startStr),
        
        // WFH - approved only (field is "date" not "work_date")
        supabase
          .from("wfh_requests")
          .select("*")
          .eq("status", "approved")
          .gte("date", startStr)
          .lte("date", endStr),
      ]);

      // Log errors if any
      if (employeesRes.error) console.error("❌ Employees error:", employeesRes.error);
      if (attendanceRes.error) console.error("❌ Attendance error:", attendanceRes.error);
      if (otRes.error) console.error("❌ OT error:", otRes.error);
      if (leaveRes.error) console.error("❌ Leave error:", leaveRes.error);
      if (wfhRes.error) console.error("❌ WFH error:", wfhRes.error);

      // Log data counts for debugging
      console.log("👥 Employees:", employeesRes.data?.length || 0);
      console.log("📋 Attendance:", attendanceRes.data?.length || 0);
      console.log("⏰ OT requests:", otRes.data?.length || 0);
      console.log("🏖️ Leave:", leaveRes.data?.length || 0);
      console.log("🏠 WFH:", wfhRes.data?.length || 0);

      // Debug: Log OT data
      if (otRes.data && otRes.data.length > 0) {
        console.log("📊 OT Data sample:", otRes.data.slice(0, 3));
      }

      // Set state
      setEmployees(employeesRes.data || []);
      setAttendanceLogs(attendanceRes.data || []);
      setOtRequests(otRes.data || []);
      setLeaveRequests(leaveRes.data || []);
      setWfhRequests(wfhRes.data || []);

    } catch (error) {
      console.error("❌ Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  // Fetch when month changes
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // =====================
  // COMPUTED DATA
  // =====================

  // Get branch name helper
  const getBranchName = useCallback((branchId: string | null): string => {
    if (!branchId) return "ไม่ระบุสาขา";
    const branch = branches.find((b) => b.id === branchId);
    return branch?.name || "ไม่ระบุสาขา";
  }, [branches]);

  // Calculate report for each employee
  const employeeReports = useMemo((): EmployeeReport[] => {
    const startDate = startOfMonth(currentMonth);
    const endDate = endOfMonth(currentMonth);

    return employees.map((emp) => {
      // Filter data for this employee
      const empAttendance = attendanceLogs.filter((a) => a.employee_id === emp.id);
      const empOT = otRequests.filter((o) => o.employee_id === emp.id);
      const empLeave = leaveRequests.filter((l) => l.employee_id === emp.id);
      const empWFH = wfhRequests.filter((w) => w.employee_id === emp.id);

      // Work days & hours (only present or wfh status)
      const workDays = empAttendance.filter(
        (a) => a.status === "present" || a.status === "wfh"
      ).length;
      
      const workHours = empAttendance.reduce(
        (sum, a) => sum + (a.total_hours || 0), 
        0
      );

      // Late stats
      const lateDays = empAttendance.filter((a) => a.is_late).length;
      const lateMinutes = empAttendance.reduce(
        (sum, a) => sum + (a.is_late ? (a.late_minutes || 0) : 0),
        0
      );

      // Leave days calculation (considering date overlap with current month)
      let leaveDays = 0;
      empLeave.forEach((leave) => {
        if (leave.is_half_day) {
          leaveDays += 0.5;
        } else {
          const leaveStart = new Date(leave.start_date);
          const leaveEnd = new Date(leave.end_date);
          const effectiveStart = leaveStart < startDate ? startDate : leaveStart;
          const effectiveEnd = leaveEnd > endDate ? endDate : leaveEnd;
          
          // Count weekdays only
          let days = 0;
          const current = new Date(effectiveStart);
          while (current <= effectiveEnd) {
            if (!isWeekend(current)) {
              days++;
            }
            current.setDate(current.getDate() + 1);
          }
          leaveDays += days;
        }
      });

      // WFH days
      let wfhDays = 0;
      empWFH.forEach((w) => {
        wfhDays += w.is_half_day ? 0.5 : 1;
      });

      // OT calculation - use actual_ot_hours if available, otherwise approved_ot_hours
      let otHours = 0;
      let otAmount = 0;
      empOT.forEach((ot) => {
        // Priority: actual_ot_hours > approved_ot_hours
        const hours = ot.actual_ot_hours ?? ot.approved_ot_hours ?? 0;
        otHours += hours;
        otAmount += ot.ot_amount || 0;
      });

      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        branch_id: emp.branch_id,
        branchName: getBranchName(emp.branch_id),
        workDays,
        workHours,
        lateDays,
        lateMinutes,
        leaveDays,
        wfhDays,
        otHours,
        otAmount,
      };
    });
  }, [employees, attendanceLogs, otRequests, leaveRequests, wfhRequests, currentMonth, getBranchName]);

  // Filter reports based on search and filters
  const filteredReports = useMemo(() => {
    return employeeReports.filter((r) => {
      const matchSearch = 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchBranch = 
        selectedBranch === "all" ||
        (selectedBranch === "none" && !r.branch_id) ||
        r.branch_id === selectedBranch;
      
      const matchRole = selectedRole === "all" || r.role === selectedRole;
      
      return matchSearch && matchBranch && matchRole;
    });
  }, [employeeReports, searchTerm, selectedBranch, selectedRole]);

  // Summary stats
  const summary = useMemo(() => {
    return {
      totalEmployees: filteredReports.length,
      totalWorkDays: filteredReports.reduce((sum, r) => sum + r.workDays, 0),
      totalWorkHours: filteredReports.reduce((sum, r) => sum + r.workHours, 0),
      totalLateDays: filteredReports.reduce((sum, r) => sum + r.lateDays, 0),
      totalLeaveDays: filteredReports.reduce((sum, r) => sum + r.leaveDays, 0),
      totalWFHDays: filteredReports.reduce((sum, r) => sum + r.wfhDays, 0),
      totalOTHours: filteredReports.reduce((sum, r) => sum + r.otHours, 0),
      totalOTAmount: filteredReports.reduce((sum, r) => sum + r.otAmount, 0),
    };
  }, [filteredReports]);

  // Daily stats for chart
  const dailyStats = useMemo(() => {
    const startDate = startOfMonth(currentMonth);
    const endDate = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return days.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      
      const dayAttendance = attendanceLogs.filter((a) => a.work_date === dateStr);
      const dayOT = otRequests.filter((o) => o.request_date === dateStr);
      const dayLeave = leaveRequests.filter(
        (l) => l.start_date <= dateStr && l.end_date >= dateStr
      );
      const dayWFH = wfhRequests.filter((w) => w.date === dateStr);

      return {
        date: format(day, "d", { locale: th }),
        fullDate: dateStr,
        attendance: dayAttendance.length,
        late: dayAttendance.filter((a) => a.is_late).length,
        otHours: dayOT.reduce((sum, o) => sum + (o.actual_ot_hours ?? o.approved_ot_hours ?? 0), 0),
        leave: dayLeave.length,
        wfh: dayWFH.length,
      };
    });
  }, [attendanceLogs, otRequests, leaveRequests, wfhRequests, currentMonth]);

  // Branch stats for chart
  const branchStats = useMemo(() => {
    const branchMap = new Map<string, { name: string; otHours: number; lateDays: number; employees: number }>();
    
    filteredReports.forEach((r) => {
      const branchName = r.branchName;
      if (!branchMap.has(branchName)) {
        branchMap.set(branchName, { name: branchName, otHours: 0, lateDays: 0, employees: 0 });
      }
      const b = branchMap.get(branchName)!;
      b.otHours += r.otHours;
      b.lateDays += r.lateDays;
      b.employees += 1;
    });

    return Array.from(branchMap.values());
  }, [filteredReports]);

  // OT Type distribution for pie chart
  const otTypeStats = useMemo(() => {
    const typeMap = new Map<string, number>();
    
    otRequests.forEach((ot) => {
      const type = ot.ot_type || "normal";
      const hours = ot.actual_ot_hours ?? ot.approved_ot_hours ?? 0;
      typeMap.set(type, (typeMap.get(type) || 0) + hours);
    });

    const colors: Record<string, string> = {
      normal: "#0071e3",
      holiday: "#ff9500",
      pre_shift: "#af52de",
    };

    const labels: Record<string, string> = {
      normal: "OT ปกติ",
      holiday: "OT วันหยุด",
      pre_shift: "OT ก่อนเวลา",
    };

    return Array.from(typeMap.entries()).map(([type, hours]) => ({
      name: labels[type] || type,
      value: hours,
      color: colors[type] || "#86868b",
    }));
  }, [otRequests]);

  // =====================
  // ACTIONS
  // =====================

  const exportToCSV = () => {
    if (!filteredReports.length) return;

    const headers = [
      "ชื่อ",
      "อีเมล",
      "ตำแหน่ง",
      "สาขา",
      "วันทำงาน",
      "ชั่วโมงทำงาน",
      "วันสาย",
      "นาทีสาย",
      "วันลา",
      "วัน WFH",
      "ชั่วโมง OT",
      "เงิน OT"
    ];
    
    const rows = filteredReports.map((r) => [
      r.name,
      r.email,
      getRoleLabel(r.role),
      r.branchName,
      r.workDays,
      r.workHours.toFixed(1),
      r.lateDays,
      r.lateMinutes,
      r.leaveDays,
      r.wfhDays,
      r.otHours.toFixed(1),
      r.otAmount.toFixed(0),
    ]);
    
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `report-${format(currentMonth, "yyyy-MM")}.csv`;
    link.click();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin": return "Admin";
      case "supervisor": return "Supervisor";
      default: return "พนักงาน";
    }
  };

  // =====================
  // RENDER
  // =====================
  return (
    <AdminLayout title="รายงานสรุป">
      {/* Header Controls */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-[#6e6e73]" />
            </button>
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] min-w-[180px] text-center">
              {format(currentMonth, "MMMM yyyy", { locale: th })}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-[#6e6e73]" />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="text" 
              size="sm" 
              onClick={fetchAllData} 
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={exportToCSV} 
              disabled={!filteredReports.length}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
            <input
              type="text"
              placeholder="ค้นหาพนักงาน..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#d2d2d7] focus:border-[#0071e3] outline-none text-[15px]"
            />
          </div>
          <div className="min-w-[150px]">
            <Select
              value={selectedBranch}
              onChange={setSelectedBranch}
              options={[
                { value: "all", label: "ทุกสาขา" },
                { value: "none", label: "ไม่มีสาขา" },
                ...branches.map((b) => ({ value: b.id, label: b.name }))
              ]}
              placeholder="เลือกสาขา"
            />
          </div>
          <div className="min-w-[130px]">
            <Select
              value={selectedRole}
              onChange={setSelectedRole}
              options={[
                { value: "all", label: "ทุกตำแหน่ง" },
                { value: "staff", label: "พนักงาน" },
                { value: "supervisor", label: "หัวหน้างาน" },
                { value: "admin", label: "Admin" },
              ]}
              placeholder="ตำแหน่ง"
            />
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {[
          { label: "พนักงาน", value: summary.totalEmployees, icon: Users, color: "text-[#1d1d1f]", bg: "bg-[#f5f5f7]" },
          { label: "วันทำงาน", value: summary.totalWorkDays, icon: Calendar, color: "text-[#0071e3]", bg: "bg-[#0071e3]/10" },
          { label: "ชั่วโมง", value: summary.totalWorkHours.toFixed(0), icon: Clock, color: "text-[#34c759]", bg: "bg-[#34c759]/10" },
          { label: "มาสาย", value: summary.totalLateDays, icon: AlertTriangle, color: "text-[#ff3b30]", bg: "bg-[#ff3b30]/10" },
          { label: "ลางาน", value: summary.totalLeaveDays.toFixed(1), icon: FileText, color: "text-[#ff9500]", bg: "bg-[#ff9500]/10" },
          { label: "WFH", value: summary.totalWFHDays.toFixed(1), icon: Home, color: "text-[#af52de]", bg: "bg-[#af52de]/10" },
          { label: "OT (ชม.)", value: summary.totalOTHours.toFixed(1), icon: TrendingUp, color: "text-[#ff9500]", bg: "bg-[#ff9500]/10" },
        ].map((stat, i) => (
          <Card key={i} elevated>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <p className={`text-[18px] font-semibold ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-[#86868b]">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Daily Trend Chart */}
        <Card elevated padding="none" className="p-4">
          <div className="mb-4">
            <h4 className="text-[15px] font-semibold text-[#1d1d1f]">📈 แนวโน้มรายวัน</h4>
            <p className="text-[12px] text-[#86868b]">จำนวนพนักงานเข้างาน และชั่วโมง OT</p>
          </div>
          <div className="h-[250px] w-full text-[11px]">
            {dailyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyStats}>
                  <defs>
                    <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0071e3" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0071e3" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOT" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff9500" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ff9500" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#86868b", fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#86868b", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                    formatter={(value: number, name: string) => [
                      name === "เข้างาน" ? `${value} คน` : `${value.toFixed(1)} ชม.`,
                      name
                    ]}
                  />
                  <Legend iconType="circle" />
                  <Area
                    type="monotone"
                    dataKey="attendance"
                    name="เข้างาน"
                    stroke="#0071e3"
                    strokeWidth={2}
                    fill="url(#colorAtt)"
                  />
                  <Area
                    type="monotone"
                    dataKey="otHours"
                    name="OT (ชม.)"
                    stroke="#ff9500"
                    strokeWidth={2}
                    fill="url(#colorOT)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-[#86868b]">
                ไม่มีข้อมูล
              </div>
            )}
          </div>
        </Card>

        {/* Branch Stats Chart */}
        <Card elevated padding="none" className="p-4">
          <div className="mb-4">
            <h4 className="text-[15px] font-semibold text-[#1d1d1f]">🏢 สถิติตามสาขา</h4>
            <p className="text-[12px] text-[#86868b]">ชั่วโมง OT และวันสายแยกตามสาขา</p>
          </div>
          <div className="h-[250px] w-full text-[11px]">
            {branchStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="#e5e7eb" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#86868b", fontSize: 10 }} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={90} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#1d1d1f", fontSize: 11 }} 
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                    cursor={{ fill: "transparent" }}
                  />
                  <Legend iconType="circle" />
                  <Bar dataKey="otHours" name="OT (ชม.)" fill="#ff9500" radius={[0, 4, 4, 0]} barSize={16} />
                  <Bar dataKey="lateDays" name="สาย (วัน)" fill="#ff3b30" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-[#86868b]">
                ไม่มีข้อมูล
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Charts Row 2 - OT Type Distribution */}
      {otTypeStats.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card elevated padding="none" className="p-4">
            <div className="mb-4">
              <h4 className="text-[15px] font-semibold text-[#1d1d1f]">⏰ ประเภท OT</h4>
              <p className="text-[12px] text-[#86868b]">สัดส่วนชั่วโมง OT แยกตามประเภท</p>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={otTypeStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value.toFixed(1)}`}
                    labelLine={false}
                  >
                    {otTypeStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(1)} ชม.`]}
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Top 5 OT */}
          <Card elevated padding="none">
            <div className="px-4 py-3 border-b border-[#e8e8ed]">
              <h4 className="text-[15px] font-semibold text-[#1d1d1f]">🏆 Top 5 OT</h4>
            </div>
            <div className="divide-y divide-[#e8e8ed]">
              {[...filteredReports]
                .sort((a, b) => b.otHours - a.otHours)
                .slice(0, 5)
                .filter(r => r.otHours > 0)
                .map((row, i) => (
                  <div key={row.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[12px] font-bold ${
                      i === 0 ? "bg-[#ffd700] text-[#1d1d1f]" :
                      i === 1 ? "bg-[#c0c0c0] text-[#1d1d1f]" :
                      i === 2 ? "bg-[#cd7f32] text-white" : 
                      "bg-[#f5f5f7] text-[#6e6e73]"
                    }`}>
                      {i + 1}
                    </span>
                    <Avatar name={row.name} size="sm" />
                    <span className="flex-1 text-[13px] text-[#1d1d1f] truncate">{row.name}</span>
                    <div className="text-right">
                      <span className="text-[14px] font-semibold text-[#ff9500]">
                        {row.otHours.toFixed(1)} ชม.
                      </span>
                      {row.otAmount > 0 && (
                        <p className="text-[10px] text-[#86868b]">฿{row.otAmount.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                ))}
              {filteredReports.filter(r => r.otHours > 0).length === 0 && (
                <div className="text-center py-6 text-[#86868b] text-[13px]">ไม่มีข้อมูล OT</div>
              )}
            </div>
          </Card>

          {/* Top 5 Late */}
          <Card elevated padding="none">
            <div className="px-4 py-3 border-b border-[#e8e8ed]">
              <h4 className="text-[15px] font-semibold text-[#1d1d1f]">⚠️ Top 5 มาสาย</h4>
            </div>
            <div className="divide-y divide-[#e8e8ed]">
              {[...filteredReports]
                .sort((a, b) => b.lateDays - a.lateDays)
                .slice(0, 5)
                .filter(r => r.lateDays > 0)
                .map((row, i) => (
                  <div key={row.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[12px] font-bold ${
                      i === 0 ? "bg-[#ff3b30] text-white" :
                      i === 1 ? "bg-[#ff9500] text-white" :
                      i === 2 ? "bg-[#ffcc00] text-[#1d1d1f]" : 
                      "bg-[#f5f5f7] text-[#6e6e73]"
                    }`}>
                      {i + 1}
                    </span>
                    <Avatar name={row.name} size="sm" />
                    <span className="flex-1 text-[13px] text-[#1d1d1f] truncate">{row.name}</span>
                    <div className="text-right">
                      <span className="text-[14px] font-semibold text-[#ff3b30]">{row.lateDays} วัน</span>
                      <p className="text-[10px] text-[#86868b]">{row.lateMinutes} นาที</p>
                    </div>
                  </div>
                ))}
              {filteredReports.filter(r => r.lateDays > 0).length === 0 && (
                <div className="text-center py-6 text-[#86868b] text-[13px]">ไม่มีคนมาสาย 🎉</div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Data Table */}
      <Card elevated padding="none">
        <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center justify-between">
          <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
            รายงานพนักงาน
          </h3>
          <Badge variant="default">{filteredReports.length} คน</Badge>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-20 text-[#86868b]">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>ไม่มีข้อมูลพนักงาน</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e8e8ed] bg-[#f5f5f7]">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#86868b] uppercase">พนักงาน</th>
                  <th className="text-left px-3 py-3 text-[11px] font-semibold text-[#86868b] uppercase hidden md:table-cell">สาขา</th>
                  <th className="text-center px-3 py-3 text-[11px] font-semibold text-[#86868b] uppercase">วันทำงาน</th>
                  <th className="text-center px-3 py-3 text-[11px] font-semibold text-[#86868b] uppercase">ชั่วโมง</th>
                  <th className="text-center px-3 py-3 text-[11px] font-semibold text-[#86868b] uppercase">สาย</th>
                  <th className="text-center px-3 py-3 text-[11px] font-semibold text-[#86868b] uppercase">ลา</th>
                  <th className="text-center px-3 py-3 text-[11px] font-semibold text-[#86868b] uppercase">WFH</th>
                  <th className="text-center px-3 py-3 text-[11px] font-semibold text-[#86868b] uppercase">OT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e8ed]">
                {filteredReports.map((row) => (
                  <tr key={row.id} className="hover:bg-[#f5f5f7]/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={row.name} size="sm" />
                        <div>
                          <p className="text-[13px] font-medium text-[#1d1d1f]">{row.name}</p>
                          <p className="text-[11px] text-[#86868b]">{getRoleLabel(row.role)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <span className="text-[12px] text-[#6e6e73]">{row.branchName}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-[13px] font-medium text-[#1d1d1f]">{row.workDays}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-[13px] font-medium text-[#0071e3]">{row.workHours.toFixed(1)}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {row.lateDays > 0 ? (
                        <span className="text-[13px] font-medium text-[#ff3b30]">
                          {row.lateDays} <span className="text-[10px]">({row.lateMinutes}น.)</span>
                        </span>
                      ) : (
                        <span className="text-[13px] text-[#34c759]">✓</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {row.leaveDays > 0 ? (
                        <span className="text-[13px] font-medium text-[#ff9500]">{row.leaveDays}</span>
                      ) : (
                        <span className="text-[13px] text-[#86868b]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {row.wfhDays > 0 ? (
                        <span className="text-[13px] font-medium text-[#af52de]">{row.wfhDays}</span>
                      ) : (
                        <span className="text-[13px] text-[#86868b]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {row.otHours > 0 ? (
                        <div>
                          <span className="text-[13px] font-medium text-[#ff9500]">{row.otHours.toFixed(1)} ชม.</span>
                          {row.otAmount > 0 && (
                            <p className="text-[10px] text-[#86868b]">฿{row.otAmount.toLocaleString()}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[13px] text-[#86868b]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary Footer */}
        {filteredReports.length > 0 && (
          <div className="px-6 py-4 border-t border-[#e8e8ed] bg-[#f5f5f7]/50">
            <div className="flex flex-wrap gap-6 text-[12px]">
              <div>
                <span className="text-[#86868b]">รวมชั่วโมงทำงาน:</span>
                <span className="ml-2 font-semibold text-[#1d1d1f]">{summary.totalWorkHours.toFixed(1)} ชม.</span>
              </div>
              <div>
                <span className="text-[#86868b]">รวม OT:</span>
                <span className="ml-2 font-semibold text-[#ff9500]">{summary.totalOTHours.toFixed(1)} ชม.</span>
                {summary.totalOTAmount > 0 && (
                  <span className="ml-1 text-[#86868b]">(฿{summary.totalOTAmount.toLocaleString()})</span>
                )}
              </div>
              <div>
                <span className="text-[#86868b]">รวมสาย:</span>
                <span className="ml-2 font-semibold text-[#ff3b30]">{summary.totalLateDays} วัน</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === "development" && (
        <Card elevated className="mt-6">
          <h4 className="text-[13px] font-semibold text-[#1d1d1f] mb-2">🔧 Debug Info</h4>
          <div className="text-[11px] text-[#86868b] space-y-1">
            <p>Employees: {employees.length}</p>
            <p>Attendance Logs: {attendanceLogs.length}</p>
            <p>OT Requests: {otRequests.length}</p>
            <p>Leave Requests: {leaveRequests.length}</p>
            <p>WFH Requests: {wfhRequests.length}</p>
            <p>Branches: {branches.length}</p>
          </div>
        </Card>
      )}
    </AdminLayout>
  );
}

export default function ReportsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <ReportsContent />
    </ProtectedRoute>
  );
}
