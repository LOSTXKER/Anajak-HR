"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { GradeBadge } from "@/components/kpi/GradeBadge";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { Users, ChevronRight, CheckCircle2, Clock, FileEdit } from "lucide-react";

interface EmployeeEvalStatus {
  id: string;
  name: string;
  branch_name: string | null;
  self_eval_status: string | null;
  supervisor_eval_status: string | null;
  supervisor_score: number | null;
  supervisor_grade: string | null;
}

function EvaluationsContent() {
  const [employees, setEmployees] = useState<EmployeeEvalStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePeriodId, setActivePeriodId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: periods } = await supabase
        .from("kpi_periods")
        .select("id")
        .in("status", ["evaluating", "in_progress", "goal_setting"])
        .order("start_date", { ascending: false })
        .limit(1);

      const periodId = periods?.[0]?.id;
      setActivePeriodId(periodId || null);

      if (!periodId) {
        setLoading(false);
        return;
      }

      const { data: emps } = await supabase
        .from("employees")
        .select("id, name, branch_id, branches(name)")
        .eq("account_status", "approved")
        .is("deleted_at", null)
        .eq("is_system_account", false)
        .order("name");

      const empIds = (emps || []).map((e: { id: string }) => e.id);

      const { data: evals } = await supabase
        .from("kpi_evaluations")
        .select("employee_id, evaluation_type, status, overall_score, overall_grade")
        .eq("period_id", periodId)
        .in("employee_id", empIds);

      const result: EmployeeEvalStatus[] = (emps || []).map((emp: any) => {
        const selfEval = (evals || []).find(
          (e: any) => e.employee_id === emp.id && e.evaluation_type === "self"
        );
        const supEval = (evals || []).find(
          (e: any) => e.employee_id === emp.id && e.evaluation_type === "supervisor"
        );

        return {
          id: emp.id,
          name: emp.name,
          branch_name: emp.branches?.name || null,
          self_eval_status: selfEval?.status || null,
          supervisor_eval_status: supEval?.status || null,
          supervisor_score: supEval?.overall_score || null,
          supervisor_grade: supEval?.overall_grade || null,
        };
      });

      setEmployees(result);
    } catch (error) {
      console.error("Error fetching evaluation data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = employees.filter((emp) => {
    if (filter === "pending") return !emp.supervisor_eval_status;
    if (filter === "draft") return emp.supervisor_eval_status === "draft";
    if (filter === "done") return emp.supervisor_eval_status === "submitted";
    return true;
  });

  const getStatusIcon = (status: string | null) => {
    if (!status) return <Clock className="w-4 h-4 text-[#86868b]" />;
    if (status === "draft") return <FileEdit className="w-4 h-4 text-[#ff9f0a]" />;
    return <CheckCircle2 className="w-4 h-4 text-[#30d158]" />;
  };

  return (
    <AdminLayout title="ประเมินพนักงาน" description="ประเมินผลงานสมาชิกในทีม">
      {/* Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { key: "all", label: "ทั้งหมด" },
          { key: "pending", label: "ยังไม่ประเมิน" },
          { key: "draft", label: "ร่าง" },
          { key: "done", label: "ส่งแล้ว" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-[14px] font-medium whitespace-nowrap transition-colors ${
              filter === f.key
                ? "bg-[#0071e3] text-white"
                : "bg-[#f5f5f7] text-[#6e6e73] hover:bg-[#e8e8ed]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !activePeriodId ? (
        <Card elevated>
          <div className="text-center py-16">
            <p className="text-[17px] text-[#86868b]">ไม่มีรอบประเมินที่เปิดอยู่</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((emp) => (
            <Card key={emp.id} elevated>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#0071e3]/10 rounded-full flex items-center justify-center">
                    <span className="text-[14px] font-bold text-[#0071e3]">
                      {emp.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#1d1d1f]">{emp.name}</h3>
                    {emp.branch_name && (
                      <p className="text-[13px] text-[#86868b]">{emp.branch_name}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-3 text-[13px]">
                    <div className="flex items-center gap-1">
                      {getStatusIcon(emp.self_eval_status)}
                      <span className="text-[#86868b]">ตนเอง</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(emp.supervisor_eval_status)}
                      <span className="text-[#86868b]">หัวหน้า</span>
                    </div>
                    {emp.supervisor_grade && (
                      <GradeBadge grade={emp.supervisor_grade} size="sm" />
                    )}
                  </div>
                  <Link href={`/admin/kpi/evaluations/${emp.id}?period=${activePeriodId}`}>
                    <Button variant="secondary" size="sm">
                      ประเมิน <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && (
            <Card elevated>
              <div className="text-center py-12">
                <p className="text-[14px] text-[#86868b]">ไม่พบข้อมูลที่ตรงกับตัวกรอง</p>
              </div>
            </Card>
          )}
        </div>
      )}
    </AdminLayout>
  );
}

export default function EvaluationsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <EvaluationsContent />
    </ProtectedRoute>
  );
}
