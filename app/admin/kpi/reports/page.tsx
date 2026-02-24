"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { GradeBadge } from "@/components/kpi/GradeBadge";
import { KPIRadarChart } from "@/components/kpi/KPIRadarChart";
import { supabase } from "@/lib/supabase/client";
import { BarChart3, Users, TrendingUp, Award } from "lucide-react";
import type { KPIPeriod, EmployeeKPISummary } from "@/lib/services/kpi.service";

function ReportsContent() {
  const [periods, setPeriods] = useState<KPIPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<{
    totalEmployees: number;
    evaluatedCount: number;
    averageScore: number;
    gradeDistribution: Record<string, number>;
    avgByCategory: Record<string, number>;
    topPerformers: EmployeeKPISummary[];
  } | null>(null);

  useEffect(() => {
    fetchPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) fetchReport(selectedPeriod);
  }, [selectedPeriod]);

  const fetchPeriods = async () => {
    const { data } = await supabase
      .from("kpi_periods")
      .select("*")
      .order("start_date", { ascending: false });
    setPeriods((data || []) as KPIPeriod[]);
    if (data?.[0]) setSelectedPeriod(data[0].id);
    setLoading(false);
  };

  const fetchReport = async (periodId: string) => {
    try {
      const res = await fetch(`/api/kpi/reports/summary?period_id=${periodId}`);
      const { data } = await res.json();
      setReport(data);
    } catch (error) {
      console.error("Error fetching report:", error);
    }
  };

  const GRADE_COLORS: Record<string, string> = {
    S: "#bf5af2",
    A: "#30d158",
    "B+": "#0071e3",
    B: "#007aff",
    "C+": "#ff9f0a",
    C: "#ff9f0a",
    D: "#ff3b30",
  };

  const radarData = report?.avgByCategory
    ? Object.entries(report.avgByCategory).map(([category, score]) => ({ category, score }))
    : [];

  return (
    <AdminLayout title="รายงาน KPI" description="สรุปผลประเมิน KPI ภาพรวม">
      {/* Period Selector */}
      <div className="mb-6">
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="px-4 py-2.5 border border-[#d2d2d7] rounded-xl text-[14px] bg-white"
        >
          {periods.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {!report ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card elevated>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#0071e3]/10 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#0071e3]" />
                </div>
                <div>
                  <p className="text-[13px] text-[#86868b]">ประเมินแล้ว</p>
                  <p className="text-[24px] font-bold text-[#1d1d1f]">
                    {report.evaluatedCount}/{report.totalEmployees}
                  </p>
                </div>
              </div>
            </Card>
            <Card elevated>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#30d158]/10 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-[#30d158]" />
                </div>
                <div>
                  <p className="text-[13px] text-[#86868b]">คะแนนเฉลี่ย</p>
                  <p className="text-[24px] font-bold text-[#1d1d1f]">{report.averageScore.toFixed(2)}</p>
                </div>
              </div>
            </Card>
            <Card elevated>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#bf5af2]/10 rounded-xl flex items-center justify-center">
                  <Award className="w-6 h-6 text-[#bf5af2]" />
                </div>
                <div>
                  <p className="text-[13px] text-[#86868b]">เกรดเฉลี่ย</p>
                  <GradeBadge
                    grade={report.averageScore >= 4.5 ? "S" : report.averageScore >= 4 ? "A" : report.averageScore >= 3.5 ? "B+" : report.averageScore >= 3 ? "B" : report.averageScore >= 2.5 ? "C+" : report.averageScore >= 2 ? "C" : "D"}
                    size="lg"
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Grade Distribution */}
          <Card elevated>
            <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">การกระจายเกรด</h3>
            <div className="flex items-end gap-4 h-40">
              {["S", "A", "B+", "B", "C+", "C", "D"].map((g) => {
                const count = report.gradeDistribution[g] || 0;
                const maxCount = Math.max(...Object.values(report.gradeDistribution), 1);
                const height = (count / maxCount) * 100;
                return (
                  <div key={g} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[12px] font-semibold text-[#1d1d1f]">{count}</span>
                    <div
                      className="w-full rounded-t-lg transition-all duration-500"
                      style={{
                        height: `${Math.max(height, 4)}%`,
                        backgroundColor: GRADE_COLORS[g] || "#86868b",
                        opacity: count > 0 ? 1 : 0.2,
                      }}
                    />
                    <span className="text-[13px] font-medium text-[#6e6e73]">{g}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Category Radar */}
          {radarData.length > 0 && (
            <Card elevated>
              <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">คะแนนเฉลี่ยตามหมวด</h3>
              <KPIRadarChart data={radarData} />
            </Card>
          )}

          {/* Top Performers */}
          {report.topPerformers.length > 0 && (
            <Card elevated>
              <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">Top Performers</h3>
              <div className="space-y-3">
                {report.topPerformers.map((emp, idx) => (
                  <div key={emp.employee_id} className="flex items-center gap-4 py-2">
                    <span className="text-[20px] font-bold text-[#86868b] w-8 text-center">{idx + 1}</span>
                    <div className="w-10 h-10 bg-[#0071e3]/10 rounded-full flex items-center justify-center">
                      <span className="text-[14px] font-bold text-[#0071e3]">
                        {emp.employee_name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-[15px] font-medium text-[#1d1d1f]">{emp.employee_name}</p>
                    </div>
                    <span className="text-[17px] font-bold text-[#1d1d1f]">{emp.final_score?.toFixed(2)}</span>
                    <GradeBadge grade={emp.final_grade} size="sm" />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </AdminLayout>
  );
}

export default function ReportsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <ReportsContent />
    </ProtectedRoute>
  );
}
