"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Play, Activity, Timer, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { Skeleton, ListSkeleton } from "@/components/ui/Skeleton";
import type { ActiveOT, RecentActivity } from "@/lib/hooks/use-monitor";

interface EmployeeStatusGridProps {
  activeOTs: ActiveOT[];
  recentActivity: RecentActivity[];
  otTimes: Record<string, string>;
  approvedLateIds?: Set<string>;
  loading?: boolean;
}

export function EmployeeStatusGrid({
  activeOTs,
  recentActivity,
  otTimes,
  approvedLateIds = new Set(),
  loading,
}: EmployeeStatusGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-[0_0_0_0.5px_rgba(0,0,0,0.05),0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center gap-2">
            <Skeleton className="w-5 h-5 !rounded" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="p-4">
            <ListSkeleton count={3} />
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-[0_0_0_0.5px_rgba(0,0,0,0.05),0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center gap-2">
            <Skeleton className="w-5 h-5 !rounded" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="p-4">
            <ListSkeleton count={3} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Active OT Section */}
      <Card elevated padding="none">
        <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="w-5 h-5 text-[#ff9500]" />
            <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
              กำลังทำ OT
            </h3>
          </div>
          {activeOTs.length > 0 && (
            <Badge variant="warning">{activeOTs.length} คน</Badge>
          )}
        </div>

        <div className="p-4">
          {activeOTs.length === 0 ? (
            <div className="text-center py-10 text-[#86868b]">
              <Timer className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>ไม่มีใครกำลังทำ OT</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeOTs.map((ot) => (
                <div
                  key={ot.id}
                  className="flex items-center justify-between p-4 bg-[#ff9500]/10 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={ot.employee.name} size="sm" />
                    <div>
                      <p className="text-[15px] font-medium text-[#1d1d1f]">
                        {ot.employee.name}
                      </p>
                      <p className="text-[13px] text-[#86868b]">
                        เริ่ม: {format(new Date(ot.actual_start_time), "HH:mm")}{" "}
                        น.
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[24px] font-semibold text-[#ff9500]">
                      {otTimes[ot.id] || "00:00"}
                    </p>
                    <p className="text-[12px] text-[#86868b]">ชม:นาที</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Recent Activity */}
      <Card elevated padding="none">
        <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#0071e3]" />
          <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
            กิจกรรมล่าสุด
          </h3>
        </div>

        <div className="p-4 max-h-[400px] overflow-y-auto">
          {recentActivity.length === 0 ? (
            <div className="text-center py-10 text-[#86868b]">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>ยังไม่มีกิจกรรมวันนี้</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 p-3 hover:bg-[#f5f5f7] rounded-xl transition-colors"
                >
                  {(() => {
                    const isApprovedLate = activity.is_late && approvedLateIds.has((activity as any).employee_id || "");
                    const isUnapprovedLate = activity.is_late && !isApprovedLate;
                    return (
                      <>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.clock_out_time
                        ? "bg-[#34c759]/10"
                        : isUnapprovedLate
                          ? "bg-[#ff9500]/10"
                          : "bg-[#0071e3]/10"
                    }`}
                  >
                    {activity.clock_out_time ? (
                      <XCircle className="w-5 h-5 text-[#34c759]" />
                    ) : (
                      <CheckCircle
                        className={`w-5 h-5 ${
                          isUnapprovedLate ? "text-[#ff9500]" : "text-[#0071e3]"
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-medium text-[#1d1d1f]">
                      {activity.employee?.name}
                    </p>
                    <p className="text-[13px] text-[#86868b]">
                      {activity.clock_out_time
                        ? `เช็คเอาท์ ${format(new Date(activity.clock_out_time), "HH:mm")} น.`
                        : `เช็คอิน ${format(new Date(activity.clock_in_time), "HH:mm")} น.`}
                      {isUnapprovedLate && !activity.clock_out_time && (
                        <span className="text-[#ff9500]"> (สาย)</span>
                      )}
                      {isApprovedLate && !activity.clock_out_time && (
                        <span className="text-[#34c759]"> (สาย - อนุมัติ)</span>
                      )}
                      {(activity as any).work_mode === "wfh" && (
                        <span className="ml-1 px-1.5 py-0.5 bg-[#0071e3]/10 text-[#0071e3] text-[11px] rounded-full">🏠 WFH</span>
                      )}
                      {(activity as any).work_mode === "field" && (
                        <span className="ml-1 px-1.5 py-0.5 bg-[#34c759]/10 text-[#34c759] text-[11px] rounded-full">🚗 Field</span>
                      )}
                    </p>
                  </div>
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
