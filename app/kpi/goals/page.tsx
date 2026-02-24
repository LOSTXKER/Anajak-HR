"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { GoalCard } from "@/components/kpi/GoalCard";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Target, ArrowLeft } from "lucide-react";
import type { KPIGoal } from "@/lib/services/kpi.service";

function GoalsContent() {
  const { employee } = useAuth();
  const router = useRouter();
  const [goals, setGoals] = useState<KPIGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePeriodId, setActivePeriodId] = useState<string | null>(null);
  const [periodStatus, setPeriodStatus] = useState<string>("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (employee?.id) fetchData();
  }, [employee?.id]);

  const fetchData = async () => {
    try {
      const { data: periods } = await supabase
        .from("kpi_periods")
        .select("id, status")
        .neq("status", "draft")
        .order("start_date", { ascending: false })
        .limit(1);

      const period = periods?.[0];
      if (!period) {
        setLoading(false);
        return;
      }

      setActivePeriodId(period.id);
      setPeriodStatus(period.status);

      const { data: goalsData } = await supabase
        .from("kpi_goals")
        .select("*, kpi_goal_progress(*)")
        .eq("employee_id", employee!.id)
        .eq("period_id", period.id)
        .order("created_at");

      setGoals((goalsData || []) as KPIGoal[]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = goals.filter((g) => {
    if (filter === "all") return true;
    return g.status === filter;
  });

  const canCreateGoal = periodStatus === "goal_setting";

  return (
    <div className="min-h-screen bg-[#f5f5f7] pb-24">
      <div className="bg-white border-b border-[#e8e8ed]">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/kpi")} className="p-1">
              <ArrowLeft className="w-5 h-5 text-[#1d1d1f]" />
            </button>
            <h1 className="text-[20px] font-bold text-[#1d1d1f]">เป้าหมายของฉัน</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Actions */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2 overflow-x-auto">
            {[
              { key: "all", label: "ทั้งหมด" },
              { key: "pending_approval", label: "รออนุมัติ" },
              { key: "in_progress", label: "ดำเนินการ" },
              { key: "completed", label: "สำเร็จ" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap ${
                  filter === f.key
                    ? "bg-[#0071e3] text-white"
                    : "bg-white text-[#6e6e73]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {canCreateGoal && (
          <Link href="/kpi/goals/create" className="block mb-4">
            <Button fullWidth>
              <Plus className="w-4 h-4" /> ตั้งเป้าหมายใหม่
            </Button>
          </Link>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <Card elevated>
            <div className="text-center py-12">
              <div className="w-14 h-14 bg-[#f5f5f7] rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Target className="w-7 h-7 text-[#86868b]" />
              </div>
              <p className="text-[15px] text-[#86868b]">
                {goals.length === 0 ? "ยังไม่มีเป้าหมาย" : "ไม่พบเป้าหมายที่ตรงตัวกรอง"}
              </p>
              {canCreateGoal && goals.length === 0 && (
                <Link href="/kpi/goals/create">
                  <Button variant="secondary" size="sm" className="mt-3">
                    <Plus className="w-4 h-4" /> ตั้งเป้าหมาย
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onClick={() => router.push(`/kpi/goals/${goal.id}`)}
              />
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

export default function GoalsPage() {
  return (
    <ProtectedRoute>
      <GoalsContent />
    </ProtectedRoute>
  );
}
