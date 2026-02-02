"use client";

import { Card } from "@/components/ui/Card";
import {
  Users,
  DollarSign,
  Gift,
  Clock,
  AlertTriangle,
  Calculator,
} from "lucide-react";
import { formatCurrency, PayrollSummary } from "./types";

interface PayrollSummaryCardsProps {
  summary: PayrollSummary;
}

export function PayrollSummaryCards({ summary }: PayrollSummaryCardsProps) {
  const cards = [
    {
      icon: Users,
      color: "text-[#0071e3]",
      bg: "bg-[#0071e3]/10",
      value: summary.totalEmployees,
      label: "พนักงาน",
      prefix: "",
    },
    {
      icon: DollarSign,
      color: "text-[#34c759]",
      bg: "bg-[#34c759]/10",
      value: formatCurrency(summary.totalBasePay),
      label: "เงินเดือน",
      prefix: "฿",
    },
    {
      icon: Gift,
      color: "text-[#af52de]",
      bg: "bg-[#af52de]/10",
      value: formatCurrency(summary.totalCommission),
      label: "คอมมิชชั่น",
      prefix: "฿",
    },
    {
      icon: Clock,
      color: "text-[#ff9500]",
      bg: "bg-[#ff9500]/10",
      value: formatCurrency(summary.totalOTPay),
      label: "OT",
      prefix: "฿",
    },
    {
      icon: AlertTriangle,
      color: "text-[#ff3b30]",
      bg: "bg-[#ff3b30]/10",
      value: formatCurrency(summary.totalLatePenalty),
      label: "หักสาย",
      prefix: "-฿",
    },
    {
      icon: Calculator,
      color: "text-[#0071e3]",
      bg: "bg-[#0071e3]/10",
      value: formatCurrency(summary.totalPay),
      label: "รวมทั้งหมด",
      prefix: "฿",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
      {cards.map((card, i) => (
        <Card key={i} elevated>
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center`}
            >
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <p className={`text-[18px] font-semibold ${card.color}`}>
                {card.prefix}
                {card.value}
              </p>
              <p className="text-[11px] text-[#86868b]">{card.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
