"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";

function CreateGoalContent() {
  const { employee } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [activePeriodId, setActivePeriodId] = useState<string | null>(null);
  const [existingTotalWeight, setExistingTotalWeight] = useState(0);
  const [form, setForm] = useState({
    title: "",
    description: "",
    target_value: "",
    target_unit: "",
    weight: "10",
  });

  useEffect(() => {
    if (employee?.id) fetchPeriod();
  }, [employee?.id]);

  const fetchPeriod = async () => {
    const { data: periods } = await supabase
      .from("kpi_periods")
      .select("id")
      .eq("status", "goal_setting")
      .order("start_date", { ascending: false })
      .limit(1);

    const periodId = periods?.[0]?.id;
    if (!periodId) {
      toast.error("ไม่สามารถตั้งเป้าหมายได้", "ไม่มีรอบประเมินที่เปิดรับเป้าหมาย");
      router.push("/kpi/goals");
      return;
    }

    setActivePeriodId(periodId);

    const { data: goals } = await supabase
      .from("kpi_goals")
      .select("weight")
      .eq("employee_id", employee!.id)
      .eq("period_id", periodId)
      .neq("status", "rejected");

    const totalWeight = (goals || []).reduce(
      (sum: number, g: { weight: number }) => sum + Number(g.weight),
      0
    );
    setExistingTotalWeight(totalWeight);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePeriodId || !employee) return;

    const weight = parseFloat(form.weight);
    if (existingTotalWeight + weight > 100) {
      toast.error("ข้อผิดพลาด", `น้ำหนักรวมเกิน 100% (ปัจจุบัน ${existingTotalWeight}% + ${weight}%)`);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("kpi_goals").insert({
        employee_id: employee.id,
        period_id: activePeriodId,
        title: form.title,
        description: form.description || null,
        target_value: form.target_value || null,
        target_unit: form.target_unit || null,
        weight: weight,
      });

      if (error) throw error;

      toast.success("สำเร็จ", "ตั้งเป้าหมายเรียบร้อย รอหัวหน้าอนุมัติ");
      router.push("/kpi/goals");
    } catch {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกได้");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] pb-24">
      <div className="bg-white border-b border-[#e8e8ed]">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/kpi/goals")} className="p-1">
              <ArrowLeft className="w-5 h-5 text-[#1d1d1f]" />
            </button>
            <h1 className="text-[20px] font-bold text-[#1d1d1f]">ตั้งเป้าหมายใหม่</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card elevated>
            <div className="space-y-4">
              <Input
                label="ชื่อเป้าหมาย"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="เช่น เพิ่มยอดขาย, เรียนรู้ทักษะใหม่"
                required
              />
              <Textarea
                label="รายละเอียด"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="อธิบายเป้าหมายโดยละเอียด วิธีการ ผลลัพธ์ที่คาดหวัง"
                rows={3}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="เป้า (ตัวเลข/ข้อความ)"
                  value={form.target_value}
                  onChange={(e) => setForm({ ...form, target_value: e.target.value })}
                  placeholder="เช่น 100, 5"
                />
                <Input
                  label="หน่วย"
                  value={form.target_unit}
                  onChange={(e) => setForm({ ...form, target_unit: e.target.value })}
                  placeholder="เช่น %, ชิ้น, ครั้ง"
                />
              </div>
              <div>
                <Input
                  label="น้ำหนัก (%)"
                  type="number"
                  min="1"
                  max="100"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  required
                />
                <p className="text-[13px] text-[#86868b] mt-1">
                  น้ำหนักที่ใช้ไปแล้ว: {existingTotalWeight}% | เหลือ: {100 - existingTotalWeight}%
                </p>
              </div>
            </div>
          </Card>

          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => router.push("/kpi/goals")} fullWidth>
              ยกเลิก
            </Button>
            <Button type="submit" fullWidth loading={saving}>
              ส่งเป้าหมาย
            </Button>
          </div>
        </form>
      </div>
      <BottomNav />
    </div>
  );
}

export default function CreateGoalPage() {
  return (
    <ProtectedRoute>
      <CreateGoalContent />
    </ProtectedRoute>
  );
}
