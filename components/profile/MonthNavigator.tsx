"use client";

import { Card } from "@/components/ui/Card";
import { ChevronLeft, ChevronRight, Calendar, AlertTriangle, Timer, DollarSign } from "lucide-react";
import { format, subMonths, addMonths } from "date-fns";
import { th } from "date-fns/locale";
import type { MonthlyStats } from "./types";

interface MonthNavigatorProps {
  currentMonth: Date;
  onChangeMonth: (date: Date) => void;
  stats: MonthlyStats;
}

export function MonthNavigator({ currentMonth, onChangeMonth, stats }: MonthNavigatorProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onChangeMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-[#6e6e73]" />
        </button>
        <h3 className="text-lg font-semibold text-[#1d1d1f]">
          {format(currentMonth, "MMMM yyyy", { locale: th })}
        </h3>
        <button
          onClick={() => onChangeMonth(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-[#6e6e73]" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-6">
        {[
          { label: "วันทำงาน", value: stats.workDays, icon: Calendar, color: "#34c759" },
          { label: "วันสาย", value: stats.lateDays, icon: AlertTriangle, color: "#ff9500" },
          { label: "ชม. OT", value: stats.otHours.toFixed(1), icon: Timer, color: "#0071e3" },
          { label: "เงิน OT", value: `฿${stats.otAmount.toLocaleString()}`, icon: DollarSign, color: "#34c759" },
        ].map((stat, i) => (
          <Card key={i} elevated className="!p-3">
            <div className="text-center">
              <stat.icon className="w-5 h-5 mx-auto mb-1" style={{ color: stat.color }} />
              <p className="text-lg font-bold text-[#1d1d1f]">{stat.value}</p>
              <p className="text-[10px] text-[#86868b]">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
