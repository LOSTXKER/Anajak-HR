"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval } from "date-fns";
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
} from "recharts";

interface Branch {
  id: string;
  name: string;
}

interface ReportData {
  id: string;
  name: string;
  email: string;
  role: string;
  branch_id: string | null;
  totalWorkDays: number;
  totalWorkHours: number;
  totalLateDays: number;
  totalLateMinutes: number;
  totalLeaveDays: number;
  totalWFHDays: number;
  totalOTHours: number;
  totalOTAmount: number;
}

function ReportsContent() {
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [dailyStats, setDailyStats] = useState<any[]>([]); // For trend chart
  const [branchStats, setBranchStats] = useState<any[]>([]); // For branch chart

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");

  const [summary, setSummary] = useState({
    totalEmployees: 0,
    totalWorkDays: 0,
    totalWorkHours: 0,
    totalLateDays: 0,
    totalLeaveDays: 0,
    totalWFHDays: 0,
    totalOTHours: 0,
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [currentMonth]);

  const fetchBranches = async () => {
    const { data } = await supabase
      .from("branches")
      .select("id, name")
      .order("name");
    setBranches(data || []);
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const startDate = startOfMonth(currentMonth);
      const endDate = endOfMonth(currentMonth);
      const startStr = format(startDate, "yyyy-MM-dd");
      const endStr = format(endDate, "yyyy-MM-dd");

      // 1. Fetch Employees
      const { data: employees } = await supabase
        .from("employees")
        .select("id, name, email, role, branch_id")
        .eq("account_status", "approved")
        .neq("is_system_account", true);

      if (!employees) {
        setReportData([]);
        setLoading(false);
        return;
      }

      // 2. Batch Fetch All Logs in Range
      const [
        { data: attendanceLogs },
        { data: otRequests },
        { data: leaveRequests },
        { data: wfhRequests },
      ] = await Promise.all([
        supabase
          .from("attendance_logs")
          .select("*")
          .gte("work_date", startStr)
          .lte("work_date", endStr),
        supabase
          .from("ot_requests")
          .select("*")
          .eq("status", "approved")
          .not("actual_end_time", "is", null) // Only completed OT
          .gte("request_date", startStr)
          .lte("request_date", endStr),
        supabase
          .from("leave_requests")
          .select("*")
          .eq("status", "approved")
          .gte("start_date", startStr)
          .lte("end_date", endStr),
        supabase
          .from("wfh_requests")
          .select("*")
          .eq("status", "approved")
          .gte("work_date", startStr)
          .lte("work_date", endStr),
      ]);

      // 3. Process Per Employee
      const processedReports = employees.map((emp) => {
        // Filter logs for this employee
        const userAttendance = attendanceLogs?.filter((a: any) => a.employee_id === emp.id) || [];
        const userOt = otRequests?.filter((o: any) => o.employee_id === emp.id) || [];
        const userLeave = leaveRequests?.filter((l: any) => l.employee_id === emp.id) || [];
        const userWfh = wfhRequests?.filter((w: any) => w.employee_id === emp.id) || [];

        // Calculate Stats
        const totalWorkDays = userAttendance.filter((a: any) => a.status !== "holiday").length;
        const totalWorkHours = userAttendance.reduce((sum: number, a: any) => sum + (a.total_hours || 0), 0);
        const totalLateDays = userAttendance.filter((a: any) => a.is_late).length;
        const totalLateMinutes = userAttendance.reduce(
          (sum: number, a: any) => sum + (a.is_late ? a.late_minutes || 0 : 0),
          0
        );

        let totalLeaveDays = 0;
        userLeave.forEach((l: any) => {
          if (l.is_half_day) {
            totalLeaveDays += 0.5;
          } else {
            const start = new Date(Math.max(new Date(l.start_date).getTime(), startDate.getTime()));
            const end = new Date(Math.min(new Date(l.end_date).getTime(), endDate.getTime()));
            // Simple day diff for now
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            totalLeaveDays += diffDays;
          }
        });

        let totalWFHDays = 0;
        userWfh.forEach((w: any) => {
          totalWFHDays += w.is_half_day ? 0.5 : 1;
        });

        const totalOTHours = userOt.reduce((sum: number, o: any) => sum + (o.actual_ot_hours || 0), 0);
        const totalOTAmount = userOt.reduce((sum: number, o: any) => sum + (o.ot_amount || 0), 0);

        return {
          ...emp,
          totalWorkDays,
          totalWorkHours,
          totalLateDays,
          totalLateMinutes,
          totalLeaveDays,
          totalWFHDays,
          totalOTHours,
          totalOTAmount,
        };
      });

      setReportData(processedReports);

      // 4. Process Daily Stats (For Trend Chart)
      const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
      const dailyData = daysInMonth.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const dayAttendance = attendanceLogs?.filter((a: any) => a.work_date === dateStr) || [];
        const dayLate = dayAttendance.filter((a: any) => a.is_late).length;
        const dayOt = otRequests?.filter((o: any) => o.request_date === dateStr) || [];
        const dayOtHours = dayOt.reduce((sum: number, o: any) => sum + (o.actual_ot_hours || 0), 0);

        // Count leaves covering this day
        // Need to check range for each leave
        const dayLeave = leaveRequests?.filter(
          (l: any) => l.start_date <= dateStr && l.end_date >= dateStr
        ).length || 0;

        const dayWfh = wfhRequests?.filter((w: any) => w.work_date === dateStr).length || 0;

        return {
          date: format(day, "d MMM", { locale: th }),
          fullDate: dateStr,
          attendance: dayAttendance.length,
          late: dayLate,
          otHours: dayOtHours,
          leave: dayLeave,
          wfh: dayWfh,
        };
      });
      setDailyStats(dailyData);

      // 5. Calculate Branch Stats (For Bar Chart)
      const branchMap = new Map();
      processedReports.forEach((r: any) => {
        const branchName = getBranchName(r.branch_id);
        if (!branchMap.has(branchName)) {
          branchMap.set(branchName, { name: branchName, otHours: 0, lateDays: 0, wfhDays: 0 });
        }
        const b = branchMap.get(branchName);
        b.otHours += r.totalOTHours;
        b.lateDays += r.totalLateDays;
        b.wfhDays += r.totalWFHDays;
      });
      setBranchStats(Array.from(branchMap.values()));

      // 6. Summary
      setSummary({
        totalEmployees: processedReports.length,
        totalWorkDays: processedReports.reduce((sum: number, r: any) => sum + r.totalWorkDays, 0),
        totalWorkHours: processedReports.reduce((sum: number, r: any) => sum + r.totalWorkHours, 0),
        totalLateDays: processedReports.reduce((sum: number, r: any) => sum + r.totalLateDays, 0),
        totalLeaveDays: processedReports.reduce((sum: number, r: any) => sum + r.totalLeaveDays, 0),
        totalWFHDays: processedReports.reduce((sum: number, r: any) => sum + r.totalWFHDays, 0),
        totalOTHours: processedReports.reduce((sum: number, r: any) => sum + r.totalOTHours, 0),
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter data
  const filteredData = reportData.filter((row) => {
    const matchSearch = row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchBranch = selectedBranch === "all" ||
      (selectedBranch === "none" && !row.branch_id) ||
      row.branch_id === selectedBranch;
    const matchRole = selectedRole === "all" || row.role === selectedRole;
    return matchSearch && matchBranch && matchRole;
  });

  const getBranchName = (branchId: string | null) => {
    if (!branchId) return "-";
    return branches.find((b: any) => b.id === branchId)?.name || "-";
  };

  const exportToCSV = () => {
    if (!filteredData.length) return;

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
    const rows = filteredData.map((r) => [
      r.name,
      r.email,
      r.role === "admin" ? "Admin" : r.role === "supervisor" ? "Supervisor" : "Staff",
      getBranchName(r.branch_id),
      r.totalWorkDays,
      r.totalWorkHours.toFixed(1),
      r.totalLateDays,
      r.totalLateMinutes,
      r.totalLeaveDays,
      r.totalWFHDays,
      r.totalOTHours.toFixed(1),
      r.totalOTAmount.toFixed(0),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `report-${format(currentMonth, "yyyy-MM")}.csv`;
    link.click();
  };

  return (
    <AdminLayout title="รายงานสรุป">
      {/* Controls */}
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
          <Button variant="secondary" size="sm" onClick={exportToCSV} disabled={!filteredData.length}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {[
          { label: "พนักงาน", value: summary.totalEmployees, icon: Users, color: "text-[#1d1d1f]", bg: "bg-[#f5f5f7]" },
          { label: "วันทำงาน", value: summary.totalWorkDays, icon: Calendar, color: "text-[#0071e3]", bg: "bg-[#0071e3]/10" },
          { label: "ชั่วโมง", value: summary.totalWorkHours.toFixed(0), icon: Clock, color: "text-[#34c759]", bg: "bg-[#34c759]/10" },
          { label: "มาสาย", value: summary.totalLateDays, icon: AlertTriangle, color: "text-[#ff3b30]", bg: "bg-[#ff3b30]/10" },
          { label: "ลางาน", value: summary.totalLeaveDays, icon: Calendar, color: "text-[#ff9500]", bg: "bg-[#ff9500]/10" },
          { label: "WFH", value: summary.totalWFHDays, icon: Home, color: "text-[#af52de]", bg: "bg-[#af52de]/10" },
          { label: "OT (ชม.)", value: summary.totalOTHours.toFixed(0), icon: TrendingUp, color: "text-[#ff9500]", bg: "bg-[#ff9500]/10" },
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Daily Activity Trend */}
        <Card elevated padding="none" className="p-4">
          <div className="mb-4">
            <h4 className="text-[15px] font-semibold text-[#1d1d1f]">📈 แนวโน้มกิจกรรมรายวัน</h4>
            <p className="text-[12px] text-[#86868b]">เข้างาน, ลา, และ OT ตลอดทั้งเดือน</p>
          </div>
          <div className="h-[250px] w-full text-[11px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyStats}>
                <defs>
                  <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0071e3" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#0071e3" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff9500" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#ff9500" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#86868b" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#86868b" }} />
                <Tooltip
                  contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  itemStyle={{ fontSize: "12px" }}
                />
                <Legend iconType="circle" />
                <Area
                  type="monotone"
                  dataKey="attendance"
                  name="เข้างาน"
                  stroke="#0071e3"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorAttendance)"
                />
                <Area
                  type="monotone"
                  dataKey="otHours"
                  name="OT (ชม.)"
                  stroke="#ff9500"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorOt)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* OT & Late by Branch */}
        <Card elevated padding="none" className="p-4">
          <div className="mb-4">
            <h4 className="text-[15px] font-semibold text-[#1d1d1f]">🏢 สถิติแยกตามสาขา</h4>
            <p className="text-[12px] text-[#86868b]">เปรียบเทียบชั่วโมง OT และจำนวนวันสาย</p>
          </div>
          <div className="h-[250px] w-full text-[11px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#86868b" }} />
                <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{ fill: "#1d1d1f", fontSize: "11px" }} />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="otHours" name="OT (ชม.)" fill="#ff9500" radius={[0, 4, 4, 0]} barSize={20} />
                <Bar dataKey="lateDays" name="สาย (วัน)" fill="#ff3b30" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Top 5 Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Top 5 OT */}
        <Card elevated padding="none">
          <div className="px-4 py-3 border-b border-[#e8e8ed]">
            <h4 className="text-[15px] font-semibold text-[#1d1d1f]">🏆 Top 5 OT</h4>
          </div>
          <div className="divide-y divide-[#e8e8ed]">
            {[...filteredData]
              .sort((a, b) => b.totalOTHours - a.totalOTHours)
              .slice(0, 5)
              .map((row, i) => (
                <div key={row.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[12px] font-bold ${i === 0 ? "bg-[#ff9500] text-white" :
                    i === 1 ? "bg-[#86868b] text-white" :
                      i === 2 ? "bg-[#cd7f32] text-white" : "bg-[#f5f5f7] text-[#6e6e73]"
                    }`}>
                    {i + 1}
                  </span>
                  <Avatar name={row.name} size="sm" />
                  <span className="flex-1 text-[13px] text-[#1d1d1f] truncate">{row.name}</span>
                  <div className="text-right">
                    <span className="text-[14px] font-semibold text-[#ff9500]">{row.totalOTHours.toFixed(1)} ชม.</span>
                    {row.totalOTAmount > 0 && (
                      <p className="text-[10px] text-[#86868b]">฿{row.totalOTAmount.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              ))}
            {filteredData.filter(r => r.totalOTHours > 0).length === 0 && (
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
            {[...filteredData]
              .sort((a, b) => b.totalLateDays - a.totalLateDays)
              .slice(0, 5)
              .filter(r => r.totalLateDays > 0)
              .map((row, i) => (
                <div key={row.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[12px] font-bold ${i === 0 ? "bg-[#ff3b30] text-white" :
                    i === 1 ? "bg-[#ff9500] text-white" :
                      i === 2 ? "bg-[#ffcc00] text-white" : "bg-[#f5f5f7] text-[#6e6e73]"
                    }`}>
                    {i + 1}
                  </span>
                  <Avatar name={row.name} size="sm" />
                  <span className="flex-1 text-[13px] text-[#1d1d1f] truncate">{row.name}</span>
                  <div className="text-right">
                    <span className="text-[14px] font-semibold text-[#ff3b30]">{row.totalLateDays} วัน</span>
                    <p className="text-[10px] text-[#86868b]">{row.totalLateMinutes} นาที</p>
                  </div>
                </div>
              ))}
            {filteredData.filter(r => r.totalLateDays > 0).length === 0 && (
              <div className="text-center py-6 text-[#86868b] text-[13px]">ไม่มีคนมาสาย 🎉</div>
            )}
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card elevated padding="none">
        <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center justify-between">
          <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
            รายงานแต่ละคน
          </h3>
          <Badge variant="default">{filteredData.length} คน</Badge>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-20 text-[#86868b]">ไม่มีข้อมูล</div>
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
                {filteredData.map((row) => (
                  <tr key={row.id} className="hover:bg-[#f5f5f7] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={row.name} size="sm" />
                        <div>
                          <p className="text-[13px] font-medium text-[#1d1d1f]">{row.name}</p>
                          <p className="text-[11px] text-[#86868b]">
                            {row.role === "admin" ? "Admin" : row.role === "supervisor" ? "Supervisor" : "Staff"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <span className="text-[12px] text-[#6e6e73]">{getBranchName(row.branch_id)}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-[13px] font-medium text-[#1d1d1f]">{row.totalWorkDays}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-[13px] font-medium text-[#0071e3]">{row.totalWorkHours.toFixed(1)}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {row.totalLateDays > 0 ? (
                        <span className="text-[13px] font-medium text-[#ff3b30]">
                          {row.totalLateDays} <span className="text-[10px]">({row.totalLateMinutes}น.)</span>
                        </span>
                      ) : (
                        <span className="text-[13px] text-[#86868b]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {row.totalLeaveDays > 0 ? (
                        <span className="text-[13px] font-medium text-[#ff9500]">{row.totalLeaveDays}</span>
                      ) : (
                        <span className="text-[13px] text-[#86868b]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {row.totalWFHDays > 0 ? (
                        <span className="text-[13px] font-medium text-[#af52de]">{row.totalWFHDays}</span>
                      ) : (
                        <span className="text-[13px] text-[#86868b]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {row.totalOTHours > 0 ? (
                        <div>
                          <span className="text-[13px] font-medium text-[#ff9500]">{row.totalOTHours.toFixed(1)} ชม.</span>
                          {row.totalOTAmount > 0 && (
                            <p className="text-[10px] text-[#86868b]">฿{row.totalOTAmount.toLocaleString()}</p>
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
      </Card>
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
