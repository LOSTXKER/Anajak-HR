"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase/client";
import { GoalCard } from "@/components/kpi/GoalCard";
import { Target, CheckCircle2, XCircle } from "lucide-react";
import type { KPIGoal } from "@/lib/services/kpi.service";

function GoalApprovalContent() {
  const toast = useToast();
  const [goals, setGoals] = useState<KPIGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; goalId: string }>({ open: false, goalId: "" });
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("kpi_goals")
        .select("*, employees_kpi_goals_employee_idToemployees:employees!kpi_goals_employee_idToemployees(name)")
        .eq("status", "pending_approval")
        .order("created_at");
      setGoals((data || []) as KPIGoal[]);
    } catch {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (goalId: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("kpi_goals")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", goalId);
      if (error) throw error;
      toast.success("สำเร็จ", "อนุมัติเป้าหมายเรียบร้อย");
      fetchGoals();
    } catch {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถอนุมัติได้");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("ข้อผิดพลาด", "กรุณาระบุเหตุผลในการปฏิเสธ");
      return;
    }
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("kpi_goals")
        .update({
          status: "rejected",
          rejection_reason: rejectReason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", rejectModal.goalId);
      if (error) throw error;
      toast.success("สำเร็จ", "ปฏิเสธเป้าหมายเรียบร้อย");
      setRejectModal({ open: false, goalId: "" });
      setRejectReason("");
      fetchGoals();
    } catch {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถปฏิเสธได้");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AdminLayout title="อนุมัติเป้าหมาย" description="ตรวจสอบและอนุมัติเป้าหมายของพนักงาน">
      <Modal
        isOpen={rejectModal.open}
        onClose={() => { setRejectModal({ open: false, goalId: "" }); setRejectReason(""); }}
        title="ปฏิเสธเป้าหมาย"
        size="sm"
      >
        <div className="space-y-4">
          <Textarea
            label="เหตุผลในการปฏิเสธ"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="ระบุเหตุผล..."
            required
          />
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setRejectModal({ open: false, goalId: "" }); setRejectReason(""); }}
              fullWidth
            >
              ยกเลิก
            </Button>
            <Button type="button" variant="danger" onClick={handleReject} fullWidth loading={processing}>
              ปฏิเสธ
            </Button>
          </div>
        </div>
      </Modal>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : goals.length === 0 ? (
        <Card elevated>
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-[#30d158]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-[#30d158]" />
            </div>
            <p className="text-[17px] text-[#1d1d1f] font-medium">ไม่มีเป้าหมายที่รออนุมัติ</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => (
            <div key={goal.id} className="bg-white rounded-2xl border border-[#e8e8ed] p-4">
              <GoalCard goal={goal} showEmployee />
              <div className="flex gap-2 mt-4 pt-4 border-t border-[#f5f5f7]">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setRejectModal({ open: true, goalId: goal.id })}
                  disabled={processing}
                >
                  <XCircle className="w-4 h-4" /> ปฏิเสธ
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApprove(goal.id)}
                  loading={processing}
                >
                  <CheckCircle2 className="w-4 h-4" /> อนุมัติ
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

export default function GoalApprovalPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <GoalApprovalContent />
    </ProtectedRoute>
  );
}
