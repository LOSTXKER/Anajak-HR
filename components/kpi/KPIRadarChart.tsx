"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

const CATEGORY_LABELS: Record<string, string> = {
  attendance: "การมาทำงาน",
  work_quality: "คุณภาพงาน",
  goals: "เป้าหมาย",
  competency: "สมรรถนะ",
};

interface KPIRadarChartProps {
  data: { category: string; score: number; fullMark?: number }[];
  height?: number;
}

export function KPIRadarChart({ data, height = 300 }: KPIRadarChartProps) {
  const chartData = data.map((d) => ({
    category: CATEGORY_LABELS[d.category] || d.category,
    score: d.score,
    fullMark: d.fullMark || 5,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-[14px] text-[#86868b]">ยังไม่มีข้อมูลคะแนน</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={chartData}>
        <PolarGrid stroke="#e8e8ed" />
        <PolarAngleAxis
          dataKey="category"
          tick={{ fontSize: 13, fill: "#6e6e73" }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 5]}
          tick={{ fontSize: 11, fill: "#86868b" }}
        />
        <Radar
          name="คะแนน"
          dataKey="score"
          stroke="#0071e3"
          fill="#0071e3"
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
