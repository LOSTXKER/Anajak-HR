"use client";

import { Card } from "@/components/ui/Card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { BranchStat } from "./types";

interface BranchStatsChartProps {
  data: BranchStat[];
}

export function BranchStatsChart({ data }: BranchStatsChartProps) {
  return (
    <Card elevated padding="none" className="p-4">
      <div className="mb-4">
        <h4 className="text-[15px] font-semibold text-[#1d1d1f]">
          🏢 สถิติตามสาขา
        </h4>
        <p className="text-[12px] text-[#86868b]">
          ชั่วโมง OT และวันสายแยกตามสาขา
        </p>
      </div>
      <div className="h-[250px] w-full text-[11px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal
                vertical={false}
                stroke="#e5e7eb"
              />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#86868b", fontSize: 10 }}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={90}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#1d1d1f", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                }}
                cursor={{ fill: "transparent" }}
              />
              <Legend iconType="circle" />
              <Bar
                dataKey="otHours"
                name="OT (ชม.)"
                fill="#ff9500"
                radius={[0, 4, 4, 0]}
                barSize={16}
              />
              <Bar
                dataKey="lateDays"
                name="สาย (วัน)"
                fill="#ff3b30"
                radius={[0, 4, 4, 0]}
                barSize={16}
              />
            </BarChart>
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
