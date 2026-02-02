"use client";

import { Card } from "@/components/ui/Card";
import {
  Calendar,
  AlertTriangle,
  Clock,
  DollarSign,
  FileText,
  Home,
} from "lucide-react";
import { MonthlyStats } from "./types";

interface QuickStatsProps {
  stats: MonthlyStats;
}

export function QuickStats({ stats }: QuickStatsProps) {
  const statItems = [
    {
      label: "วันทำงาน",
      value: stats.workDays,
      icon: Calendar,
      color: "text-[#34c759]",
      bg: "bg-[#34c759]/10",
    },
    {
      label: "วันสาย",
      value: stats.lateDays,
      icon: AlertTriangle,
      color: "text-[#ff9500]",
      bg: "bg-[#ff9500]/10",
    },
    {
      label: "ชม. OT",
      value: stats.otHours.toFixed(1),
      icon: Clock,
      color: "text-[#0071e3]",
      bg: "bg-[#0071e3]/10",
    },
    {
      label: "เงิน OT",
      value: `฿${stats.otAmount.toLocaleString()}`,
      icon: DollarSign,
      color: "text-[#34c759]",
      bg: "bg-[#34c759]/10",
    },
    {
      label: "วันลา",
      value: stats.leaveDays,
      icon: FileText,
      color: "text-[#ff3b30]",
      bg: "bg-[#ff3b30]/10",
    },
    {
      label: "วัน WFH",
      value: stats.wfhDays,
      icon: Home,
      color: "text-[#af52de]",
      bg: "bg-[#af52de]/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
      {statItems.map((stat, i) => (
        <Card key={i} elevated className="!p-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center`}
            >
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div>
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] text-[#86868b]">{stat.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
