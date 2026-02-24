"use client";

import { Target, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import type { KPIGoal } from "@/lib/services/kpi.service";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Target }> = {
  pending_approval: { label: "รออนุมัติ", color: "text-[#ff9f0a]", bg: "bg-[#ff9f0a]/10", icon: Clock },
  approved: { label: "อนุมัติแล้ว", color: "text-[#0071e3]", bg: "bg-[#0071e3]/10", icon: AlertCircle },
  rejected: { label: "ปฏิเสธ", color: "text-[#ff3b30]", bg: "bg-[#ff3b30]/10", icon: XCircle },
  in_progress: { label: "กำลังดำเนินการ", color: "text-[#007aff]", bg: "bg-[#007aff]/10", icon: Target },
  completed: { label: "เสร็จสิ้น", color: "text-[#30d158]", bg: "bg-[#30d158]/10", icon: CheckCircle2 },
};

interface GoalCardProps {
  goal: KPIGoal;
  onClick?: () => void;
  showEmployee?: boolean;
}

export function GoalCard({ goal, onClick, showEmployee = false }: GoalCardProps) {
  const config = STATUS_CONFIG[goal.status] || STATUS_CONFIG.pending_approval;
  const Icon = config.icon;

  const latestProgress = goal.kpi_goal_progress?.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];

  const progressPercent = latestProgress ? Number(latestProgress.progress_percent) : 0;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-[#e8e8ed] p-4 transition-all duration-200 ${
        onClick ? "cursor-pointer hover:shadow-md hover:border-[#0071e3]/30" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 ${config.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold text-[#1d1d1f] truncate">{goal.title}</h3>
            {showEmployee && goal.employees_kpi_goals_employee_idToemployees && (
              <p className="text-[13px] text-[#86868b]">
                {goal.employees_kpi_goals_employee_idToemployees.name}
              </p>
            )}
          </div>
        </div>
        <span className={`${config.bg} ${config.color} text-[12px] font-medium px-2 py-0.5 rounded-lg whitespace-nowrap`}>
          {config.label}
        </span>
      </div>

      {goal.description && (
        <p className="text-[13px] text-[#6e6e73] mb-3 line-clamp-2">{goal.description}</p>
      )}

      <div className="flex items-center gap-4 text-[13px] text-[#86868b] mb-3">
        {goal.target_value && (
          <span>
            เป้า: {goal.target_value} {goal.target_unit}
          </span>
        )}
        <span>น้ำหนัก: {Number(goal.weight)}%</span>
      </div>

      {(goal.status === "in_progress" || goal.status === "completed") && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] text-[#86868b]">ความคืบหน้า</span>
            <span className="text-[12px] font-semibold text-[#1d1d1f]">{progressPercent}%</span>
          </div>
          <div className="h-2 bg-[#f5f5f7] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(progressPercent, 100)}%`,
                backgroundColor: progressPercent >= 100 ? "#30d158" : "#0071e3",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
