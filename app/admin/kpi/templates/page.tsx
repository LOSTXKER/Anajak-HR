"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase/client";
import { Plus, Edit2, Trash2, ClipboardCheck } from "lucide-react";
import type { KPITemplate } from "@/lib/services/kpi.service";

const CATEGORY_OPTIONS = [
  { value: "attendance", label: "การมาทำงาน (Attendance)" },
  { value: "work_quality", label: "คุณภาพงาน (Work Quality)" },
  { value: "goals", label: "เป้าหมาย (Goals)" },
  { value: "competency", label: "สมรรถนะ (Competency)" },
];

const EVAL_TYPE_OPTIONS = [
  { value: "auto", label: "อัตโนมัติ (คำนวณจากข้อมูลระบบ)" },
  { value: "manual", label: "ประเมินด้วยมือ (หัวหน้า/ตนเอง)" },
  { value: "goal_based", label: "ตามเป้าหมาย (Goal-based)" },
];

function TemplatesContent() {
  const toast = useToast();
  const [templates, setTemplates] = useState<KPITemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: "", name: "" });
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "work_quality",
    evaluation_type: "manual",
    default_weight: "10",
    score_min: "1",
    score_max: "5",
    sort_order: "0",
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("kpi_templates")
      .select("*")
      .order("sort_order");
    if (!error) setTemplates(data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({
      name: "",
      description: "",
      category: "work_quality",
      evaluation_type: "manual",
      default_weight: "10",
      score_min: "1",
      score_max: "5",
      sort_order: "0",
    });
  };

  const handleEdit = (t: KPITemplate) => {
    setForm({
      name: t.name,
      description: t.description || "",
      category: t.category,
      evaluation_type: t.evaluation_type,
      default_weight: String(t.default_weight),
      score_min: String(t.score_min),
      score_max: String(t.score_max),
      sort_order: String(t.sort_order),
    });
    setEditingId(t.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        name: form.name,
        description: form.description || null,
        category: form.category,
        evaluation_type: form.evaluation_type,
        default_weight: parseFloat(form.default_weight),
        score_min: parseInt(form.score_min),
        score_max: parseInt(form.score_max),
        sort_order: parseInt(form.sort_order),
      };

      if (editingId) {
        const { error } = await supabase
          .from("kpi_templates")
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq("id", editingId);
        if (error) throw error;
        toast.success("สำเร็จ", "แก้ไข template เรียบร้อย");
      } else {
        const { error } = await supabase.from("kpi_templates").insert(data);
        if (error) throw error;
        toast.success("สำเร็จ", "เพิ่ม template เรียบร้อย");
      }

      resetForm();
      fetchTemplates();
    } catch {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกได้");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from("kpi_templates").delete().eq("id", deleteConfirm.id);
      if (error) throw error;
      toast.success("สำเร็จ", "ลบ template เรียบร้อย");
      setDeleteConfirm({ open: false, id: "", name: "" });
      fetchTemplates();
    } catch {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถลบได้");
    }
  };

  const CATEGORY_LABELS: Record<string, string> = {
    attendance: "การมาทำงาน",
    work_quality: "คุณภาพงาน",
    goals: "เป้าหมาย",
    competency: "สมรรถนะ",
  };

  return (
    <AdminLayout title="เกณฑ์ KPI" description="จัดการ template เกณฑ์การประเมิน">
      <div className="flex justify-end mb-6">
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-5 h-5" /> เพิ่มเกณฑ์
        </Button>
      </div>

      <Modal isOpen={showForm} onClose={resetForm} title={editingId ? "แก้ไขเกณฑ์ KPI" : "เพิ่มเกณฑ์ KPI"} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="ชื่อเกณฑ์"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="เช่น คุณภาพงาน, ความรับผิดชอบ"
            required
          />
          <Textarea
            label="คำอธิบาย"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1.5">หมวดหมู่</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2.5 border border-[#d2d2d7] rounded-xl text-[14px]"
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1.5">ประเภทการประเมิน</label>
              <select
                value={form.evaluation_type}
                onChange={(e) => setForm({ ...form, evaluation_type: e.target.value })}
                className="w-full px-3 py-2.5 border border-[#d2d2d7] rounded-xl text-[14px]"
              >
                {EVAL_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="น้ำหนัก default (%)"
              type="number"
              value={form.default_weight}
              onChange={(e) => setForm({ ...form, default_weight: e.target.value })}
            />
            <Input
              label="คะแนนต่ำสุด"
              type="number"
              value={form.score_min}
              onChange={(e) => setForm({ ...form, score_min: e.target.value })}
            />
            <Input
              label="คะแนนสูงสุด"
              type="number"
              value={form.score_max}
              onChange={(e) => setForm({ ...form, score_max: e.target.value })}
            />
          </div>
          <Input
            label="ลำดับการแสดง"
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
          />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={resetForm} fullWidth>ยกเลิก</Button>
            <Button type="submit" fullWidth loading={saving}>{editingId ? "บันทึก" : "เพิ่ม"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: "", name: "" })}
        onConfirm={handleDelete}
        title="ยืนยันการลบ"
        message={`ต้องการลบเกณฑ์ "${deleteConfirm.name}" ใช่หรือไม่?`}
        type="danger"
        confirmText="ลบ"
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((tmpl) => (
            <Card key={tmpl.id} elevated>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#0071e3]/10 rounded-xl flex items-center justify-center">
                    <ClipboardCheck className="w-5 h-5 text-[#0071e3]" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#1d1d1f]">{tmpl.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[12px] text-[#86868b] bg-[#f5f5f7] px-2 py-0.5 rounded">
                        {CATEGORY_LABELS[tmpl.category]}
                      </span>
                      <span className="text-[12px] text-[#86868b]">
                        {tmpl.evaluation_type === "auto" ? "อัตโนมัติ" : tmpl.evaluation_type === "goal_based" ? "เป้าหมาย" : "ด้วยมือ"}
                      </span>
                      <span className="text-[12px] text-[#86868b]">
                        {Number(tmpl.default_weight)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(tmpl)} className="p-2 text-[#86868b] hover:text-[#0071e3] hover:bg-[#f5f5f7] rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteConfirm({ open: true, id: tmpl.id, name: tmpl.name })} className="p-2 text-[#86868b] hover:text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

export default function TemplatesPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <TemplatesContent />
    </ProtectedRoute>
  );
}
