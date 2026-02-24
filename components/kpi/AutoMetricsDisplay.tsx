"use client";

import { Clock, Calendar, AlertTriangle, TrendingUp } from "lucide-react";
import type { AutoMetrics } from "@/lib/services/kpi.service";

interface AutoMetricsDisplayProps {
  metrics: AutoMetrics | null;
  compact?: boolean;
}

export function AutoMetricsDisplay({ metrics, compact = false }: AutoMetricsDisplayProps) {
  if (!metrics) {
    return (
      <div className="text-center py-8">
        <p className="text-[14px] text-[#86868b]">ยังไม่ได้คำนวณตัวชี้วัดอัตโนมัติ</p>
      </div>
    );
  }

  const items = [
    {
      icon: Calendar,
      label: "อัตราการมาทำงาน",
      value: `${Number(metrics.attendance_rate).toFixed(1)}%`,
      detail: `${metrics.days_present}/${metrics.total_working_days} วัน`,
      color: Number(metrics.attendance_rate) >= 95 ? "#30d158" : Number(metrics.attendance_rate) >= 90 ? "#ff9f0a" : "#ff3b30",
    },
    {
      icon: Clock,
      label: "อัตราการมาตรงเวลา",
      value: `${Number(metrics.punctuality_rate).toFixed(1)}%`,
      detail: `สาย ${metrics.days_late} วัน`,
      color: Number(metrics.punctuality_rate) >= 95 ? "#30d158" : Number(metrics.punctuality_rate) >= 90 ? "#ff9f0a" : "#ff3b30",
    },
    {
      icon: AlertTriangle,
      label: "วันลา",
      value: `${Number(metrics.total_leave_days)} วัน`,
      detail: `ขาด ${metrics.days_absent} วัน`,
      color: "#6e6e73",
    },
    {
      icon: TrendingUp,
      label: "ชั่วโมง OT",
      value: `${Number(metrics.total_ot_hours).toFixed(1)} ชม.`,
      detail: "",
      color: "#0071e3",
    },
  ];

  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label} className="bg-[#f5f5f7] rounded-xl p-3">
            <p className="text-[12px] text-[#86868b] mb-1">{item.label}</p>
            <p className="text-[17px] font-bold" style={{ color: item.color }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="bg-white rounded-2xl border border-[#e8e8ed] p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                <Icon className="w-5 h-5" style={{ color: item.color }} />
              </div>
              <div>
                <p className="text-[13px] text-[#86868b]">{item.label}</p>
                <p className="text-[20px] font-bold" style={{ color: item.color }}>
                  {item.value}
                </p>
              </div>
            </div>
            {item.detail && (
              <p className="text-[13px] text-[#6e6e73]">{item.detail}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
