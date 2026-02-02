"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Users, Calendar, Shield, UserCircle, Clock } from "lucide-react";
import { EmployeeStats as Stats } from "./types";

interface EmployeeStatsProps {
  stats: Stats;
  filterStatus: string;
  onViewPending: () => void;
}

export function EmployeeStats({
  stats,
  filterStatus,
  onViewPending,
}: EmployeeStatsProps) {
  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card elevated>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0071e3]/10 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-[#0071e3]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1d1d1f]">{stats.total}</p>
              <p className="text-xs text-[#86868b]">พนักงานทั้งหมด</p>
            </div>
          </div>
        </Card>
        <Card elevated>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#34c759]/10 rounded-xl flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-[#34c759]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#34c759]">
                {stats.approved}
              </p>
              <p className="text-xs text-[#86868b]">อนุมัติแล้ว</p>
            </div>
          </div>
        </Card>
        <Card elevated>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#ff9500]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#ff9500]">
                {stats.pending}
              </p>
              <p className="text-xs text-[#86868b]">รออนุมัติ</p>
            </div>
          </div>
        </Card>
        <Card elevated>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ff3b30]/10 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#ff3b30]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#ff3b30]">{stats.admins}</p>
              <p className="text-xs text-[#86868b]">Admin</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pending Alert */}
      {stats.pending > 0 && filterStatus !== "pending" && (
        <Card
          elevated
          className="mb-6 bg-[#ff9500]/5 border border-[#ff9500]/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#ff9500]" />
              </div>
              <div>
                <p className="text-[15px] font-medium text-[#1d1d1f]">
                  มี {stats.pending} บัญชีรออนุมัติ
                </p>
                <p className="text-[13px] text-[#86868b]">
                  คลิกเพื่อดูและอนุมัติ
                </p>
              </div>
            </div>
            <Button variant="primary" size="sm" onClick={onViewPending}>
              ดูรายการ
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}
