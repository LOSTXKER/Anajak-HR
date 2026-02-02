"use client";

import Link from "next/link";
import { Timer, Calendar } from "lucide-react";

interface MonthlyOT {
  hours: number;
  amount: number;
}

interface LeaveBalance {
  annual_remaining: number;
  sick_remaining: number;
  personal_remaining: number;
}

interface Employee {
  annual_leave_quota?: number | null;
  sick_leave_quota?: number | null;
  personal_leave_quota?: number | null;
  [key: string]: any;
}

interface MonthlySummaryCardsProps {
  monthlyOT: MonthlyOT;
  leaveBalance: LeaveBalance | null | undefined;
  employee: Employee | null | undefined;
}

export function MonthlySummaryCards({
  monthlyOT,
  leaveBalance,
  employee,
}: MonthlySummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {/* OT Summary Card */}
      <Link href="/my-profile?tab=ot">
        <div className="bg-white border border-[#e8e8ed] rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-[#ff9500]/30 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <Timer className="w-4 h-4 text-[#ff9500]" />
            <span className="text-[12px] font-medium text-[#86868b]">
              OT เดือนนี้
            </span>
          </div>
          <p className="text-2xl font-bold text-[#1d1d1f]">
            {monthlyOT.hours.toFixed(1)}{" "}
            <span className="text-sm font-normal text-[#86868b]">ชม.</span>
          </p>
          <p className="text-[13px] text-[#ff9500] font-medium mt-1">
            ฿{monthlyOT.amount.toLocaleString()}
          </p>
        </div>
      </Link>

      {/* Leave Quota Card */}
      <Link href="/my-profile?tab=leave">
        <div className="bg-white border border-[#e8e8ed] rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-[#34c759]/30 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-[#34c759]" />
            <span className="text-[12px] font-medium text-[#86868b]">
              วันลาคงเหลือ
            </span>
          </div>
          {leaveBalance ? (
            <>
              <p className="text-2xl font-bold text-[#1d1d1f]">
                {leaveBalance.annual_remaining}{" "}
                <span className="text-sm font-normal text-[#86868b]">
                  พักร้อน
                </span>
              </p>
              <p className="text-[13px] text-[#34c759] font-medium mt-1">
                ป่วย {leaveBalance.sick_remaining} • กิจ{" "}
                {leaveBalance.personal_remaining}
              </p>
            </>
          ) : employee ? (
            <>
              <p className="text-2xl font-bold text-[#1d1d1f]">
                {employee.annual_leave_quota || 10}{" "}
                <span className="text-sm font-normal text-[#86868b]">
                  พักร้อน
                </span>
              </p>
              <p className="text-[13px] text-[#34c759] font-medium mt-1">
                ป่วย {employee.sick_leave_quota || 30} • กิจ{" "}
                {employee.personal_leave_quota || 3}
              </p>
            </>
          ) : (
            <p className="text-lg font-medium text-[#86868b]">-</p>
          )}
        </div>
      </Link>
    </div>
  );
}
