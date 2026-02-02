"use client";

import { Card } from "@/components/ui/Card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { OTTypeStat } from "./types";

interface OTDistributionChartProps {
  data: OTTypeStat[];
}

export function OTDistributionChart({ data }: OTDistributionChartProps) {
  if (data.length === 0) return null;

  return (
    <Card elevated padding="none" className="p-4">
      <div className="mb-4">
        <h4 className="text-[15px] font-semibold text-[#1d1d1f]">⏰ ประเภท OT</h4>
        <p className="text-[12px] text-[#86868b]">
          สัดส่วนชั่วโมง OT แยกตามประเภท
        </p>
      </div>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value.toFixed(1)}`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(1)} ชม.`]}
              contentStyle={{
                borderRadius: "12px",
                border: "none",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
