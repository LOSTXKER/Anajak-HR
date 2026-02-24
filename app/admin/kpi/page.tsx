"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { GradeBadge } from "@/components/kpi/GradeBadge";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Target,
  Calendar,
  Users,
  ClipboardCheck,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Plus,
  Play,
  Calculator,
} from "lucide-react";
import type { KPIPeriod } from "@/lib/services/kpi.service";

function KPIDashboardContent() {
  const [activePeriod, setActivePeriod] = useState<KPIPeriod | null>(null);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    goalsSet: 0,
    goalsPending: 0,
    selfEvalDone: 0,
    supervisorEvalDone: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: periods } = await supabase
        .from("kpi_periods")
        .select("*")
        .neq("status", "closed")
        .neq("status", "draft")
        .order("start_date", { ascending: false })
        .limit(1);

      const period = periods?.[0] || null;
      setActivePeriod(period);

      if (period) {
        const [empResult, goalsResult, pendingGoals, selfEvals, supEvals] = await Promise.all([
          supabase
            .from("employees")
            .select("id", { count: "exact", head: true })
            .eq("account_status", "approved")
            .is("deleted_at", null)
            .eq("is_system_account", false),
          supabase
            .from("kpi_goals")
            .select("employee_id", { count: "exact", head: true })
            .eq("period_id", period.id),
          supabase
            .from("kpi_goals")
            .select("id", { count: "exact", head: true })
            .eq("period_id", period.id)
            .eq("status", "pending_approval"),
          supabase
            .from("kpi_evaluations")
            .select("id", { count: "exact", head: true })
            .eq("period_id", period.id)
            .eq("evaluation_type", "self")
            .eq("status", "submitted"),
          supabase
            .from("kpi_evaluations")
            .select("id", { count: "exact", head: true })
            .eq("period_id", period.id)
            .eq("evaluation_type", "supervisor")
            .eq("status", "submitted"),
        ]);

        setStats({
          totalEmployees: empResult.count || 0,
          goalsSet: goalsResult.count || 0,
          goalsPending: pendingGoals.count || 0,
          selfEvalDone: selfEvals.count || 0,
          supervisorEvalDone: supEvals.count || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching KPI dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    draft: { label: "แบบร่าง", color: "#86868b" },
    goal_setting: { label: "ตั้งเป้าหมาย", color: "#ff9f0a" },
    in_progress: { label: "กำลังดำเนินการ", color: "#007aff" },
    evaluating: { label: "ช่วงประเมิน", color: "#bf5af2" },
    closed: { label: "ปิดแล้ว", color: "#30d158" },
  };

  if (loading) {
    return (
      <AdminLayout title="KPI พนักงาน" description="จัดการระบบประเมินผลงาน">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="KPI พนักงาน" description="จัดการระบบประเมินผลงาน">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Link href="/admin/kpi/periods">
          <Button variant="secondary" size="sm">
            <Calendar className="w-4 h-4" /> รอบประเมิน
          </Button>
        </Link>
        <Link href="/admin/kpi/templates">
          <Button variant="secondary" size="sm">
            <ClipboardCheck className="w-4 h-4" /> เกณฑ์ KPI
          </Button>
        </Link>
        <Link href="/admin/kpi/goals">
          <Button variant="secondary" size="sm">
            <Target className="w-4 h-4" />
            อนุมัติเป้าหมาย
            {stats.goalsPending > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-[#ff3b30] text-white text-[10px] font-bold rounded-full">
                {stats.goalsPending}
              </span>
            )}
          </Button>
        </Link>
        <Link href="/admin/kpi/evaluations">
          <Button variant="secondary" size="sm">
            <Users className="w-4 h-4" /> ประเมินทีม
          </Button>
        </Link>
        <Link href="/admin/kpi/reports">
          <Button variant="secondary" size="sm">
            <BarChart3 className="w-4 h-4" /> รายงาน
          </Button>
        </Link>
      </div>

      {/* Active Period */}
      {activePeriod ? (
        <Card elevated className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-[20px] font-bold text-[#1d1d1f]">{activePeriod.name}</h2>
                <span
                  className="text-[12px] font-medium px-2 py-0.5 rounded-lg"
                  style={{
                    backgroundColor: `${STATUS_LABELS[activePeriod.status]?.color}15`,
                    color: STATUS_LABELS[activePeriod.status]?.color,
                  }}
                >
                  {STATUS_LABELS[activePeriod.status]?.label}
                </span>
              </div>
              <p className="text-[14px] text-[#86868b]">
                {activePeriod.start_date} - {activePeriod.end_date}
              </p>
            </div>
            <Link href={`/admin/kpi/periods`}>
              <Button variant="secondary" size="sm">
                จัดการ <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#f5f5f7] rounded-xl p-4">
              <p className="text-[12px] text-[#86868b] mb-1">พนักงาน</p>
              <p className="text-[24px] font-bold text-[#1d1d1f]">{stats.totalEmployees}</p>
            </div>
            <div className="bg-[#f5f5f7] rounded-xl p-4">
              <p className="text-[12px] text-[#86868b] mb-1">เป้าหมายที่ตั้ง</p>
              <p className="text-[24px] font-bold text-[#0071e3]">{stats.goalsSet}</p>
              {stats.goalsPending > 0 && (
                <p className="text-[12px] text-[#ff9f0a]">รออนุมัติ {stats.goalsPending}</p>
              )}
            </div>
            <div className="bg-[#f5f5f7] rounded-xl p-4">
              <p className="text-[12px] text-[#86868b] mb-1">ประเมินตนเอง</p>
              <p className="text-[24px] font-bold text-[#30d158]">{stats.selfEvalDone}</p>
              <p className="text-[12px] text-[#86868b]">/{stats.totalEmployees} คน</p>
            </div>
            <div className="bg-[#f5f5f7] rounded-xl p-4">
              <p className="text-[12px] text-[#86868b] mb-1">หัวหน้าประเมิน</p>
              <p className="text-[24px] font-bold text-[#bf5af2]">{stats.supervisorEvalDone}</p>
              <p className="text-[12px] text-[#86868b]">/{stats.totalEmployees} คน</p>
            </div>
          </div>
        </Card>
      ) : (
        <Card elevated className="mb-6">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-[#f5f5f7] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-[#86868b]" />
            </div>
            <p className="text-[17px] font-semibold text-[#1d1d1f] mb-2">ยังไม่มีรอบประเมินที่เปิดอยู่</p>
            <p className="text-[14px] text-[#86868b] mb-4">สร้างรอบประเมินใหม่เพื่อเริ่มต้นระบบ KPI</p>
            <Link href="/admin/kpi/periods/create">
              <Button>
                <Plus className="w-4 h-4" /> สร้างรอบประเมิน
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </AdminLayout>
  );
}

export default function AdminKPIPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <KPIDashboardContent />
    </ProtectedRoute>
  );
}
