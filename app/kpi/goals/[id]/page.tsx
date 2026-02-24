"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft, Plus, Clock } from "lucide-react";
import { GoalCard } from "@/components/kpi/GoalCard";
import type { KPIGoal, GoalProgress } from "@/lib/services/kpi.service";
import { format } from "date-fns";
import { th } from "date-fns/locale";

function GoalDetailContent() {
  const { id } = useParams();
  const router = useRouter();
  const { employee } = useAuth();
  const toast = useToast();
  const [goal, setGoal] = useState<KPIGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progressForm, setProgressForm] = useState({
    progress_value: "",
    progress_percent: "",
    note: "",
  });

  useEffect(() => {
    fetchGoal();
  }, [id]);

  const fetchGoal = async () => {
    try {
      const { data } = await supabase
        .from("kpi_goals")
        .select("*, kpi_goal_progress(*)")
        .eq("id", id)
        .single();
      setGoal(data as KPIGoal | null);
    } catch {
      toast.error("เกิดข้อผิดพลาด", "ไม่พบเป้าหมาย");
    } finally {
      setLoading(false);
    }
  };

  const handleAddProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("kpi_goal_progress").insert({
        goal_id: id,
        progress_value: progressForm.progress_value || null,
        progress_percent: parseFloat(progressForm.progress_percent) || 0,
        note: progressForm.note || null,
        created_by: employee.id,
      });

      if (error) throw error;

      const percent = parseFloat(progressForm.progress_percent) || 0;
      const newStatus = percent >= 100 ? "completed" : "in_progress";
      await supabase
        .from("kpi_goals")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id);

      toast.success("สำเร็จ", "อัพเดทความคืบหน้าเรียบร้อย");
      setShowProgressForm(false);
      setProgressForm({ progress_value: "", progress_percent: "", note: "" });
      fetchGoal();
    } catch {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถอัพเดทได้");
    } finally {
      setSaving(false);
    }
  };

  const progressList = (goal?.kpi_goal_progress || []).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const canUpdate = goal && ["approved", "in_progress"].includes(goal.status) && goal.employee_id === employee?.id;

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

  if (!goal) {
    return (
      <div className="min-h-screen bg-[#f5f5f7]">
        <div className="text-center py-20">
          <p className="text-[17px] text-[#86868b]">ไม่พบเป้าหมาย</p>
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
            <button onClick={() => router.push("/kpi/goals")} className="p-1">
              <ArrowLeft className="w-5 h-5 text-[#1d1d1f]" />
            </button>
            <h1 className="text-[20px] font-bold text-[#1d1d1f]">รายละเอียดเป้าหมาย</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <GoalCard goal={goal} />

        {goal.rejection_reason && (
          <Card elevated>
            <p className="text-[14px] font-medium text-[#ff3b30] mb-1">เหตุผลที่ปฏิเสธ:</p>
            <p className="text-[14px] text-[#6e6e73]">{goal.rejection_reason}</p>
          </Card>
        )}

        {canUpdate && (
          <Button fullWidth onClick={() => setShowProgressForm(true)}>
            <Plus className="w-4 h-4" /> อัพเดทความคืบหน้า
          </Button>
        )}

        <Modal
          isOpen={showProgressForm}
          onClose={() => setShowProgressForm(false)}
          title="อัพเดทความคืบหน้า"
          size="sm"
        >
          <form onSubmit={handleAddProgress} className="space-y-4">
            <Input
              label="ค่าปัจจุบัน"
              value={progressForm.progress_value}
              onChange={(e) => setProgressForm({ ...progressForm, progress_value: e.target.value })}
              placeholder={`เช่น 75 ${goal.target_unit || ""}`}
            />
            <Input
              label="เปอร์เซ็นต์ที่สำเร็จ (%)"
              type="number"
              min="0"
              max="100"
              value={progressForm.progress_percent}
              onChange={(e) => setProgressForm({ ...progressForm, progress_percent: e.target.value })}
              required
            />
            <Textarea
              label="บันทึก"
              value={progressForm.note}
              onChange={(e) => setProgressForm({ ...progressForm, note: e.target.value })}
              placeholder="สิ่งที่ทำ ผลที่ได้ อุปสรรค..."
            />
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowProgressForm(false)} fullWidth>
                ยกเลิก
              </Button>
              <Button type="submit" fullWidth loading={saving}>
                บันทึก
              </Button>
            </div>
          </form>
        </Modal>

        {/* Progress Timeline */}
        {progressList.length > 0 && (
          <Card elevated>
            <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">ประวัติความคืบหน้า</h3>
            <div className="space-y-4">
              {progressList.map((progress, idx) => (
                <div key={progress.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 bg-[#0071e3]/10 rounded-full flex items-center justify-center">
                      <Clock className="w-4 h-4 text-[#0071e3]" />
                    </div>
                    {idx < progressList.length - 1 && (
                      <div className="w-0.5 flex-1 bg-[#e8e8ed] mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[14px] font-semibold text-[#0071e3]">
                        {Number(progress.progress_percent)}%
                      </span>
                      {progress.progress_value && (
                        <span className="text-[13px] text-[#86868b]">
                          ({progress.progress_value} {goal.target_unit})
                        </span>
                      )}
                    </div>
                    {progress.note && (
                      <p className="text-[14px] text-[#6e6e73] mb-1">{progress.note}</p>
                    )}
                    <p className="text-[12px] text-[#86868b]">
                      {format(new Date(progress.created_at), "d MMM yyyy HH:mm", { locale: th })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

export default function GoalDetailPage() {
  return (
    <ProtectedRoute>
      <GoalDetailContent />
    </ProtectedRoute>
  );
}
