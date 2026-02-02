"use client";

import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { AlertTriangle } from "lucide-react";
import { EmployeeReport } from "./types";

interface TopOTListProps {
  data: EmployeeReport[];
}

export function TopOTList({ data }: TopOTListProps) {
  const topOT = [...data]
    .sort((a, b) => b.otHours - a.otHours)
    .slice(0, 5)
    .filter((r) => r.otHours > 0);

  return (
    <Card elevated padding="none">
      <div className="px-4 py-3 border-b border-[#e8e8ed]">
        <h4 className="text-[15px] font-semibold text-[#1d1d1f]">🏆 Top 5 OT</h4>
      </div>
      <div className="divide-y divide-[#e8e8ed]">
        {topOT.map((row, i) => (
          <div key={row.id} className="flex items-center gap-3 px-4 py-2.5">
            <span
              className={`w-6 h-6 flex items-center justify-center rounded-full text-[12px] font-bold ${
                i === 0
                  ? "bg-[#ffd700] text-[#1d1d1f]"
                  : i === 1
                    ? "bg-[#c0c0c0] text-[#1d1d1f]"
                    : i === 2
                      ? "bg-[#cd7f32] text-white"
                      : "bg-[#f5f5f7] text-[#6e6e73]"
              }`}
            >
              {i + 1}
            </span>
            <Avatar name={row.name} size="sm" />
            <span className="flex-1 text-[13px] text-[#1d1d1f] truncate">
              {row.name}
            </span>
            <div className="text-right">
              <span className="text-[14px] font-semibold text-[#ff9500]">
                {row.otHours.toFixed(1)} ชม.
              </span>
              {row.otAmount > 0 && (
                <p className="text-[10px] text-[#86868b]">
                  ฿{row.otAmount.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        ))}
        {topOT.length === 0 && (
          <div className="text-center py-6 text-[#86868b] text-[13px]">
            ไม่มีข้อมูล OT
          </div>
        )}
      </div>
    </Card>
  );
}

interface TopLateListProps {
  data: EmployeeReport[];
}

export function TopLateList({ data }: TopLateListProps) {
  const topLate = [...data]
    .sort((a, b) => b.lateDays - a.lateDays)
    .slice(0, 5)
    .filter((r) => r.lateDays > 0);

  return (
    <Card elevated padding="none">
      <div className="px-4 py-3 border-b border-[#e8e8ed] flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-[#ff9500]" />
        <h4 className="text-[15px] font-semibold text-[#1d1d1f]">Top 5 มาสาย</h4>
      </div>
      <div className="divide-y divide-[#e8e8ed]">
        {topLate.map((row, i) => (
          <div key={row.id} className="flex items-center gap-3 px-4 py-2.5">
            <span
              className={`w-6 h-6 flex items-center justify-center rounded-full text-[12px] font-bold ${
                i === 0
                  ? "bg-[#ff3b30] text-white"
                  : i === 1
                    ? "bg-[#ff9500] text-white"
                    : i === 2
                      ? "bg-[#ffcc00] text-[#1d1d1f]"
                      : "bg-[#f5f5f7] text-[#6e6e73]"
              }`}
            >
              {i + 1}
            </span>
            <Avatar name={row.name} size="sm" />
            <span className="flex-1 text-[13px] text-[#1d1d1f] truncate">
              {row.name}
            </span>
            <div className="text-right">
              <span className="text-[14px] font-semibold text-[#ff3b30]">
                {row.lateDays} วัน
              </span>
              <p className="text-[10px] text-[#86868b]">{row.lateMinutes} นาที</p>
            </div>
          </div>
        ))}
        {topLate.length === 0 && (
          <div className="text-center py-6 text-[#86868b] text-[13px]">
            ไม่มีคนมาสาย 🎉
          </div>
        )}
      </div>
    </Card>
  );
}
