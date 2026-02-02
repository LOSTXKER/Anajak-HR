"use client";

import { Card } from "@/components/ui/Card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { DailyStat } from "./types";

interface DailyTrendChartProps {
  data: DailyStat[];
}

export function DailyTrendChart({ data }: DailyTrendChartProps) {
  return (
    <Card elevated padding="none" className="p-4">
      <div className="mb-4">
        <h4 className="text-[15px] font-semibold text-[#1d1d1f]">
          📈 แนวโน้มรายวัน
        </h4>
        <p className="text-[12px] text-[#86868b]">
          จำนวนพนักงานเข้างาน และชั่วโมง OT
        </p>
      </div>
      <div className="h-[250px] w-full text-[11px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0071e3" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0071e3" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorOT" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff9500" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ff9500" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e5e7eb"
              />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#86868b", fontSize: 10 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#86868b", fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                }}
                formatter={(value: number, name: string) => [
                  name === "เข้างาน" ? `${value} คน` : `${value.toFixed(1)} ชม.`,
                  name,
                ]}
              />
              <Legend iconType="circle" />
              <Area
                type="monotone"
                dataKey="attendance"
                name="เข้างาน"
                stroke="#0071e3"
                strokeWidth={2}
                fill="url(#colorAtt)"
              />
              <Area
                type="monotone"
                dataKey="otHours"
                name="OT (ชม.)"
                stroke="#ff9500"
                strokeWidth={2}
                fill="url(#colorOT)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-[#86868b]">
            ไม่มีข้อมูล
          </div>
        )}
      </div>
    </Card>
  );
}
