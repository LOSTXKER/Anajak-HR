"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/Card";
import { GradeBadge } from "@/components/kpi/GradeBadge";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft, History, TrendingUp } from "lucide-react";
import type { KPIPeriod, KPIEvaluation, AutoMetrics } from "@/lib/services/kpi.service";

interface HistoryItem {
  period: KPIPeriod;
  evaluation: KPIEvaluation | null;
  metrics: AutoMetrics | null;
}

function KPIHistoryContent() {
  const { employee } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (employee?.id) fetchHistory();
  }, [employee?.id]);

  const fetchHistory = async () => {
    try {
      const { data: periods } = await supabase
        .from("kpi_periods")
        .select("*")
        .eq("status", "closed")
        .order("end_date", { ascending: false });

      if (!periods || periods.length === 0) {
        setLoading(false);
        return;
      }

      const periodIds = periods.map((p: KPIPeriod) => p.id);

      const [evalsRes, metricsRes] = await Promise.all([
        supabase
          .from("kpi_evaluations")
          .select("*")
          .eq("employee_id", employee!.id)
          .eq("evaluation_type", "supervisor")
          .eq("status", "submitted")
          .in("period_id", periodIds),
        supabase
          .from("kpi_auto_metrics")
          .select("*")
          .eq("employee_id", employee!.id)
          .in("period_id", periodIds),
      ]);

      const items: HistoryItem[] = (periods as KPIPeriod[]).map((period) => ({
        period,
        evaluation: ((evalsRes.data || []) as KPIEvaluation[]).find((e) => e.period_id === period.id) || null,
        metrics: ((metricsRes.data || []) as AutoMetrics[]).find((m) => m.period_id === period.id) || null,
      }));

      setHistory(items);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] pb-24">
      <div className="bg-white border-b border-[#e8e8ed]">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/kpi")} className="p-1">
              <ArrowLeft className="w-5 h-5 text-[#1d1d1f]" />
            </button>
            <h1 className="text-[20px] font-bold text-[#1d1d1f]">ประวัติผลประเมิน</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <Card elevated>
            <div className="text-center py-12">
              <div className="w-14 h-14 bg-[#f5f5f7] rounded-2xl flex items-center justify-center mx-auto mb-3">
                <History className="w-7 h-7 text-[#86868b]" />
              </div>
              <p className="text-[15px] text-[#86868b]">ยังไม่มีประวัติผลประเมิน</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Trend line (simplified) */}
            {history.filter((h) => h.evaluation).length >= 2 && (
              <Card elevated>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-[#0071e3]" />
                  <h3 className="text-[15px] font-semibold text-[#1d1d1f]">แนวโน้มคะแนน</h3>
                </div>
                <div className="flex items-end gap-3 h-24">
                  {history
                    .filter((h) => h.evaluation)
                    .reverse()
                    .map((item) => {
                      const score = Number(item.evaluation?.overall_score || 0);
                      const height = (score / 5) * 100;
                      return (
                        <div key={item.period.id} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[11px] font-semibold text-[#1d1d1f]">
                            {score.toFixed(1)}
                          </span>
                          <div
                            className="w-full bg-[#0071e3] rounded-t-lg transition-all"
                            style={{ height: `${Math.max(height, 8)}%` }}
                          />
                          <span className="text-[10px] text-[#86868b] truncate max-w-full">
                            {item.period.name}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </Card>
            )}

            {/* History Cards */}
            {history.map((item) => (
              <Card key={item.period.id} elevated>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#1d1d1f]">{item.period.name}</h3>
                    <p className="text-[13px] text-[#86868b]">
                      {item.period.start_date} - {item.period.end_date}
                    </p>
                  </div>
                  {item.evaluation && (
                    <div className="text-right">
                      <span className="text-[20px] font-bold text-[#1d1d1f]">
                        {Number(item.evaluation.overall_score).toFixed(2)}
                      </span>
                      <div className="mt-1">
                        <GradeBadge grade={item.evaluation.overall_grade} size="sm" />
                      </div>
                    </div>
                  )}
                </div>

                {item.metrics && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#f5f5f7] rounded-lg px-3 py-2">
                      <p className="text-[11px] text-[#86868b]">มาทำงาน</p>
                      <p className="text-[14px] font-semibold text-[#1d1d1f]">
                        {Number(item.metrics.attendance_rate).toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-[#f5f5f7] rounded-lg px-3 py-2">
                      <p className="text-[11px] text-[#86868b]">ตรงเวลา</p>
                      <p className="text-[14px] font-semibold text-[#1d1d1f]">
                        {Number(item.metrics.punctuality_rate).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                )}

                {!item.evaluation && (
                  <p className="text-[13px] text-[#86868b] text-center py-2">ไม่มีข้อมูลการประเมิน</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

export default function KPIHistoryPage() {
  return (
    <ProtectedRoute>
      <KPIHistoryContent />
    </ProtectedRoute>
  );
}
