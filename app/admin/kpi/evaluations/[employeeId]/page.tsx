"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase/client";
import { ScoreSlider } from "@/components/kpi/ScoreSlider";
import { GradeBadge } from "@/components/kpi/GradeBadge";
import { AutoMetricsDisplay } from "@/components/kpi/AutoMetricsDisplay";
import { GoalCard } from "@/components/kpi/GoalCard";
import { KPIRadarChart } from "@/components/kpi/KPIRadarChart";
import { scoreToGrade } from "@/lib/services/kpi.service";
import type { KPITemplate, KPIGoal, AutoMetrics, KPIEvaluation, EvaluationItem } from "@/lib/services/kpi.service";

interface EvalFormItem {
  template_id?: string;
  goal_id?: string;
  category: string;
  name: string;
  description: string;
  score: number;
  weight: number;
  comment: string;
  evaluation_type: string;
  isAuto: boolean;
}

function EvaluateEmployeeContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const employeeId = params.employeeId as string;
  const periodId = searchParams.get("period") || "";

  const [employee, setEmployee] = useState<{ name: string } | null>(null);
  const [selfEval, setSelfEval] = useState<KPIEvaluation | null>(null);
  const [existingSupEval, setExistingSupEval] = useState<KPIEvaluation | null>(null);
  const [autoMetrics, setAutoMetrics] = useState<AutoMetrics | null>(null);
  const [goals, setGoals] = useState<KPIGoal[]>([]);
  const [formItems, setFormItems] = useState<EvalFormItem[]>([]);
  const [overallComment, setOverallComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (periodId) fetchAllData();
  }, [employeeId, periodId]);

  const fetchAllData = async () => {
    try {
      const [empRes, metricsRes, goalsRes, selfRes, supRes, ptRes] = await Promise.all([
        supabase.from("employees").select("name").eq("id", employeeId).single(),
        supabase.from("kpi_auto_metrics").select("*").eq("employee_id", employeeId).eq("period_id", periodId).maybeSingle(),
        supabase.from("kpi_goals").select("*, kpi_goal_progress(*)").eq("employee_id", employeeId).eq("period_id", periodId).order("created_at"),
        supabase.from("kpi_evaluations").select("*, kpi_evaluation_items(*)").eq("employee_id", employeeId).eq("period_id", periodId).eq("evaluation_type", "self").maybeSingle(),
        supabase.from("kpi_evaluations").select("*, kpi_evaluation_items(*)").eq("employee_id", employeeId).eq("period_id", periodId).eq("evaluation_type", "supervisor").maybeSingle(),
        supabase.from("kpi_period_templates").select("*, kpi_templates(*)").eq("period_id", periodId).eq("is_active", true),
      ]);

      setEmployee(empRes.data);
      setAutoMetrics(metricsRes.data as AutoMetrics | null);
      setGoals((goalsRes.data || []) as KPIGoal[]);
      setSelfEval(selfRes.data as KPIEvaluation | null);
      setExistingSupEval(supRes.data as KPIEvaluation | null);

      const templates = (ptRes.data || []) as any[];
      const existingItems = (supRes.data?.kpi_evaluation_items || []) as EvaluationItem[];

      const items: EvalFormItem[] = [];
      for (const pt of templates) {
        const tmpl = pt.kpi_templates as KPITemplate;
        if (!tmpl) continue;

        if (tmpl.evaluation_type === "goal_based") {
          const approvedGoals = ((goalsRes.data || []) as KPIGoal[]).filter((g) => g.status !== "rejected");
          for (const goal of approvedGoals) {
            const existing = existingItems.find((ei) => ei.goal_id === goal.id);
            items.push({
              goal_id: goal.id,
              category: tmpl.category,
              name: goal.title,
              description: goal.description || "",
              score: existing ? Number(existing.score) : 0,
              weight: Number(goal.weight),
              comment: existing?.comment || "",
              evaluation_type: tmpl.evaluation_type,
              isAuto: false,
            });
          }
        } else {
          const existing = existingItems.find((ei) => ei.template_id === tmpl.id);
          items.push({
            template_id: tmpl.id,
            category: tmpl.category,
            name: tmpl.name,
            description: tmpl.description || "",
            score: existing ? Number(existing.score) : (tmpl.evaluation_type === "auto" ? Number(metricsRes.data?.calculated_score || 0) : 0),
            weight: Number(pt.weight),
            comment: existing?.comment || "",
            evaluation_type: tmpl.evaluation_type,
            isAuto: tmpl.evaluation_type === "auto",
          });
        }
      }

      setFormItems(items);
      setOverallComment(supRes.data?.overall_comment || "");
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (isDraft: boolean) => {
    if (!isDraft) {
      const unscored = formItems.filter((item) => !item.isAuto && item.score === 0);
      if (unscored.length > 0) {
        toast.error("ข้อผิดพลาด", "กรุณาให้คะแนนทุกหัวข้อ");
        return;
      }
    }

    setSaving(true);
    try {
      const evalItems = formItems.map((item) => ({
        template_id: item.template_id || null,
        goal_id: item.goal_id || null,
        category: item.category,
        score: item.score,
        weight: item.weight,
        comment: item.comment || null,
      }));

      const res = await fetch("/api/kpi/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employeeId,
          period_id: periodId,
          evaluation_type: "supervisor",
          overall_comment: overallComment,
          items: evalItems,
          isDraft,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success("สำเร็จ", isDraft ? "บันทึกร่างเรียบร้อย" : "ส่งการประเมินเรียบร้อย");
      if (!isDraft) router.push("/admin/kpi/evaluations");
    } catch {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกได้");
    } finally {
      setSaving(false);
    }
  };

  const totalWeight = formItems.reduce((sum, item) => sum + item.weight, 0);
  const weightedScore = totalWeight > 0
    ? formItems.reduce((sum, item) => sum + (item.score * item.weight / totalWeight), 0)
    : 0;
  const roundedScore = Math.round(weightedScore * 100) / 100;
  const { grade } = scoreToGrade(roundedScore);

  const categoryScores = formItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = { total: 0, weight: 0 };
    acc[item.category].total += item.score * item.weight;
    acc[item.category].weight += item.weight;
    return acc;
  }, {} as Record<string, { total: number; weight: number }>);

  const radarData = Object.entries(categoryScores).map(([category, val]) => ({
    category,
    score: val.weight > 0 ? Math.round((val.total / val.weight) * 100) / 100 : 0,
  }));

  const CATEGORY_LABELS: Record<string, string> = {
    attendance: "การมาทำงาน",
    work_quality: "คุณภาพงาน",
    goals: "เป้าหมาย",
    competency: "สมรรถนะ",
  };

  if (loading) {
    return (
      <AdminLayout title="ประเมินพนักงาน" description="">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={`ประเมิน: ${employee?.name || ""}`}
      description="ประเมินผลงานพนักงาน"
    >
      <div className="max-w-2xl space-y-6">
        {/* Auto Metrics */}
        <Card elevated>
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">ตัวชี้วัดอัตโนมัติ</h3>
          <AutoMetricsDisplay metrics={autoMetrics} compact />
        </Card>

        {/* Self Evaluation Summary */}
        {selfEval && selfEval.status === "submitted" && (
          <Card elevated>
            <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">ผลประเมินตนเอง</h3>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[24px] font-bold text-[#1d1d1f]">{Number(selfEval.overall_score).toFixed(2)}</span>
              <GradeBadge grade={selfEval.overall_grade} size="md" />
            </div>
            {selfEval.overall_comment && (
              <p className="text-[14px] text-[#6e6e73] bg-[#f5f5f7] rounded-xl p-3">{selfEval.overall_comment}</p>
            )}
          </Card>
        )}

        {/* Goals */}
        {goals.length > 0 && (
          <Card elevated>
            <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">เป้าหมายพนักงาน</h3>
            <div className="space-y-3">
              {goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          </Card>
        )}

        {/* Evaluation Form */}
        <Card elevated>
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">ให้คะแนน</h3>
          <div className="space-y-6">
            {Object.entries(
              formItems.reduce((acc, item, idx) => {
                const cat = item.category;
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push({ ...item, idx });
                return acc;
              }, {} as Record<string, (EvalFormItem & { idx: number })[]>)
            ).map(([category, items]) => (
              <div key={category}>
                <h4 className="text-[14px] font-semibold text-[#86868b] uppercase tracking-wider mb-3">
                  {CATEGORY_LABELS[category] || category}
                </h4>
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={`${item.template_id || item.goal_id}-${item.idx}`} className="bg-[#f5f5f7] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[15px] font-medium text-[#1d1d1f]">{item.name}</p>
                        <span className="text-[12px] text-[#86868b]">{item.weight}%</span>
                      </div>
                      {item.description && (
                        <p className="text-[13px] text-[#6e6e73] mb-3">{item.description}</p>
                      )}
                      <ScoreSlider
                        value={item.score}
                        onChange={(score) => {
                          const updated = [...formItems];
                          updated[item.idx] = { ...formItems[item.idx], score };
                          setFormItems(updated);
                        }}
                        disabled={item.isAuto}
                      />
                      <div className="mt-3">
                        <input
                          type="text"
                          value={item.comment}
                          onChange={(e) => {
                            const updated = [...formItems];
                            updated[item.idx] = { ...formItems[item.idx], comment: e.target.value };
                            setFormItems(updated);
                          }}
                          placeholder="ความคิดเห็น (ไม่บังคับ)"
                          className="w-full px-3 py-2 text-[14px] border border-[#d2d2d7] rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Overall Comment */}
        <Card elevated>
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">ความคิดเห็นภาพรวม</h3>
          <Textarea
            value={overallComment}
            onChange={(e) => setOverallComment(e.target.value)}
            placeholder="ความคิดเห็นเพิ่มเติม ข้อเสนอแนะ จุดเด่น จุดที่ควรพัฒนา..."
            rows={4}
          />
        </Card>

        {/* Score Summary */}
        <Card elevated>
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">สรุปคะแนน</h3>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-[36px] font-bold text-[#1d1d1f]">{roundedScore.toFixed(2)}</span>
            <GradeBadge grade={grade} size="lg" showLabel />
          </div>
          <KPIRadarChart data={radarData} height={250} />
        </Card>

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <Button
            variant="secondary"
            onClick={() => router.push("/admin/kpi/evaluations")}
            fullWidth
          >
            กลับ
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleSave(true)}
            fullWidth
            loading={saving}
          >
            บันทึกร่าง
          </Button>
          <Button
            onClick={() => handleSave(false)}
            fullWidth
            loading={saving}
          >
            ส่งการประเมิน
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}

export default function EvaluateEmployeePage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <EvaluateEmployeeContent />
    </ProtectedRoute>
  );
}
