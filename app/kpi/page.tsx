"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { GradeBadge } from "@/components/kpi/GradeBadge";
import { AutoMetricsDisplay } from "@/components/kpi/AutoMetricsDisplay";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Target,
  ChevronRight,
  FileEdit,
  History,
  CheckCircle2,
  Clock,
} from "lucide-react";
import type { KPIPeriod, AutoMetrics, KPIEvaluation } from "@/lib/services/kpi.service";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "แบบร่าง", color: "#86868b" },
  goal_setting: { label: "ตั้งเป้าหมาย", color: "#ff9f0a" },
  in_progress: { label: "กำลังดำเนินการ", color: "#007aff" },
  evaluating: { label: "ช่วงประเมิน", color: "#bf5af2" },
  closed: { label: "ปิดแล้ว", color: "#30d158" },
};

function KPIDashboard() {
  const { employee } = useAuth();
  const [activePeriod, setActivePeriod] = useState<KPIPeriod | null>(null);
  const [goalsCount, setGoalsCount] = useState(0);
  const [goalsCompleted, setGoalsCompleted] = useState(0);
  const [autoMetrics, setAutoMetrics] = useState<AutoMetrics | null>(null);
  const [latestEval, setLatestEval] = useState<KPIEvaluation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (employee?.id) fetchData();
  }, [employee?.id]);

  const fetchData = async () => {
    try {
      const { data: periods } = await supabase
        .from("kpi_periods")
        .select("*")
        .neq("status", "draft")
        .order("start_date", { ascending: false })
        .limit(1);

      const period = periods?.[0] || null;
      setActivePeriod(period);

      if (period && employee) {
        const [goalsRes, completedRes, metricsRes, evalRes] = await Promise.all([
          supabase
            .from("kpi_goals")
            .select("id", { count: "exact", head: true })
            .eq("employee_id", employee.id)
            .eq("period_id", period.id),
          supabase
            .from("kpi_goals")
            .select("id", { count: "exact", head: true })
            .eq("employee_id", employee.id)
            .eq("period_id", period.id)
            .eq("status", "completed"),
          supabase
            .from("kpi_auto_metrics")
            .select("*")
            .eq("employee_id", employee.id)
            .eq("period_id", period.id)
            .maybeSingle(),
          supabase
            .from("kpi_evaluations")
            .select("*")
            .eq("employee_id", employee.id)
            .eq("evaluation_type", "supervisor")
            .eq("status", "submitted")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        setGoalsCount(goalsRes.count || 0);
        setGoalsCompleted(completedRes.count || 0);
        setAutoMetrics(metricsRes.data as AutoMetrics | null);
        setLatestEval(evalRes.data as KPIEvaluation | null);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7]">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-[#e8e8ed]">
        <div className="max-w-lg mx-auto px-4 py-6">
          <h1 className="text-[28px] font-bold text-[#1d1d1f]">KPI ของฉัน</h1>
          {activePeriod && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[15px] text-[#86868b]">{activePeriod.name}</span>
              <span
                className="text-[12px] font-medium px-2 py-0.5 rounded-lg"
                style={{
                  backgroundColor: `${STATUS_LABELS[activePeriod.status]?.color}15`,
                  color: STATUS_LABELS[activePeriod.status]?.color,
                }}
              >
                {STATUS_LABELS[activePeriod.status]?.label}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {!activePeriod ? (
          <Card elevated>
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-[#f5f5f7] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-[#86868b]" />
              </div>
              <p className="text-[17px] text-[#86868b]">ยังไม่มีรอบประเมินที่เปิดอยู่</p>
            </div>
          </Card>
        ) : (
          <>
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/kpi/goals">
                <Card elevated className="h-full">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0071e3]/10 rounded-xl flex items-center justify-center">
                      <Target className="w-5 h-5 text-[#0071e3]" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-[#1d1d1f]">เป้าหมาย</p>
                      <p className="text-[12px] text-[#86868b]">{goalsCompleted}/{goalsCount}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#86868b] ml-auto" />
                  </div>
                </Card>
              </Link>

              {(activePeriod.status === "evaluating" || activePeriod.status === "closed") && (
                <Link href="/kpi/evaluation">
                  <Card elevated className="h-full">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#bf5af2]/10 rounded-xl flex items-center justify-center">
                        <FileEdit className="w-5 h-5 text-[#bf5af2]" />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-[#1d1d1f]">ประเมินตนเอง</p>
                        <p className="text-[12px] text-[#86868b]">ส่งแบบประเมิน</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#86868b] ml-auto" />
                    </div>
                  </Card>
                </Link>
              )}

              <Link href="/kpi/history">
                <Card elevated className="h-full">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#30d158]/10 rounded-xl flex items-center justify-center">
                      <History className="w-5 h-5 text-[#30d158]" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-[#1d1d1f]">ประวัติ</p>
                      <p className="text-[12px] text-[#86868b]">ผลประเมินที่ผ่านมา</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#86868b] ml-auto" />
                  </div>
                </Card>
              </Link>
            </div>

            {/* Latest Evaluation Result */}
            {latestEval && (
              <Card elevated>
                <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-3">ผลประเมินล่าสุด</h3>
                <div className="flex items-center gap-4">
                  <span className="text-[36px] font-bold text-[#1d1d1f]">
                    {Number(latestEval.overall_score).toFixed(2)}
                  </span>
                  <GradeBadge grade={latestEval.overall_grade} size="lg" showLabel />
                </div>
              </Card>
            )}

            {/* Auto Metrics */}
            {autoMetrics && (
              <Card elevated>
                <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-3">ตัวชี้วัดอัตโนมัติ</h3>
                <AutoMetricsDisplay metrics={autoMetrics} compact />
              </Card>
            )}

            {/* Goals Progress */}
            {goalsCount > 0 && (
              <Card elevated>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[15px] font-semibold text-[#1d1d1f]">ความคืบหน้าเป้าหมาย</h3>
                  <Link href="/kpi/goals" className="text-[13px] text-[#0071e3] font-medium">
                    ดูทั้งหมด
                  </Link>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] text-[#86868b]">สำเร็จ</span>
                      <span className="text-[13px] font-semibold text-[#1d1d1f]">
                        {goalsCompleted}/{goalsCount}
                      </span>
                    </div>
                    <div className="h-3 bg-[#f5f5f7] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#30d158] rounded-full transition-all"
                        style={{ width: `${goalsCount > 0 ? (goalsCompleted / goalsCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

export default function KPIPage() {
  return (
    <ProtectedRoute>
      <KPIDashboard />
    </ProtectedRoute>
  );
}
