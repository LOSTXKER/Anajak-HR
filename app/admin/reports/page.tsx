"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { th } from "date-fns/locale";

function ReportsContent() {
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [reportData, setReportData] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    totalWorkHours: 0,
    totalOTHours: 0,
    totalLateDays: 0,
  });

  useEffect(() => {
    fetchReportData();
  }, [currentMonth]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const startDate = startOfMonth(currentMonth);
      const endDate = endOfMonth(currentMonth);

      // ดึงเฉพาะพนักงานที่ไม่ใช่ admin
      const { data: employees } = await supabase
        .from("employees")
        .select("id, name, email, role")
        .neq("role", "admin");

      if (!employees) return;

      const reportPromises = employees.map(async (emp: any) => {
        const { data: attendance } = await supabase
          .from("attendance_logs")
          .select("*")
          .eq("employee_id", emp.id)
          .gte("work_date", format(startDate, "yyyy-MM-dd"))
          .lte("work_date", format(endDate, "yyyy-MM-dd"));

        const { data: otLogs } = await supabase
          .from("ot_requests")
          .select("*")
          .eq("employee_id", emp.id)
          .eq("status", "completed")
          .gte("request_date", format(startDate, "yyyy-MM-dd"))
          .lte("request_date", format(endDate, "yyyy-MM-dd"));

        return {
          ...emp,
          totalWorkDays: attendance?.length || 0,
          totalWorkHours: attendance?.reduce((sum: number, a: any) => sum + (a.total_hours || 0), 0) || 0,
          totalLateDays: attendance?.filter((a: any) => a.is_late).length || 0,
          totalOTHours: otLogs?.reduce((sum: number, ot: any) => sum + (ot.actual_ot_hours || 0), 0) || 0,
        };
      });

      const reports = await Promise.all(reportPromises);
      setReportData(reports);

      setSummary({
        totalEmployees: employees.length,
        totalWorkHours: reports.reduce((sum: number, r: any) => sum + r.totalWorkHours, 0),
        totalOTHours: reports.reduce((sum: number, r: any) => sum + r.totalOTHours, 0),
        totalLateDays: reports.reduce((sum: number, r: any) => sum + r.totalLateDays, 0),
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData.length) return;

    const headers = ["ชื่อ", "อีเมล", "ตำแหน่ง", "วันทำงาน", "ชั่วโมง", "สาย", "OT"];
    const rows = reportData.map((r) => [
      r.name,
      r.email,
      r.role === "admin" ? "Admin" : r.role === "supervisor" ? "Supervisor" : "Staff",
      r.totalWorkDays,
      r.totalWorkHours.toFixed(1),
      r.totalLateDays,
      r.totalOTHours.toFixed(1),
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
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
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
        <Button variant="secondary" size="sm" onClick={exportToCSV} disabled={!reportData.length}>
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "พนักงาน", value: summary.totalEmployees },
          { label: "ชั่วโมงทำงาน", value: summary.totalWorkHours.toFixed(0), color: "text-[#0071e3]" },
          { label: "ชั่วโมง OT", value: summary.totalOTHours.toFixed(0), color: "text-[#ff9500]" },
          { label: "มาสายรวม", value: summary.totalLateDays, color: "text-[#ff3b30]" },
        ].map((stat, i) => (
          <Card key={i} elevated>
            <div className="text-center py-2">
              <p className={`text-[28px] font-semibold ${stat.color || "text-[#1d1d1f]"}`}>
                {stat.value}
              </p>
              <p className="text-[13px] text-[#86868b]">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card elevated padding="none">
        <div className="px-6 py-4 border-b border-[#e8e8ed]">
          <h3 className="text-[17px] font-semibold text-[#1d1d1f]">รายงานแต่ละคน</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reportData.length === 0 ? (
          <div className="text-center py-20 text-[#86868b]">ไม่มีข้อมูล</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e8e8ed]">
                  <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">
                    พนักงาน
                  </th>
                  <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase hidden md:table-cell">
                    ตำแหน่ง
                  </th>
                  <th className="text-center px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">
                    วันทำงาน
                  </th>
                  <th className="text-center px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">
                    ชั่วโมง
                  </th>
                  <th className="text-center px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">
                    สาย
                  </th>
                  <th className="text-center px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">
                    OT
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e8ed]">
                {reportData.map((row) => (
                  <tr key={row.id} className="hover:bg-[#f5f5f7] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={row.name} size="sm" />
                        <div>
                          <p className="text-[14px] font-medium text-[#1d1d1f]">{row.name}</p>
                          <p className="text-[12px] text-[#86868b] hidden md:block">{row.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <Badge
                        variant={
                          row.role === "admin"
                            ? "info"
                            : row.role === "supervisor"
                            ? "info"
                            : "default"
                        }
                      >
                        {row.role === "admin"
                          ? "Admin"
                          : row.role === "supervisor"
                          ? "Supervisor"
                          : "Staff"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center text-[14px] text-[#1d1d1f]">
                      {row.totalWorkDays}
                    </td>
                    <td className="px-6 py-4 text-center text-[14px] font-medium text-[#0071e3]">
                      {row.totalWorkHours.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.totalLateDays > 0 ? (
                        <span className="text-[14px] font-medium text-[#ff9500]">
                          {row.totalLateDays}
                        </span>
                      ) : (
                        <span className="text-[14px] text-[#86868b]">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.totalOTHours > 0 ? (
                        <span className="text-[14px] font-medium text-[#ff9500]">
                          {row.totalOTHours.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-[14px] text-[#86868b]">-</span>
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
