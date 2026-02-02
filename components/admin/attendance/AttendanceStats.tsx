"use client";

import { Card } from "@/components/ui/Card";
import {
  Users,
  CheckCircle2,
  Clock,
  UserX,
  Calendar,
  Home,
  Timer,
  DollarSign,
} from "lucide-react";
import type { AttendanceStats as Stats } from "./types";

interface AttendanceStatsProps {
  stats: Stats;
}

export function AttendanceStats({ stats }: AttendanceStatsProps) {
  const items = [
    {
      icon: Users,
      color: "text-[#0071e3]",
      value: stats.total,
      label: "ทั้งหมด",
    },
    {
      icon: CheckCircle2,
      color: "text-[#34c759]",
      value: stats.present,
      label: "ปกติ",
    },
    {
      icon: Clock,
      color: "text-[#ff9500]",
      value: stats.late,
      label: "สาย",
    },
    {
      icon: UserX,
      color: "text-[#ff3b30]",
      value: stats.absent,
      label: "ขาด",
    },
    {
      icon: Calendar,
      color: "text-[#af52de]",
      value: stats.leave,
      label: "ลา",
    },
    {
      icon: Home,
      color: "text-[#5856d6]",
      value: stats.wfh,
      label: "WFH",
    },
    {
      icon: Timer,
      color: "text-[#ff9500]",
      value: stats.otHours.toFixed(1),
      label: "ชม. OT",
    },
    {
      icon: DollarSign,
      color: "text-[#34c759]",
      value: `฿${stats.otAmount.toLocaleString()}`,
      label: "เงิน OT",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
      {items.map((item, i) => (
        <Card key={i} elevated className="!p-4 text-center">
          <item.icon className={`w-5 h-5 mx-auto mb-1 ${item.color}`} />
          <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
          <p className="text-xs text-[#86868b]">{item.label}</p>
        </Card>
      ))}
    </div>
  );
}
