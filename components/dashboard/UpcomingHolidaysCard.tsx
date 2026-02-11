"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, CalendarRange } from "lucide-react";
import { format, parseISO, differenceInCalendarDays, startOfDay, isSameDay } from "date-fns";
import { th } from "date-fns/locale";
import { groupHolidays, type HolidayGroup } from "@/lib/utils/holiday-groups";

interface Holiday {
  id: string;
  name: string;
  date: string;
  type?: string;
  is_active?: boolean;
}

interface UpcomingHolidaysCardProps {
  upcomingHolidays: Holiday[];
}

export function UpcomingHolidaysCard({
  upcomingHolidays,
}: UpcomingHolidaysCardProps) {
  const [showAllHolidays, setShowAllHolidays] = useState(false);

  // Filter out today's holiday from upcoming list
  const filteredHolidays = upcomingHolidays.filter(
    (h) => !isSameDay(parseISO(h.date), new Date())
  );

  if (filteredHolidays.length === 0) {
    return null;
  }

  // Group consecutive holidays with the same name
  const groups = groupHolidays(
    filteredHolidays.map((h) => ({
      ...h,
      type: h.type || "public",
      is_active: h.is_active ?? true,
    }))
  );

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e8e8ed] mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#0071e3]" />
          <h3 className="text-[16px] font-semibold text-[#1d1d1f]">
            วันหยุดถัดไป
          </h3>
        </div>
        <button
          onClick={() => setShowAllHolidays(!showAllHolidays)}
          className="text-[13px] text-[#0071e3] hover:underline"
        >
          {showAllHolidays ? "ซ่อน" : "ดูทั้งหมด"}
        </button>
      </div>

      <div className="space-y-3">
        {groups.map((group) => {
          const startDate = parseISO(group.startDate);
          const today = startOfDay(new Date());
          const daysUntil = differenceInCalendarDays(startDate, today);
          const isMultiDay = group.days > 1;

          return (
            <div
              key={group.id}
              className="flex items-center gap-3 p-3 bg-[#f5f5f7] rounded-xl"
            >
              <div className="w-12 h-12 bg-[#af52de]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                {isMultiDay ? (
                  <CalendarRange className="w-5 h-5 text-[#af52de]" />
                ) : (
                  <span className="text-[20px]">🗓️</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-[#1d1d1f] truncate">
                  {group.name}
                  {isMultiDay && (
                    <span className="text-[13px] text-[#af52de] font-normal ml-1">
                      ({group.days} วัน)
                    </span>
                  )}
                </p>
                <p className="text-[13px] text-[#86868b]">
                  {isMultiDay
                    ? `${format(startDate, "d MMM", { locale: th })} - ${format(parseISO(group.endDate), "d MMM yyyy", { locale: th })}`
                    : format(startDate, "d MMMM yyyy", { locale: th })
                  }
                  {daysUntil > 0 && (
                    <span className="text-[#af52de]"> • อีก {daysUntil} วัน</span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {showAllHolidays && (
        <Link href="/holidays">
          <button className="w-full mt-3 py-2.5 text-[14px] text-[#0071e3] font-medium hover:bg-[#0071e3]/10 rounded-xl transition-colors">
            ดูปฏิทินวันหยุดทั้งหมด
          </button>
        </Link>
      )}
    </div>
  );
}
