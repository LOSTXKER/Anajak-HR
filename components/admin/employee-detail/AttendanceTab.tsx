"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Clock } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { AttendanceRecord } from "./types";

interface AttendanceTabProps {
  data: AttendanceRecord[];
}

export function AttendanceTab({ data }: AttendanceTabProps) {
  if (data.length === 0) {
    return (
      <Card elevated padding="none">
        <div className="text-center py-16 text-[#86868b]">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>ไม่มีข้อมูลการเข้างานในเดือนนี้</p>
        </div>
      </Card>
    );
  }

  return (
    <Card elevated padding="none">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#e8e8ed] bg-[#f9f9fb]">
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#86868b] uppercase">
                วันที่
              </th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">
                เข้า
              </th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">
                ออก
              </th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">
                ชม.
              </th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">
                สถานะ
              </th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8e8ed]">
            {data.map((att) => (
              <tr key={att.id} className="hover:bg-[#f5f5f7]/50">
                <td className="px-4 py-3 text-sm font-medium text-[#1d1d1f]">
                  {format(new Date(att.work_date), "d MMM yyyy", { locale: th })}
                </td>
                <td className="text-center px-3 py-3 text-sm text-[#1d1d1f]">
                  {att.clock_in_time
                    ? format(new Date(att.clock_in_time), "HH:mm")
                    : "-"}
                </td>
                <td className="text-center px-3 py-3 text-sm text-[#1d1d1f]">
                  {att.clock_out_time
                    ? format(new Date(att.clock_out_time), "HH:mm")
                    : "-"}
                </td>
                <td className="text-center px-3 py-3 text-sm font-semibold text-[#0071e3]">
                  {att.total_hours?.toFixed(1) || "-"}
                </td>
                <td className="text-center px-3 py-3">
                  {att.is_late ? (
                    <Badge variant="warning">สาย {att.late_minutes}น.</Badge>
                  ) : att.status === "holiday" ? (
                    <Badge variant="info">วันหยุด</Badge>
                  ) : (
                    <Badge variant="success">ปกติ</Badge>
                  )}
                  {att.auto_checkout && (
                    <span className="ml-1 text-[10px] text-[#0071e3]">Auto</span>
                  )}
                </td>
                <td className="text-right px-4 py-3">
                  <Link
                    href={`/admin/attendance/edit/${att.id}`}
                    className="text-xs text-[#0071e3] hover:underline"
                  >
                    แก้ไข
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
