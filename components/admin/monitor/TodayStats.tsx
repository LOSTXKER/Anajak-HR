"use client";

import { Card } from "@/components/ui/Card";
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { StatCardSkeleton } from "@/components/ui/Skeleton";
import type { TodayStats as TodayStatsType } from "@/lib/hooks/use-monitor";

interface TodayStatsProps {
  stats: TodayStatsType;
  loading?: boolean;
}

export function TodayStats({ stats, loading }: TodayStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
        <Card elevated className="bg-gradient-to-br from-[#0071e3] to-[#005bb5] text-white">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 opacity-80" />
            <div>
              <p className="text-[32px] font-semibold">{stats.totalEmployees}</p>
              <p className="text-[13px] opacity-80">พนักงานทั้งหมด</p>
            </div>
          </div>
        </Card>

        <Card elevated className="bg-gradient-to-br from-[#34c759] to-[#28a745]">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-white opacity-80" />
            <div>
              <p className="text-[32px] font-semibold text-white">
                {stats.checkedIn}
              </p>
              <p className="text-[13px] text-white/80">เช็คอินแล้ว</p>
            </div>
          </div>
        </Card>

        <Card elevated className="bg-gradient-to-br from-[#ff9500] to-[#e68600]">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-white opacity-80" />
            <div>
              <p className="text-[32px] font-semibold text-white">
                {stats.notCheckedIn}
              </p>
              <p className="text-[13px] text-white/80">ยังไม่เช็คอิน</p>
            </div>
          </div>
        </Card>

        <Card elevated className="bg-gradient-to-br from-[#ff3b30] to-[#d63031]">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-white opacity-80" />
            <div>
              <p className="text-[32px] font-semibold text-white">{stats.late}</p>
              <p className="text-[13px] text-white/80">มาสาย</p>
            </div>
          </div>
        </Card>

        <Card elevated className="bg-gradient-to-br from-[#af52de] to-[#9b59b6]">
          <div className="flex items-center gap-3">
            <Timer className="w-8 h-8 text-white opacity-80" />
            <div>
              <p className="text-[32px] font-semibold text-white">
                {stats.onOT}
              </p>
              <p className="text-[13px] text-white/80">กำลังทำ OT</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pending Requests Alert */}
      {(stats.pendingOT > 0 ||
        stats.pendingLeave > 0 ||
        stats.pendingWFH > 0) && (
        <Link href="/admin/approvals">
          <Card elevated className="mb-6 border-l-4 border-l-[#ff9500] bg-[#ff9500]/5 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <AlertTriangle className="w-6 h-6 text-[#ff9500]" />
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-[#1d1d1f]">
                  คำขอรออนุมัติ
                </p>
                <div className="flex gap-4 mt-1">
                  {stats.pendingOT > 0 && (
                    <span className="text-[13px] text-[#ff9500]">
                      OT: {stats.pendingOT}
                    </span>
                  )}
                  {stats.pendingLeave > 0 && (
                    <span className="text-[13px] text-[#af52de]">
                      ลา: {stats.pendingLeave}
                    </span>
                  )}
                  {stats.pendingWFH > 0 && (
                    <span className="text-[13px] text-[#0071e3]">
                      WFH: {stats.pendingWFH}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </Link>
      )}
    </>
  );
}
