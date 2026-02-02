"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
  LeaveRecord,
  LeaveBalance,
  Employee,
  getLeaveTypeLabel,
  getStatusBadgeVariant,
  getStatusLabel,
} from "./types";

interface LeaveTabProps {
  data: LeaveRecord[];
  employee: Employee;
  leaveBalance: LeaveBalance;
  onDelete: (id: string, name: string) => void;
}

export function LeaveTab({
  data,
  employee,
  leaveBalance,
  onDelete,
}: LeaveTabProps) {
  const quotaCards = [
    {
      type: "ลาป่วย",
      quota: employee.sick_leave_quota || 0,
      used: leaveBalance.sick_used,
      color: "text-[#ff3b30]",
      bg: "bg-[#ff3b30]/10",
    },
    {
      type: "ลากิจ",
      quota: employee.personal_leave_quota || 0,
      used: leaveBalance.personal_used,
      color: "text-[#ff9500]",
      bg: "bg-[#ff9500]/10",
    },
    {
      type: "ลาพักร้อน",
      quota: employee.annual_leave_quota || 0,
      used: leaveBalance.annual_used,
      color: "text-[#0071e3]",
      bg: "bg-[#0071e3]/10",
    },
  ];

  return (
    <>
      {/* Leave Quota Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {quotaCards.map((q, i) => {
          const remaining = q.quota - q.used;
          return (
            <Card key={i} elevated className="!p-4">
              <div className={`text-xs font-medium ${q.color} mb-1`}>
                {q.type}
              </div>
              <div className="text-2xl font-bold text-[#1d1d1f]">
                {remaining}
              </div>
              <div className="text-xs text-[#86868b]">
                คงเหลือ{" "}
                <span className="text-[#1d1d1f]">
                  ({q.used}/{q.quota} วัน)
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      <Card elevated padding="none">
        {data.length === 0 ? (
          <div className="text-center py-16 text-[#86868b]">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>ไม่มีข้อมูลการลาในเดือนนี้</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e8e8ed] bg-[#f9f9fb]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#86868b] uppercase">
                    วันที่
                  </th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">
                    ประเภท
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">
                    เหตุผล
                  </th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">
                    สถานะ
                  </th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e8ed]">
                {data.map((leave) => (
                  <tr key={leave.id} className="hover:bg-[#f5f5f7]/50">
                    <td className="px-4 py-3 text-sm font-medium text-[#1d1d1f]">
                      {format(new Date(leave.start_date), "d MMM", {
                        locale: th,
                      })}
                      {leave.start_date !== leave.end_date && (
                        <>
                          {" "}
                          -{" "}
                          {format(new Date(leave.end_date), "d MMM", {
                            locale: th,
                          })}
                        </>
                      )}
                      {leave.is_half_day && (
                        <span className="text-xs text-[#86868b]">
                          {" "}
                          (ครึ่งวัน)
                        </span>
                      )}
                    </td>
                    <td className="text-center px-3 py-3">
                      <Badge variant="info">
                        {getLeaveTypeLabel(leave.leave_type)}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-sm text-[#86868b] max-w-[200px] truncate">
                      {leave.reason || "-"}
                    </td>
                    <td className="text-center px-3 py-3">
                      <Badge variant={getStatusBadgeVariant(leave.status)}>
                        {getStatusLabel(leave.status)}
                      </Badge>
                    </td>
                    <td className="text-right px-4 py-3">
                      {leave.status === "pending" && (
                        <button
                          onClick={() =>
                            onDelete(
                              leave.id,
                              `ลา ${getLeaveTypeLabel(leave.leave_type)}`
                            )
                          }
                          className="text-xs text-[#ff3b30] hover:underline"
                        >
                          ยกเลิก
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
