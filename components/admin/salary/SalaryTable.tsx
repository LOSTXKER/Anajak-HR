"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { History } from "lucide-react";
import type { SalaryEmployee } from "@/lib/hooks/use-salary-management";

interface SalaryTableProps {
  employees: SalaryEmployee[];
  onViewHistory: (emp: SalaryEmployee) => void;
}

function formatCurrency(val: number): string {
  return `฿${val.toLocaleString("th-TH", { minimumFractionDigits: 0 })}`;
}

export function SalaryTable({ employees, onViewHistory }: SalaryTableProps) {
  if (employees.length === 0) {
    return (
      <div className="text-center py-12 text-[#86868b]">
        ไม่พบข้อมูลพนักงาน
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#e8e8ed]">
            <th className="text-left py-3 px-4 text-[13px] font-semibold text-[#86868b]">
              พนักงาน
            </th>
            <th className="text-left py-3 px-4 text-[13px] font-semibold text-[#86868b]">
              สาขา
            </th>
            <th className="text-right py-3 px-4 text-[13px] font-semibold text-[#86868b]">
              เงินเดือน
            </th>
            <th className="text-right py-3 px-4 text-[13px] font-semibold text-[#86868b]">
              คอมมิชชั่น
            </th>
            <th className="text-right py-3 px-4 text-[13px] font-semibold text-[#86868b]">
              รวม
            </th>
            <th className="text-center py-3 px-4 text-[13px] font-semibold text-[#86868b]">
              สถานะ
            </th>
            <th className="text-center py-3 px-4 text-[13px] font-semibold text-[#86868b]">
              จัดการ
            </th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => {
            const base = emp.base_salary || 0;
            const comm = emp.commission || 0;
            const total = base + comm;
            const isActive =
              emp.employment_status === "active" || !emp.employment_status;

            return (
              <tr
                key={emp.id}
                className="border-b border-[#f5f5f7] hover:bg-[#f5f5f7]/50 transition-colors"
              >
                <td className="py-3 px-4">
                  <div>
                    <p className="text-[14px] font-medium text-[#1d1d1f]">
                      {emp.name}
                    </p>
                    <p className="text-[12px] text-[#86868b]">{emp.email}</p>
                  </div>
                </td>
                <td className="py-3 px-4 text-[14px] text-[#1d1d1f]">
                  {emp.branch?.name || "-"}
                </td>
                <td className="py-3 px-4 text-right text-[14px] font-medium text-[#34c759]">
                  {formatCurrency(base)}
                </td>
                <td className="py-3 px-4 text-right text-[14px] text-[#0071e3]">
                  {comm > 0 ? formatCurrency(comm) : "-"}
                </td>
                <td className="py-3 px-4 text-right text-[14px] font-bold text-[#1d1d1f]">
                  {formatCurrency(total)}
                </td>
                <td className="py-3 px-4 text-center">
                  <Badge variant={isActive ? "success" : "warning"}>
                    {isActive ? "ทำงาน" : "ลาออก"}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onViewHistory(emp)}
                  >
                    <History className="w-3.5 h-3.5" />
                    ประวัติ
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
