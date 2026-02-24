"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase/client";
import type { KPITemplate } from "@/lib/services/kpi.service";

interface TemplateWeight {
  template_id: string;
  weight: number;
  selected: boolean;
}

function CreatePeriodContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<KPITemplate[]>([]);
  const [templateWeights, setTemplateWeights] = useState<TemplateWeight[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    goal_deadline: "",
    self_eval_start: "",
    self_eval_end: "",
    supervisor_eval_end: "",
  });

  useEffect(() => {
    fetchTemplates();
    if (editId) fetchPeriod(editId);
  }, [editId]);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from("kpi_templates")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    setTemplates(data || []);

    if (!editId) {
      setTemplateWeights(
        (data || []).map((t: KPITemplate) => ({
          template_id: t.id,
          weight: Number(t.default_weight) || 0,
          selected: true,
        }))
      );
    }
  };

  const fetchPeriod = async (id: string) => {
    const { data: period } = await supabase
      .from("kpi_periods")
      .select("*")
      .eq("id", id)
      .single();

    if (period) {
      setForm({
        name: period.name,
        description: period.description || "",
        start_date: period.start_date,
        end_date: period.end_date,
        goal_deadline: period.goal_deadline || "",
        self_eval_start: period.self_eval_start || "",
        self_eval_end: period.self_eval_end || "",
        supervisor_eval_end: period.supervisor_eval_end || "",
      });

      const { data: ptData } = await supabase
        .from("kpi_period_templates")
        .select("template_id, weight")
        .eq("period_id", id);

      const { data: allTemplates } = await supabase
        .from("kpi_templates")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      setTemplates(allTemplates || []);
      setTemplateWeights(
        (allTemplates || []).map((t: KPITemplate) => {
          const existing = (ptData || []).find((p: { template_id: string }) => p.template_id === t.id);
          return {
            template_id: t.id,
            weight: existing ? Number(existing.weight) : Number(t.default_weight) || 0,
            selected: !!existing,
          };
        })
      );
    }
  };

  const totalWeight = templateWeights
    .filter((tw) => tw.selected)
    .reduce((sum, tw) => sum + tw.weight, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedTemplates = templateWeights.filter((tw) => tw.selected);

    if (selectedTemplates.length === 0) {
      toast.error("ข้อผิดพลาด", "กรุณาเลือกเกณฑ์ KPI อย่างน้อย 1 รายการ");
      return;
    }

    if (Math.abs(totalWeight - 100) > 0.01) {
      toast.error("ข้อผิดพลาด", `น้ำหนักรวมต้องเท่ากับ 100% (ตอนนี้ ${totalWeight}%)`);
      return;
    }

    setSaving(true);
    try {
      const periodData = {
        ...form,
        goal_deadline: form.goal_deadline || null,
        self_eval_start: form.self_eval_start || null,
        self_eval_end: form.self_eval_end || null,
        supervisor_eval_end: form.supervisor_eval_end || null,
      };

      if (editId) {
        const { error } = await supabase
          .from("kpi_periods")
          .update({ ...periodData, updated_at: new Date().toISOString() })
          .eq("id", editId);
        if (error) throw error;

        await supabase.from("kpi_period_templates").delete().eq("period_id", editId);
        const templateRows = selectedTemplates.map((t) => ({
          period_id: editId,
          template_id: t.template_id,
          weight: t.weight,
        }));
        const { error: tmplErr } = await supabase.from("kpi_period_templates").insert(templateRows);
        if (tmplErr) throw tmplErr;

        toast.success("สำเร็จ", "แก้ไขรอบประเมินเรียบร้อย");
      } else {
        const { data: period, error } = await supabase
          .from("kpi_periods")
          .insert(periodData)
          .select()
          .single();
        if (error) throw error;

        const templateRows = selectedTemplates.map((t) => ({
          period_id: period.id,
          template_id: t.template_id,
          weight: t.weight,
        }));
        const { error: tmplErr } = await supabase.from("kpi_period_templates").insert(templateRows);
        if (tmplErr) throw tmplErr;

        toast.success("สำเร็จ", "สร้างรอบประเมินเรียบร้อย");
      }

      router.push("/admin/kpi/periods");
    } catch {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกได้");
    } finally {
      setSaving(false);
    }
  };

  const CATEGORY_LABELS: Record<string, string> = {
    attendance: "การมาทำงาน",
    work_quality: "คุณภาพงาน",
    goals: "เป้าหมาย",
    competency: "สมรรถนะ",
  };

  return (
    <AdminLayout
      title={editId ? "แก้ไขรอบประเมิน" : "สร้างรอบประเมินใหม่"}
      description="กำหนดช่วงเวลาและเกณฑ์การประเมิน"
    >
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {/* Basic Info */}
        <Card elevated>
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">ข้อมูลรอบประเมิน</h3>
          <div className="space-y-4">
            <Input
              label="ชื่อรอบประเมิน"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="เช่น Q1/2026, ประจำเดือน ม.ค. 2026"
              required
            />
            <Textarea
              label="คำอธิบาย (ไม่บังคับ)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="รายละเอียดเพิ่มเติมของรอบประเมินนี้"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="วันเริ่มต้น"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                required
              />
              <Input
                label="วันสิ้นสุด"
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                required
              />
            </div>
          </div>
        </Card>

        {/* Timeline */}
        <Card elevated>
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">ช่วงเวลา</h3>
          <div className="space-y-4">
            <Input
              label="วันสุดท้ายตั้งเป้าหมาย"
              type="date"
              value={form.goal_deadline}
              onChange={(e) => setForm({ ...form, goal_deadline: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="เริ่มประเมินตนเอง"
                type="date"
                value={form.self_eval_start}
                onChange={(e) => setForm({ ...form, self_eval_start: e.target.value })}
              />
              <Input
                label="สิ้นสุดประเมินตนเอง"
                type="date"
                value={form.self_eval_end}
                onChange={(e) => setForm({ ...form, self_eval_end: e.target.value })}
              />
            </div>
            <Input
              label="วันสุดท้ายหัวหน้าประเมิน"
              type="date"
              value={form.supervisor_eval_end}
              onChange={(e) => setForm({ ...form, supervisor_eval_end: e.target.value })}
            />
          </div>
        </Card>

        {/* Templates & Weights */}
        <Card elevated>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[17px] font-semibold text-[#1d1d1f]">เกณฑ์ KPI และน้ำหนัก</h3>
            <span className={`text-[14px] font-semibold ${Math.abs(totalWeight - 100) < 0.01 ? "text-[#30d158]" : "text-[#ff3b30]"}`}>
              รวม: {totalWeight}%
            </span>
          </div>
          <div className="space-y-3">
            {templates.map((tmpl, idx) => {
              const tw = templateWeights[idx];
              if (!tw) return null;
              return (
                <div key={tmpl.id} className="flex items-center gap-3 p-3 bg-[#f5f5f7] rounded-xl">
                  <input
                    type="checkbox"
                    checked={tw.selected}
                    onChange={(e) => {
                      const updated = [...templateWeights];
                      updated[idx] = { ...tw, selected: e.target.checked };
                      setTemplateWeights(updated);
                    }}
                    className="w-5 h-5 rounded accent-[#0071e3]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[#1d1d1f]">{tmpl.name}</p>
                    <p className="text-[12px] text-[#86868b]">
                      {CATEGORY_LABELS[tmpl.category]} / {tmpl.evaluation_type === "auto" ? "อัตโนมัติ" : tmpl.evaluation_type === "goal_based" ? "เป้าหมาย" : "ประเมินด้วยมือ"}
                    </p>
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={tw.weight}
                      onChange={(e) => {
                        const updated = [...templateWeights];
                        updated[idx] = { ...tw, weight: parseFloat(e.target.value) || 0 };
                        setTemplateWeights(updated);
                      }}
                      disabled={!tw.selected}
                      className="w-full text-center text-[14px] font-medium py-1.5 border border-[#d2d2d7] rounded-lg disabled:opacity-50"
                    />
                  </div>
                  <span className="text-[14px] text-[#86868b]">%</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/admin/kpi/periods")}
            fullWidth
          >
            ยกเลิก
          </Button>
          <Button type="submit" fullWidth loading={saving}>
            {editId ? "บันทึกการแก้ไข" : "สร้างรอบประเมิน"}
          </Button>
        </div>
      </form>
    </AdminLayout>
  );
}

export default function CreatePeriodPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <CreatePeriodContent />
    </ProtectedRoute>
  );
}
