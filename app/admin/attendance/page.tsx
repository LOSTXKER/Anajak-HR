"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, ChevronRight, Download, Clock, X, Camera, Image } from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { th } from "date-fns/locale";

function AttendanceContent() {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

  useEffect(() => {
    fetchAttendance();
  }, [currentMonth]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      // ดึงข้อมูลเฉพาะพนักงานที่ไม่ใช่ admin
      const { data } = await supabase
        .from("attendance_logs")
        .select(`*, employee:employees!employee_id (name, email, role)`)
        .gte("work_date", startDate)
        .lte("work_date", endDate)
        .order("work_date", { ascending: false });

      setAttendance(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
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

  const stats = {
    total: attendance.length,
    normal: attendance.filter((a) => a.clock_in_time && !a.is_late).length,
    late: attendance.filter((a) => a.is_late).length,
    hours: attendance.reduce((sum, a) => sum + (a.total_hours || 0), 0),
  };

  return (
    <AdminLayout title="ข้อมูลการเข้างาน">
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
        <Button variant="secondary" size="sm" onClick={exportCSV}>
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "รายการ", value: stats.total },
          { label: "ปกติ", value: stats.normal, color: "text-[#34c759]" },
          { label: "มาสาย", value: stats.late, color: "text-[#ff9500]" },
          { label: "ชั่วโมงรวม", value: stats.hours.toFixed(0), color: "text-[#0071e3]" },
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
        {loading ? (
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
                  <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">
                    วันที่
                  </th>
                  <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">
                    พนักงาน
                  </th>
                  <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">
                    เข้างาน
                  </th>
                  <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">
                    ออกงาน
                  </th>
                  <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">
                    ชั่วโมง
                  </th>
                  <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">
                    สถานะ
                  </th>
                  <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase">
                    รูปภาพ
                  </th>
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
                        <span className="text-[14px] text-[#1d1d1f]">
                          {log.employee?.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-[14px] text-[#6e6e73]">
                        <Clock className="w-4 h-4" />
                        {log.clock_in_time
                          ? format(new Date(log.clock_in_time), "HH:mm")
                          : "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-[14px] text-[#6e6e73]">
                        <Clock className="w-4 h-4" />
                        {log.clock_out_time
                          ? format(new Date(log.clock_out_time), "HH:mm")
                          : "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[14px] font-medium text-[#1d1d1f]">
                        {log.total_hours?.toFixed(1) || "0"} ชม.
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={log.is_late ? "warning" : "success"}>
                        {log.is_late ? "สาย" : "ปกติ"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {log.clock_in_photo_url && (
                          <button
                            onClick={() => setViewingPhoto(log.clock_in_photo_url)}
                            className="flex items-center gap-1 px-2 py-1 text-[12px] text-[#0071e3] bg-[#0071e3]/10 rounded-lg hover:bg-[#0071e3]/20 transition-colors"
                            title="รูปเช็คอิน"
                          >
                            <Camera className="w-3 h-3" />
                            เข้า
                          </button>
                        )}
                        {log.clock_out_photo_url && (
                          <button
                            onClick={() => setViewingPhoto(log.clock_out_photo_url)}
                            className="flex items-center gap-1 px-2 py-1 text-[12px] text-[#34c759] bg-[#34c759]/10 rounded-lg hover:bg-[#34c759]/20 transition-colors"
                            title="รูปเช็คเอาท์"
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
          <img
            src={viewingPhoto}
            alt=""
            className="max-w-full max-h-[90vh] rounded-2xl"
          />
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
