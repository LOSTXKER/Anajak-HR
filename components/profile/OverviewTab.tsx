"use client";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Clock, Timer, Calendar, Home } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { getStatusBadge, getOTTypeLabel, getLeaveTypeLabel } from "./helpers";
import type { AttendanceRecord, OTRecord, LeaveRecord, WFHRecord } from "./types";

interface OverviewTabProps {
  attendanceData: AttendanceRecord[];
  otData: OTRecord[];
  leaveData: LeaveRecord[];
  wfhData: WFHRecord[];
}

export function OverviewTab({ attendanceData, otData, leaveData, wfhData }: OverviewTabProps) {
  const allItems = [...attendanceData, ...otData, ...leaveData, ...wfhData]
    .sort((a: any, b: any) => {
      const dateA = new Date(a.work_date || a.request_date || a.date || a.start_date);
      const dateB = new Date(b.work_date || b.request_date || b.date || b.start_date);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 15);

  if (allItems.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="ไม่มีข้อมูลในเดือนนี้"
        description="ยังไม่มีกิจกรรมใดๆ ในเดือนนี้"
      />
    );
  }

  return (
    <div className="space-y-3">
      {allItems.map((item: any, i) => {
        const isAttendance = "clock_in_time" in item;
        const isOT = "ot_type" in item;
        const isLeave = "leave_type" in item;
        const isWFH = "is_half_day" in item && !("leave_type" in item);
        const date = item.work_date || item.request_date || item.date || item.start_date;

        return (
          <Card key={`${i}-${item.id}`} elevated className="!p-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isAttendance ? "bg-[#34c759]/10" : isOT ? "bg-[#ff9500]/10" : isLeave ? "bg-[#af52de]/10" : "bg-[#0071e3]/10"
                }`}
              >
                {isAttendance && <Clock className="w-5 h-5 text-[#34c759]" />}
                {isOT && <Timer className="w-5 h-5 text-[#ff9500]" />}
                {isLeave && <Calendar className="w-5 h-5 text-[#af52de]" />}
                {isWFH && <Home className="w-5 h-5 text-[#0071e3]" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[13px] text-[#86868b]">
                    {format(new Date(date), "d MMM yyyy", { locale: th })}
                  </p>
                  {(isOT || isLeave || isWFH) && getStatusBadge(item.status)}
                </div>
                <p className="text-[15px] font-medium text-[#1d1d1f]">
                  {isAttendance && (
                    <>
                      เข้างาน {item.clock_in_time ? format(new Date(item.clock_in_time), "HH:mm") : "-"}
                      {item.clock_out_time && ` - ${format(new Date(item.clock_out_time), "HH:mm")}`}
                      {item.is_late && <span className="text-[#ff9500]"> (สาย {item.late_minutes}น.)</span>}
                    </>
                  )}
                  {isOT && (
                    <>
                      OT {getOTTypeLabel(item.ot_type)} {item.actual_ot_hours?.toFixed(1) || item.approved_ot_hours?.toFixed(1) || 0} ชม.
                      {item.ot_amount && <span className="text-[#34c759]"> ฿{item.ot_amount.toLocaleString()}</span>}
                    </>
                  )}
                  {isLeave && (
                    <>
                      {getLeaveTypeLabel(item.leave_type)}
                      {item.is_half_day && " (ครึ่งวัน)"}
                    </>
                  )}
                  {isWFH && <>WFH {item.is_half_day && "(ครึ่งวัน)"}</>}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
