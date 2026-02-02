"use client";

import { Card } from "@/components/ui/Card";
import {
  Users,
  Clock,
  Calendar,
  Home,
  AlertTriangle,
  TrendingUp,
  FileText,
} from "lucide-react";
import { ReportSummary } from "./types";

interface SummaryCardsProps {
  summary: ReportSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const stats = [
    {
      label: "พนักงาน",
      value: summary.totalEmployees,
      icon: Users,
      color: "text-[#1d1d1f]",
      bg: "bg-[#f5f5f7]",
    },
    {
      label: "วันทำงาน",
      value: summary.totalWorkDays,
      icon: Calendar,
      color: "text-[#0071e3]",
      bg: "bg-[#0071e3]/10",
    },
    {
      label: "ชั่วโมง",
      value: summary.totalWorkHours.toFixed(0),
      icon: Clock,
      color: "text-[#34c759]",
      bg: "bg-[#34c759]/10",
    },
    {
      label: "มาสาย",
      value: summary.totalLateDays,
      icon: AlertTriangle,
      color: "text-[#ff3b30]",
      bg: "bg-[#ff3b30]/10",
    },
    {
      label: "ลางาน",
      value: summary.totalLeaveDays.toFixed(1),
      icon: FileText,
      color: "text-[#ff9500]",
      bg: "bg-[#ff9500]/10",
    },
    {
      label: "WFH",
      value: summary.totalWFHDays.toFixed(1),
      icon: Home,
      color: "text-[#af52de]",
      bg: "bg-[#af52de]/10",
    },
    {
      label: "OT (ชม.)",
      value: summary.totalOTHours.toFixed(1),
      icon: TrendingUp,
      color: "text-[#ff9500]",
      bg: "bg-[#ff9500]/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
      {stats.map((stat, i) => (
        <Card key={i} elevated>
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center`}
            >
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div>
              <p className={`text-[18px] font-semibold ${stat.color}`}>
                {stat.value}
              </p>
              <p className="text-[10px] text-[#86868b]">{stat.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
