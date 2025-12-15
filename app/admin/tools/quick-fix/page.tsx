"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { CancelModal } from "@/components/ui/CancelModal";
import {
  AlertCircle,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  Edit,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { format, parseISO, differenceInHours } from "date-fns";
import { th } from "date-fns/locale";
import Link from "next/link";

interface Problem {
  id: string;
  type: "no_checkout" | "pending_ot_old" | "late_not_approved" | "early_checkout";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  employeeName: string;
  date: string;
  actionUrl?: string;
  canQuickFix: boolean;
  data: any;
}

const severityConfig = {
  high: { color: "text-[#ff3b30]", bgColor: "bg-[#ff3b30]/10", label: "สำคัญมาก" },
  medium: { color: "text-[#ff9500]", bgColor: "bg-[#ff9500]/10", label: "ปานกลาง" },
  low: { color: "text-[#0071e3]", bgColor: "bg-[#0071e3]/10", label: "ต่ำ" },
};

function QuickFixDashboardContent() {
  const { employee: currentAdmin } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);

  useEffect(() => {
    fetchProblems();
  }, []);

  const fetchProblems = async () => {
    setLoading(true);
    const foundProblems: Problem[] = [];
    const today = format(new Date(), "yyyy-MM-dd");

    try {
      // 1. หาพนักงานที่ยังไม่เช็คเอาท์
      const { data: noCheckout } = await supabase
        .from("attendance_logs")
        .select("*, employee:employees!employee_id(id, name, email)")
        .eq("work_date", today)
        .is("clock_out_time", null);

      noCheckout?.forEach((log: any) => {
        if (log.employee?.role !== "admin") {
          foundProblems.push({
            id: `no_checkout_${log.id}`,
            type: "no_checkout",
            severity: "high",
            title: "ยังไม่เช็คเอาท์",
            description: `เช็คอินเมื่อ ${format(parseISO(log.clock_in_time), "HH:mm น.")}`,
            employeeName: log.employee?.name || "ไม่ทราบชื่อ",
            date: log.work_date,
            actionUrl: `/admin/attendance/edit/${log.id}`,
            canQuickFix: true,
            data: log,
          });
        }
      });

      // 2. หา OT ที่ pending นานเกิน 24 ชม.
      const yesterday = format(new Date(Date.now() - 24 * 60 * 60 * 1000), "yyyy-MM-dd");
      const { data: oldOT } = await supabase
        .from("ot_requests")
        .select("*, employee:employees!employee_id(id, name, email)")
        .eq("status", "pending")
        .lte("request_date", yesterday);

      oldOT?.forEach((ot: any) => {
        foundProblems.push({
          id: `old_ot_${ot.id}`,
          type: "pending_ot_old",
          severity: "medium",
          title: "OT รอนานเกิน 24 ชม.",
          description: `ขอ OT วันที่ ${format(parseISO(ot.request_date), "d MMM", { locale: th })}`,
          employeeName: ot.employee?.name || "ไม่ทราบชื่อ",
          date: ot.request_date,
          actionUrl: `/admin/approvals?type=ot`,
          canQuickFix: true,
          data: ot,
        });
      });

      // 3. หาคนมาสายที่ยังไม่ได้ขออนุมัติ
      const { data: lateWithoutRequest } = await supabase
        .from("attendance_logs")
        .select(`
          *,
          employee:employees!employee_id(id, name, email),
          late_request:late_requests!employee_id(id)
        `)
        .eq("is_late", true)
        .gte("work_date", format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"));

      lateWithoutRequest?.forEach((log: any) => {
        if (!log.late_request && log.employee?.role !== "admin") {
          foundProblems.push({
            id: `late_no_request_${log.id}`,
            type: "late_not_approved",
            severity: "low",
            title: "มาสายแต่ไม่ขออนุมัติ",
            description: `สาย ${log.late_minutes} นาที`,
            employeeName: log.employee?.name || "ไม่ทราบชื่อ",
            date: log.work_date,
            canQuickFix: false,
            data: log,
          });
        }
      });

      setProblems(foundProblems);
    } catch (error) {
      console.error("Error fetching problems:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  // Quick fix for no checkout
  const quickFixCheckout = async (problem: Problem) => {
    if (!currentAdmin) return;

    const log = problem.data;
    const clockIn = parseISO(log.clock_in_time);
    const now = new Date();
    const totalHours = (now.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

    const { error } = await supabase
      .from("attendance_logs")
      .update({
        clock_out_time: now.toISOString(),
        total_hours: totalHours,
        edited_by: currentAdmin.id,
        edited_at: now.toISOString(),
        edit_reason: "Admin แก้ไข: ลืมเช็คเอาท์",
      })
      .eq("id", log.id);

    if (error) {
      toast.error("เกิดข้อผิดพลาด", error.message);
      return;
    }

    toast.success("แก้ไขสำเร็จ", "บันทึกเวลาเช็คเอาท์เรียบร้อย");
    fetchProblems();
  };

  // Quick approve OT
  const quickApproveOT = async (problem: Problem) => {
    if (!currentAdmin) return;

    const ot = problem.data;
    const start = parseISO(ot.requested_start_time);
    const end = parseISO(ot.requested_end_time);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    const { error } = await supabase
      .from("ot_requests")
      .update({
        status: "approved",
        approved_by: currentAdmin.id,
        approved_at: new Date().toISOString(),
        approved_start_time: ot.requested_start_time,
        approved_end_time: ot.requested_end_time,
        approved_ot_hours: hours,
      })
      .eq("id", ot.id);

    if (error) {
      toast.error("เกิดข้อผิดพลาด", error.message);
      return;
    }

    toast.success("อนุมัติสำเร็จ", "อนุมัติ OT เรียบร้อยแล้ว");
    fetchProblems();
  };

  if (loading) {
    return (
      <AdminLayout title="Quick Fix Dashboard">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  const highProblems = problems.filter(p => p.severity === "high");
  const mediumProblems = problems.filter(p => p.severity === "medium");
  const lowProblems = problems.filter(p => p.severity === "low");

  return (
    <AdminLayout 
      title="Quick Fix Dashboard" 
      description="ปัญหาที่ต้องแก้ไขด่วน"
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ff3b30]/10 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-[#ff3b30]" />
            </div>
            <div>
              <p className="text-[13px] text-[#86868b]">สำคัญมาก</p>
              <p className="text-[24px] font-semibold text-[#ff3b30]">{highProblems.length}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ff9500]/10 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-[#ff9500]" />
            </div>
            <div>
              <p className="text-[13px] text-[#86868b]">ปานกลาง</p>
              <p className="text-[24px] font-semibold text-[#ff9500]">{mediumProblems.length}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0071e3]/10 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-[#0071e3]" />
            </div>
            <div>
              <p className="text-[13px] text-[#86868b]">ต่ำ</p>
              <p className="text-[24px] font-semibold text-[#0071e3]">{lowProblems.length}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#34c759]/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#34c759]" />
            </div>
            <div>
              <p className="text-[13px] text-[#86868b]">ทั้งหมด</p>
              <p className="text-[24px] font-semibold text-[#1d1d1f]">{problems.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Refresh Button */}
      <div className="mb-6">
        <Button onClick={fetchProblems} variant="secondary" icon={<RefreshCw className="w-4 h-4" />}>
          รีเฟรชข้อมูล
        </Button>
      </div>

      {/* No Problems */}
      {problems.length === 0 && (
        <Card elevated className="text-center py-12">
          <div className="w-16 h-16 bg-[#34c759]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-[#34c759]" />
          </div>
          <h3 className="text-[20px] font-semibold text-[#1d1d1f] mb-2">
            ไม่มีปัญหาที่ต้องแก้ไข
          </h3>
          <p className="text-[15px] text-[#86868b]">
            ระบบทำงานปกติ ทุกอย่างเรียบร้อย ✨
          </p>
        </Card>
      )}

      {/* High Priority Problems */}
      {highProblems.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-[#ff3b30]" />
            <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
              ปัญหาสำคัญมาก ({highProblems.length})
            </h3>
          </div>
          <div className="space-y-3">
            {highProblems.map((problem) => (
              <ProblemCard
                key={problem.id}
                problem={problem}
                onQuickFix={quickFixCheckout}
                onRefresh={fetchProblems}
              />
            ))}
          </div>
        </div>
      )}

      {/* Medium Priority Problems */}
      {mediumProblems.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-[#ff9500]" />
            <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
              ปัญหาปานกลาง ({mediumProblems.length})
            </h3>
          </div>
          <div className="space-y-3">
            {mediumProblems.map((problem) => (
              <ProblemCard
                key={problem.id}
                problem={problem}
                onQuickFix={quickApproveOT}
                onRefresh={fetchProblems}
              />
            ))}
          </div>
        </div>
      )}

      {/* Low Priority Problems */}
      {lowProblems.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-[#0071e3]" />
            <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
              ปัญหาต่ำ ({lowProblems.length})
            </h3>
          </div>
          <div className="space-y-3">
            {lowProblems.map((problem) => (
              <ProblemCard
                key={problem.id}
                problem={problem}
                onQuickFix={() => {}}
                onRefresh={fetchProblems}
              />
            ))}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// Problem Card Component
function ProblemCard({ 
  problem, 
  onQuickFix, 
  onRefresh 
}: { 
  problem: Problem; 
  onQuickFix: (problem: Problem) => void;
  onRefresh: () => void;
}) {
  const config = severityConfig[problem.severity];
  
  return (
    <Card elevated className="hover:shadow-lg transition-all">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 ${config.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <AlertCircle className={`w-6 h-6 ${config.color}`} />
        </div>
        
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-[17px] font-semibold text-[#1d1d1f]">
                  {problem.title}
                </h4>
                <Badge 
                  variant={
                    problem.severity === "high" ? "danger" : 
                    problem.severity === "medium" ? "warning" : "default"
                  }
                >
                  {config.label}
                </Badge>
              </div>
              <p className="text-[14px] text-[#86868b]">{problem.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[13px] text-[#86868b] mb-4">
            <span>👤 {problem.employeeName}</span>
            <span>📅 {format(parseISO(problem.date), "d MMM yyyy", { locale: th })}</span>
          </div>

          <div className="flex gap-2">
            {problem.canQuickFix && (
              <Button
                size="sm"
                onClick={() => onQuickFix(problem)}
                icon={<CheckCircle className="w-4 h-4" />}
              >
                แก้ไขด่วน
              </Button>
            )}
            {problem.actionUrl && (
              <Link href={problem.actionUrl}>
                <Button variant="secondary" size="sm" icon={<Edit className="w-4 h-4" />}>
                  ดูรายละเอียด
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function QuickFixDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <QuickFixDashboardContent />
    </ProtectedRoute>
  );
}

