"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Camera, Edit, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import type { AttendanceRow, Branch, DateMode } from "./types";

interface AttendanceTableProps {
  rows: AttendanceRow[];
  branches: Branch[];
  dateMode: DateMode;
  loading: boolean;
  onPhotoClick: (url: string, type: string) => void;
}

export function AttendanceTable({
  rows,
  branches,
  dateMode,
  loading,
  onPhotoClick,
}: AttendanceTableProps) {
  const getStatusBadge = (row: AttendanceRow) => {
    if (row.status === "holiday_ot") {
      return <Badge variant="warning">OT วันหยุด</Badge>;
    }
    if (row.status === "pending") {
      return <Badge variant="default">รอเข้างาน</Badge>;
    }
    if (row.leaveType) {
      const leaveLabels: Record<string, string> = {
        sick: "ลาป่วย",
        personal: "ลากิจ",
        annual: "ลาพักร้อน",
      };
      return (
        <Badge variant="info">{leaveLabels[row.leaveType] || "ลา"}</Badge>
      );
    }
    if (row.isWFH) return <Badge variant="default">WFH</Badge>;
    if (row.status === "absent") return <Badge variant="danger">ขาด</Badge>;
    if (row.isLate) {
      if (row.lateRequestStatus === "approved") {
        return <Badge variant="warning">สาย (อนุมัติ)</Badge>;
      }
      return <Badge variant="warning">สาย {row.lateMinutes}น.</Badge>;
    }
    if (row.status === "present") return <Badge variant="success">ปกติ</Badge>;
    return <Badge variant="default">{row.status}</Badge>;
  };

  const colSpan = dateMode === "range" ? 9 : 8;

  return (
    <Card elevated className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#e8e8ed] bg-[#f5f5f7]">
              {dateMode === "range" && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#86868b]">
                  วันที่
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#86868b]">
                พนักงาน
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-[#86868b]">
                เข้างาน
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-[#86868b]">
                ออกงาน
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-[#86868b]">
                ชม.ทำงาน
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-[#86868b]">
                สถานะ
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-[#86868b]">
                OT
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-[#86868b]">
                รูป
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-[#86868b]">
                จัดการ
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-[#86868b]">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    กำลังโหลด...
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-12 text-center text-[#86868b]"
                >
                  ไม่พบข้อมูล
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[#e8e8ed] hover:bg-[#f5f5f7]/50"
                >
                  {dateMode === "range" && (
                    <td className="px-4 py-3 text-sm text-[#1d1d1f]">
                      {format(new Date(row.workDate), "d MMM", { locale: th })}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/employees/${row.employee.id}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <Avatar name={row.employee.name} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-[#1d1d1f]">
                          {row.employee.name}
                        </p>
                        {row.employee.branch_id && (
                          <p className="text-xs text-[#86868b]">
                            {
                              branches.find(
                                (b) => b.id === row.employee.branch_id
                              )?.name
                            }
                          </p>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-[#1d1d1f]">
                    {row.clockIn
                      ? format(new Date(row.clockIn), "HH:mm")
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-[#1d1d1f]">
                    {row.clockOut ? (
                      <span className={row.autoCheckout ? "text-[#ff9500]" : ""}>
                        {format(new Date(row.clockOut), "HH:mm")}
                        {row.autoCheckout && " (auto)"}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-medium text-[#0071e3]">
                    {row.workHours ? row.workHours.toFixed(1) : "-"}
                  </td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(row)}</td>
                  <td className="px-4 py-3 text-center">
                    {row.otCount > 0 ? (
                      <div className="text-xs">
                        <p className="font-medium text-[#ff9500]">
                          {row.otHours.toFixed(1)} ชม.
                        </p>
                        <p className="text-[#86868b]">
                          ฿{row.otAmount.toLocaleString()}
                        </p>
                      </div>
                    ) : (
                      <span className="text-[#86868b]">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {row.clockInPhotoUrl && (
                        <button
                          onClick={() =>
                            onPhotoClick(row.clockInPhotoUrl!, "เข้างาน")
                          }
                          className="p-1.5 text-[#0071e3] hover:bg-[#0071e3]/10 rounded-lg"
                          title="รูปเข้างาน"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      )}
                      {row.clockOutPhotoUrl && (
                        <button
                          onClick={() =>
                            onPhotoClick(row.clockOutPhotoUrl!, "ออกงาน")
                          }
                          className="p-1.5 text-[#34c759] hover:bg-[#34c759]/10 rounded-lg"
                          title="รูปออกงาน"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      )}
                      {!row.clockInPhotoUrl && !row.clockOutPhotoUrl && (
                        <span className="text-[#86868b]">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.clockIn ? (
                      <Link href={`/admin/attendance/edit/${row.id}`}>
                        <button
                          className="p-1.5 text-[#0071e3] hover:bg-[#0071e3]/10 rounded-lg transition-colors"
                          title="แก้ไขเวลา"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </Link>
                    ) : (
                      <span className="text-[#86868b]">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
