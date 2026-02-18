"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  UserCheck,
  Clock,
  AlertTriangle,
  AlertCircle,
  Timer,
  Calendar,
} from "lucide-react";

interface TodayAttendance {
  clock_in_time: string | null;
  clock_out_time: string | null;
  work_mode?: "onsite" | "wfh" | "field" | null;
}

interface TodayHoliday {
  name: string;
}

interface OTRequest {
  id: string;
  [key: string]: any;
}

interface TodayStatusCardProps {
  todayAttendance: TodayAttendance | null | undefined;
  workDuration: string;
  workProgress: number;
  isOvertime: boolean;
  timeRemaining: string | null;
  isRestDay: boolean;
  todayHoliday: TodayHoliday | null | undefined;
  pendingOT: OTRequest[];
  activeOT: OTRequest | null | undefined;
}

export function TodayStatusCard({
  todayAttendance,
  workDuration,
  workProgress,
  isOvertime,
  timeRemaining,
  isRestDay,
  todayHoliday,
  pendingOT,
  activeOT,
}: TodayStatusCardProps) {
  // Hide on rest days when actively doing OT
  if (isRestDay && activeOT) {
    return null;
  }

  // Determine background gradient
  const bgGradient = todayAttendance
    ? isOvertime
      ? "bg-gradient-to-br from-[#ff9500] to-[#ff6b00]"
      : "bg-gradient-to-br from-[#34c759] to-[#248a3d]"
    : "bg-gradient-to-br from-[#1d1d1f] to-[#3d3d3d]";

  return (
    <div className={`rounded-2xl p-5 mb-4 ${bgGradient}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] text-white/70 font-medium">
          สถานะวันนี้
        </span>
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            todayAttendance ? "bg-white" : "bg-[#ff9500]"
          } animate-pulse`}
        />
      </div>

      {todayAttendance ? (
        <CheckedInContent
          todayAttendance={todayAttendance}
          workDuration={workDuration}
          workProgress={workProgress}
          isOvertime={isOvertime}
          timeRemaining={timeRemaining}
        />
      ) : (
        <NotCheckedInContent
          isRestDay={isRestDay}
          todayHoliday={todayHoliday}
          pendingOT={pendingOT}
        />
      )}
    </div>
  );
}

// Sub-component for checked-in state
function CheckedInContent({
  todayAttendance,
  workDuration,
  workProgress,
  isOvertime,
  timeRemaining,
}: {
  todayAttendance: TodayAttendance;
  workDuration: string;
  workProgress: number;
  isOvertime: boolean;
  timeRemaining: string | null;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <UserCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-[15px] font-medium text-white/80 flex items-center gap-1.5">
              {todayAttendance.clock_out_time ? (
                "เสร็จสิ้น"
              ) : isOvertime ? (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  ทำงานเกินเวลา
                </>
              ) : (
                "กำลังทำงาน"
              )}
            </p>
            <p className="text-[13px] text-white/60">
              เข้า{" "}
              {todayAttendance.clock_in_time
                ? format(new Date(todayAttendance.clock_in_time), "HH:mm")
                : "-"}{" "}
              น.
              {todayAttendance.clock_out_time &&
                ` - ออก ${format(
                  new Date(todayAttendance.clock_out_time),
                  "HH:mm"
                )} น.`}
            </p>
            {todayAttendance.work_mode === "wfh" && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-white/20 text-white text-[11px] font-medium rounded-full">
                🏠 ทำงานจากบ้าน (WFH)
              </span>
            )}
            {todayAttendance.work_mode === "field" && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-white/20 text-white text-[11px] font-medium rounded-full">
                🚗 งานภาคสนาม
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Work Timer */}
      <div className="text-center mb-4">
        <p className="text-[42px] font-bold text-white tracking-tight font-mono">
          {workDuration}
        </p>
        <p className="text-[13px] text-white/60">
          {todayAttendance.clock_out_time ? "ชั่วโมงทำงานวันนี้" : "เวลาทำงาน"}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[12px] text-white/70 mb-1.5">
          <span>ความคืบหน้า</span>
          <span>{Math.round(workProgress)}%</span>
        </div>
        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${workProgress}%` }}
          />
        </div>
      </div>

      {/* Time Remaining / Overtime Alert */}
      {!todayAttendance.clock_out_time && timeRemaining && (
        <div
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl mb-3 ${
            isOvertime ? "bg-white/20" : "bg-white/10"
          }`}
        >
          {isOvertime ? (
            <AlertCircle className="w-4 h-4 text-white" />
          ) : (
            <Clock className="w-4 h-4 text-white/70" />
          )}
          <span className="text-[14px] text-white font-medium">
            {timeRemaining}
          </span>
        </div>
      )}

      {!todayAttendance.clock_out_time && (
        <Link href="/checkout">
          <button className="w-full py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-all">
            เช็คเอาท์
          </button>
        </Link>
      )}
    </div>
  );
}

// Sub-component for not checked-in state
function NotCheckedInContent({
  isRestDay,
  todayHoliday,
  pendingOT,
}: {
  isRestDay: boolean;
  todayHoliday: TodayHoliday | null | undefined;
  pendingOT: OTRequest[];
}) {
  // Rest day with pending OT
  if (isRestDay && pendingOT.length > 0) {
    return (
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
          <Timer className="w-6 h-6 text-white/70" />
        </div>
        <div>
          <p className="text-[22px] font-bold text-white">
            {todayHoliday ? "วันหยุดนักขัตฤกษ์" : "วันหยุดสุดสัปดาห์"} - มี OT
            รอเริ่ม
          </p>
          <p className="text-[14px] text-white/60">กดเริ่ม OT ด้านล่างได้เลย</p>
        </div>
      </div>
    );
  }

  // Rest day without OT
  if (isRestDay) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
            <Calendar className="w-6 h-6 text-white/70" />
          </div>
          <div>
            <p className="text-[22px] font-bold text-white">
              {todayHoliday ? todayHoliday.name : "วันหยุดสุดสัปดาห์"}
            </p>
            <p className="text-[14px] text-white/60">
              ต้องขอ OT ก่อนถึงจะเข้างานได้
            </p>
          </div>
        </div>
        <Link href="/ot/request">
          <button className="w-full py-3.5 bg-[#ff9500] hover:bg-[#ff8000] text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
            <Timer className="w-5 h-5" />
            ขอทำ OT
          </button>
        </Link>
      </div>
    );
  }

  // Normal day - can check in
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
          <Clock className="w-6 h-6 text-white/70" />
        </div>
        <div>
          <p className="text-[22px] font-bold text-white">ยังไม่ได้เช็คอิน</p>
          <p className="text-[14px] text-white/60">กดปุ่มด้านล่างเพื่อเริ่มงาน</p>
        </div>
      </div>
      <Link href="/checkin">
        <button className="w-full py-3.5 bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
          <UserCheck className="w-5 h-5" />
          เช็คอินเลย
        </button>
      </Link>
    </div>
  );
}
