"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Users } from "lucide-react";
import { EmployeeReport, ReportSummary, getRoleLabel } from "./types";

interface EmployeeReportTableProps {
  data: EmployeeReport[];
  summary: ReportSummary;
  loading: boolean;
}

export function EmployeeReportTable({
  data,
  summary,
  loading,
}: EmployeeReportTableProps) {
  return (
    <Card elevated padding="none">
      <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center justify-between">
        <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
          รายงานพนักงาน
        </h3>
        <Badge variant="default">{data.length} คน</Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-20 text-[#86868b]">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>ไม่มีข้อมูลพนักงาน</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e8e8ed] bg-[#f5f5f7]">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#86868b] uppercase">
                  พนักงาน
                </th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold text-[#86868b] uppercase hidden md:table-cell">
                  สาขา
                </th>
                <th className="text-center px-3 py-3 text-[11px] font-semibold text-[#86868b] uppercase">
                  วันทำงาน
                </th>
                <th className="text-center px-3 py-3 text-[11px] font-semibold text-[#86868b] uppercase">
                  ชั่วโมง
                </th>
                <th className="text-center px-3 py-3 text-[11px] font-semibold text-[#86868b] uppercase">
                  สาย
                </th>
                <th className="text-center px-3 py-3 text-[11px] font-semibold text-[#86868b] uppercase">
                  ลา
                </th>
                <th className="text-center px-3 py-3 text-[11px] font-semibold text-[#86868b] uppercase">
                  WFH
                </th>
                <th className="text-center px-3 py-3 text-[11px] font-semibold text-[#86868b] uppercase">
                  OT
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8e8ed]">
              {data.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-[#f5f5f7]/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={row.name} size="sm" />
                      <div>
                        <p className="text-[13px] font-medium text-[#1d1d1f]">
                          {row.name}
                        </p>
                        <p className="text-[11px] text-[#86868b]">
                          {getRoleLabel(row.role)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    <span className="text-[12px] text-[#6e6e73]">
                      {row.branchName}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-[13px] font-medium text-[#1d1d1f]">
                      {row.workDays}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-[13px] font-medium text-[#0071e3]">
                      {row.workHours.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {row.lateDays > 0 ? (
                      <span className="text-[13px] font-medium text-[#ff3b30]">
                        {row.lateDays}{" "}
                        <span className="text-[10px]">({row.lateMinutes}น.)</span>
                      </span>
                    ) : (
                      <span className="text-[13px] text-[#34c759]">✓</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {row.leaveDays > 0 ? (
                      <span className="text-[13px] font-medium text-[#ff9500]">
                        {row.leaveDays}
                      </span>
                    ) : (
                      <span className="text-[13px] text-[#86868b]">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {row.wfhDays > 0 ? (
                      <span className="text-[13px] font-medium text-[#af52de]">
                        {row.wfhDays}
                      </span>
                    ) : (
                      <span className="text-[13px] text-[#86868b]">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {row.otHours > 0 ? (
                      <div>
                        <span className="text-[13px] font-medium text-[#ff9500]">
                          {row.otHours.toFixed(1)} ชม.
                        </span>
                        {row.otAmount > 0 && (
                          <p className="text-[10px] text-[#86868b]">
                            ฿{row.otAmount.toLocaleString()}
                          </p>
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
      {data.length > 0 && (
        <div className="px-6 py-4 border-t border-[#e8e8ed] bg-[#f5f5f7]/50">
          <div className="flex flex-wrap gap-6 text-[12px]">
            <div>
              <span className="text-[#86868b]">รวมชั่วโมงทำงาน:</span>
              <span className="ml-2 font-semibold text-[#1d1d1f]">
                {summary.totalWorkHours.toFixed(1)} ชม.
              </span>
            </div>
            <div>
              <span className="text-[#86868b]">รวม OT:</span>
              <span className="ml-2 font-semibold text-[#ff9500]">
                {summary.totalOTHours.toFixed(1)} ชม.
              </span>
              {summary.totalOTAmount > 0 && (
                <span className="ml-1 text-[#86868b]">
                  (฿{summary.totalOTAmount.toLocaleString()})
                </span>
              )}
            </div>
            <div>
              <span className="text-[#86868b]">รวมสาย:</span>
              <span className="ml-2 font-semibold text-[#ff3b30]">
                {summary.totalLateDays} วัน
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
