"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase/client";
import { ScoreSlider } from "@/components/kpi/ScoreSlider";
import { GradeBadge } from "@/components/kpi/GradeBadge";
import { AutoMetricsDisplay } from "@/components/kpi/AutoMetricsDisplay";
import { KPIRadarChart } from "@/components/kpi/KPIRadarChart";
import { scoreToGrade } from "@/lib/services/kpi.service";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import type { KPITemplate, KPIGoal, AutoMetrics, KPIEvaluation, EvaluationItem } from "@/lib/services/kpi.service";

interface FormItem {
  template_id?: string;
  goal_id?: string;
  category: string;
  name: string;
  description: string;
  score: number;
  weight: number;
  comment: string;
  isAuto: boolean;
}

function SelfEvaluationContent() {
  const { employee } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [activePeriodId, setActivePeriodId] = useState<string | null>(null);
  const [autoMetrics, setAutoMetrics] = useState<AutoMetrics | null>(null);
  const [formItems, setFormItems] = useState<FormItem[]>([]);
  const [overallComment, setOverallComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (employee?.id) fetchData();
  }, [employee?.id]);

  const fetchData = async () => {
    try {
      const { data: periods } = await supabase
        .from("kpi_periods")
        .select("id, status")
        .in("status", ["evaluating", "in_progress"])
        .order("start_date", { ascending: false })
        .limit(1);

      const period = periods?.[0];
      if (!period) {
        setLoading(false);
        return;
      }
      setActivePeriodId(period.id);

      const [metricsRes, goalsRes, existingRes, ptRes] = await Promise.all([
        supabase.from("kpi_auto_metrics").select("*").eq("employee_id", employee!.id).eq("period_id", period.id).maybeSingle(),
        supabase.from("kpi_goals").select("*").eq("employee_id", employee!.id).eq("period_id", period.id).neq("status", "rejected").order("created_at"),
        supabase.from("kpi_evaluations").select("*, kpi_evaluation_items(*)").eq("employee_id", employee!.id).eq("period_id", period.id).eq("evaluation_type", "self").maybeSingle(),
        supabase.from("kpi_period_templates").select("*, kpi_templates(*)").eq("period_id", period.id).eq("is_active", true),
      ]);

      setAutoMetrics(metricsRes.data as AutoMetrics | null);

      if (existingRes.data?.status === "submitted") {
        setSubmitted(true);
        setLoading(false);
        return;
      }

      const existingItems = (existingRes.data?.kpi_evaluation_items || []) as EvaluationItem[];
      const templates = (ptRes.data || []) as any[];
      const goals = (goalsRes.data || []) as KPIGoal[];

      const items: FormItem[] = [];
      for (const pt of templates) {
        const tmpl = pt.kpi_templates as KPITemplate;
        if (!tmpl) continue;

        if (tmpl.evaluation_type === "goal_based") {
          for (const goal of goals) {
            const existing = existingItems.find((ei) => ei.goal_id === goal.id);
            items.push({
              goal_id: goal.id,
              category: tmpl.category,
              name: goal.title,
              description: goal.description || "",
              score: existing ? Number(existing.score) : 0,
              weight: Number(goal.weight),
              comment: existing?.comment || "",
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
            isAuto: tmpl.evaluation_type === "auto",
          });
        }
      }

      setFormItems(items);
      setOverallComment(existingRes.data?.overall_comment || "");
    } catch (error) {
      console.error("Error:", error);
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
          employee_id: employee!.id,
          period_id: activePeriodId,
          evaluation_type: "self",
          overall_comment: overallComment,
          items: evalItems,
          isDraft,
        }),
      });

      if (!res.ok) throw new Error("Failed");

      toast.success("สำเร็จ", isDraft ? "บันทึกร่างเรียบร้อย" : "ส่งการประเมินตนเองเรียบร้อย");
      if (!isDraft) router.push("/kpi");
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
      <div className="min-h-screen bg-[#f5f5f7]">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] pb-24">
        <div className="bg-white border-b border-[#e8e8ed]">
          <div className="max-w-lg mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/kpi")} className="p-1">
                <ArrowLeft className="w-5 h-5 text-[#1d1d1f]" />
              </button>
              <h1 className="text-[20px] font-bold text-[#1d1d1f]">ประเมินตนเอง</h1>
            </div>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          <div className="w-16 h-16 bg-[#30d158]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-[#30d158]" />
          </div>
          <p className="text-[17px] font-semibold text-[#1d1d1f]">ส่งการประเมินตนเองเรียบร้อยแล้ว</p>
          <p className="text-[14px] text-[#86868b] mt-2">กรุณารอหัวหน้าประเมินผล</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] pb-24">
      <div className="bg-white border-b border-[#e8e8ed]">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/kpi")} className="p-1">
              <ArrowLeft className="w-5 h-5 text-[#1d1d1f]" />
            </button>
            <h1 className="text-[20px] font-bold text-[#1d1d1f]">ประเมินตนเอง</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Auto Metrics */}
        {autoMetrics && (
          <Card elevated>
            <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-3">ตัวชี้วัดอัตโนมัติ</h3>
            <AutoMetricsDisplay metrics={autoMetrics} compact />
          </Card>
        )}

        {/* Evaluation Form */}
        {Object.entries(
          formItems.reduce((acc, item, idx) => {
            const cat = item.category;
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push({ ...item, idx });
            return acc;
          }, {} as Record<string, (FormItem & { idx: number })[]>)
        ).map(([category, items]) => (
          <Card key={category} elevated>
            <h3 className="text-[15px] font-semibold text-[#86868b] uppercase tracking-wider mb-4">
              {CATEGORY_LABELS[category] || category}
            </h3>
            <div className="space-y-5">
              {items.map((item) => (
                <div key={`${item.template_id || item.goal_id}-${item.idx}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[14px] font-medium text-[#1d1d1f]">{item.name}</p>
                    <span className="text-[12px] text-[#86868b]">{item.weight}%</span>
                  </div>
                  {item.description && (
                    <p className="text-[13px] text-[#6e6e73] mb-2">{item.description}</p>
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
                  <input
                    type="text"
                    value={item.comment}
                    onChange={(e) => {
                      const updated = [...formItems];
                      updated[item.idx] = { ...formItems[item.idx], comment: e.target.value };
                      setFormItems(updated);
                    }}
                    placeholder="ความคิดเห็น (ไม่บังคับ)"
                    className="w-full mt-2 px-3 py-2 text-[14px] border border-[#d2d2d7] rounded-lg"
                  />
                </div>
              ))}
            </div>
          </Card>
        ))}

        {/* Comment */}
        <Card elevated>
          <Textarea
            label="ความคิดเห็นภาพรวม"
            value={overallComment}
            onChange={(e) => setOverallComment(e.target.value)}
            placeholder="สรุปผลงานของตัวเอง จุดเด่น สิ่งที่อยากพัฒนา..."
            rows={3}
          />
        </Card>

        {/* Score Preview */}
        <Card elevated>
          <div className="flex items-center gap-4 mb-3">
            <span className="text-[28px] font-bold text-[#1d1d1f]">{roundedScore.toFixed(2)}</span>
            <GradeBadge grade={grade} size="lg" showLabel />
          </div>
          <KPIRadarChart data={radarData} height={220} />
        </Card>

        {/* Actions */}
        <div className="flex gap-3 pb-4">
          <Button variant="secondary" onClick={() => handleSave(true)} fullWidth loading={saving}>
            บันทึกร่าง
          </Button>
          <Button onClick={() => handleSave(false)} fullWidth loading={saving}>
            ส่งการประเมิน
          </Button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

export default function SelfEvaluationPage() {
  return (
    <ProtectedRoute>
      <SelfEvaluationContent />
    </ProtectedRoute>
  );
}
