"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Tooltip } from "@/components/ui/Tooltip";
import { HelpCircle } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { formatCurrency, PayrollData, PayrollSummary, PayrollSettings, Employee } from "./types";

interface PayrollTableProps {
  data: PayrollData[];
  summary: PayrollSummary;
  currentMonth: Date;
  settings: PayrollSettings;
  loading: boolean;
  onOTClick: (employee: Employee) => void;
}

function ColumnHeader({
  label,
  tooltip,
  align = "center",
}: {
  label: string;
  tooltip: string;
  align?: "left" | "center" | "right";
}) {
  return (
    <th
      className={`text-${align} px-3 py-3 text-[11px] font-semibold text-[#86868b] uppercase ${
        align === "left" ? "px-4" : ""
      }`}
    >
      <div
        className={`flex items-center gap-1 ${
          align === "right"
            ? "justify-end"
            : align === "center"
              ? "justify-center"
              : ""
        }`}
      >
        <span>{label}</span>
        <Tooltip content={tooltip} position="bottom">
          <HelpCircle className="w-3.5 h-3.5 text-[#86868b] cursor-help hover:text-[#0071e3] transition-colors" />
        </Tooltip>
      </div>
    </th>
  );
}

export function PayrollTable({
  data,
  summary,
  currentMonth,
  settings,
  loading,
  onOTClick,
}: PayrollTableProps) {
  return (
    <Card elevated padding="none">
      <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center justify-between">
        <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
          รายละเอียดเงินเดือน
        </h3>
        <Badge variant="info">
          {format(currentMonth, "MMMM yyyy", { locale: th })}
        </Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-20 text-[#86868b]">ไม่มีข้อมูล</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e8e8ed] bg-[#f5f5f7]">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#86868b] uppercase">
                  พนักงาน
                </th>
                <ColumnHeader
                  label="เงินเดือนตั้ง"
                  tooltip="ฐานเงินเดือนที่กำหนดให้พนักงาน (ตั้งค่าได้ในหน้าจัดการพนักงาน)"
                  align="right"
                />
                <ColumnHeader
                  label="วันทำงาน"
                  tooltip="จำนวนวันที่มาทำงานจริงในเดือนนี้ (ไม่รวมวันหยุด)"
                  align="center"
                />
                <ColumnHeader
                  label="ลา"
                  tooltip="จำนวนวันลาที่ได้รับอนุมัติในเดือนนี้"
                  align="center"
                />
                <ColumnHeader
                  label="สาย"
                  tooltip={`จำนวนวันที่มาสาย และนาทีสายรวม (หลัง ${settings.work_start_time} น.)`}
                  align="center"
                />
                <ColumnHeader
                  label="เงินเดือน"
                  tooltip="เงินเดือนเต็มจำนวนทุกเดือน (ไม่ขึ้นกับวันทำงาน)"
                  align="right"
                />
                <ColumnHeader
                  label="คอมมิชชั่น"
                  tooltip="ค่าคอมมิชชั่นประจำเดือน (ตั้งค่าได้ในหน้าจัดการพนักงาน)"
                  align="right"
                />
                <ColumnHeader
                  label="OT รวม"
                  tooltip="รวมค่า OT ทุกอัตราที่ทำในเดือนนี้"
                  align="right"
                />
                <ColumnHeader
                  label="หักสาย"
                  tooltip={`นาทีสาย × ${settings.late_deduction_per_minute} บาท/นาที`}
                  align="right"
                />
                <ColumnHeader
                  label="รวม"
                  tooltip="เงินเดือน + คอมมิชชั่น + เงิน OT - หักสาย"
                  align="right"
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8e8ed]">
              {data.map((row) => (
                <tr
                  key={row.employee.id}
                  className="hover:bg-[#f5f5f7] transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={row.employee.name} size="sm" />
                      <div>
                        <p className="text-[13px] font-medium text-[#1d1d1f]">
                          {row.employee.name}
                        </p>
                        <p className="text-[11px] text-[#86868b]">
                          {row.employee.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-[13px] text-[#86868b]">
                      ฿{formatCurrency(row.employee.base_salary)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-[13px] text-[#1d1d1f]">
                      {row.workDays}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {row.leaveDays > 0 ? (
                      <span className="text-[13px] text-[#ff9500]">
                        {row.leaveDays}
                      </span>
                    ) : (
                      <span className="text-[13px] text-[#86868b]">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {row.lateDays > 0 ? (
                      <span className="text-[13px] text-[#ff3b30]">
                        {row.lateDays} ({row.lateMinutes}น.)
                      </span>
                    ) : (
                      <span className="text-[13px] text-[#86868b]">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-[13px] text-[#1d1d1f]">
                      ฿{formatCurrency(row.basePay)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    {row.commission > 0 ? (
                      <span className="text-[13px] font-medium text-[#af52de]">
                        +฿{formatCurrency(row.commission)}
                      </span>
                    ) : (
                      <span className="text-[13px] text-[#86868b]">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {row.otTotalAmount > 0 ? (
                      <button
                        onClick={() => onOTClick(row.employee)}
                        className="text-[13px] font-medium text-[#ff9500] hover:underline"
                      >
                        +฿{formatCurrency(row.otTotalAmount)}
                      </button>
                    ) : (
                      <span className="text-[13px] text-[#86868b]">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {row.latePenalty > 0 ? (
                      <span className="text-[13px] font-medium text-[#ff3b30]">
                        -฿{formatCurrency(row.latePenalty)}
                      </span>
                    ) : (
                      <span className="text-[13px] text-[#86868b]">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-[14px] font-semibold text-[#34c759]">
                      ฿{formatCurrency(row.totalPay)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#f5f5f7] border-t-2 border-[#d2d2d7]">
                <td
                  colSpan={5}
                  className="px-4 py-3 text-[13px] font-semibold text-[#1d1d1f]"
                >
                  รวมทั้งหมด ({summary.totalEmployees} คน)
                </td>
                <td className="px-3 py-3 text-right text-[13px] font-semibold text-[#1d1d1f]">
                  ฿{formatCurrency(summary.totalBasePay)}
                </td>
                <td className="px-3 py-3 text-right text-[13px] font-semibold text-[#af52de]">
                  +฿{formatCurrency(summary.totalCommission)}
                </td>
                <td className="px-3 py-3 text-right text-[13px] font-semibold text-[#ff9500]">
                  +฿{formatCurrency(summary.totalOTPay)}
                </td>
                <td className="px-3 py-3 text-right text-[13px] font-semibold text-[#ff3b30]">
                  -฿{formatCurrency(summary.totalLatePenalty)}
                </td>
                <td className="px-4 py-3 text-right text-[15px] font-bold text-[#34c759]">
                  ฿{formatCurrency(summary.totalPay)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  );
}
