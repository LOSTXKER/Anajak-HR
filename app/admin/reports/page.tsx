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
  Building2,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { th } from "date-fns/locale";

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

      // ดึงพนักงานที่ไม่ได้ exclude
      const { data: employees } = await supabase
        .from("employees")
        .select("id, name, email, role, branch_id")
        .eq("account_status", "approved")
        .neq("exclude_from_payroll", true);

      if (!employees) {
        setReportData([]);
        return;
      }

      const reportPromises = employees.map(async (emp: any) => {
        // Attendance
        const { data: attendance } = await supabase
          .from("attendance_logs")
          .select("*")
          .eq("employee_id", emp.id)
          .gte("work_date", startStr)
          .lte("work_date", endStr);

        // OT (completed)
        const { data: otLogs } = await supabase
          .from("ot_requests")
          .select("*")
          .eq("employee_id", emp.id)
          .not("actual_end_time", "is", null)
          .gte("request_date", startStr)
          .lte("request_date", endStr);

        // Leave (approved)
        const { data: leaves } = await supabase
          .from("leave_requests")
          .select("*")
          .eq("employee_id", emp.id)
          .eq("status", "approved")
          .gte("start_date", startStr)
          .lte("end_date", endStr);

        // WFH (approved)
        const { data: wfhLogs } = await supabase
          .from("wfh_requests")
          .select("*")
          .eq("employee_id", emp.id)
          .eq("status", "approved")
          .gte("work_date", startStr)
          .lte("work_date", endStr);

        // Calculate
        const totalWorkDays = attendance?.filter(a => a.status !== "holiday").length || 0;
        const totalWorkHours = attendance?.reduce((sum: number, a: any) => sum + (a.total_hours || 0), 0) || 0;
        const totalLateDays = attendance?.filter((a: any) => a.is_late).length || 0;

        let totalLateMinutes = 0;
        attendance?.forEach((a: any) => {
          if (a.is_late && a.clock_in_time && a.late_minutes) {
            totalLateMinutes += a.late_minutes;
          }
        });

        // Calculate leave days
        let totalLeaveDays = 0;
        leaves?.forEach((l: any) => {
          if (l.is_half_day) {
            totalLeaveDays += 0.5;
          } else {
            const start = new Date(l.start_date);
            const end = new Date(l.end_date);
            totalLeaveDays += Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          }
        });

        // WFH days
        let totalWFHDays = 0;
        wfhLogs?.forEach((w: any) => {
          totalWFHDays += w.is_half_day ? 0.5 : 1;
        });

        // OT
        const totalOTHours = otLogs?.reduce((sum: number, ot: any) => sum + (ot.actual_ot_hours || 0), 0) || 0;
        const totalOTAmount = otLogs?.reduce((sum: number, ot: any) => sum + (ot.ot_amount || 0), 0) || 0;

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

      const reports = await Promise.all(reportPromises);
      setReportData(reports);

      // Summary
      setSummary({
        totalEmployees: reports.length,
        totalWorkDays: reports.reduce((sum, r) => sum + r.totalWorkDays, 0),
        totalWorkHours: reports.reduce((sum, r) => sum + r.totalWorkHours, 0),
        totalLateDays: reports.reduce((sum, r) => sum + r.totalLateDays, 0),
        totalLeaveDays: reports.reduce((sum, r) => sum + r.totalLeaveDays, 0),
        totalWFHDays: reports.reduce((sum, r) => sum + r.totalWFHDays, 0),
        totalOTHours: reports.reduce((sum, r) => sum + r.totalOTHours, 0),
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
    return branches.find(b => b.id === branchId)?.name || "-";
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
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-[#d2d2d7] focus:border-[#0071e3] outline-none text-[15px] min-w-[150px]"
          >
            <option value="all">ทุกสาขา</option>
            <option value="none">ไม่มีสาขา</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-[#d2d2d7] focus:border-[#0071e3] outline-none text-[15px] min-w-[130px]"
          >
            <option value="all">ทุกตำแหน่ง</option>
            <option value="staff">พนักงาน</option>
            <option value="supervisor">หัวหน้างาน</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mb-6">
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
