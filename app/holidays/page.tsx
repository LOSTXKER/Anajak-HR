"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Calendar, CalendarRange, PartyPopper } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { format, startOfYear, endOfYear } from "date-fns";
import { th } from "date-fns/locale";
import { groupHolidays, type HolidayGroup } from "@/lib/utils/holiday-groups";

function HolidaysContent() {
  const { employee } = useAuth();
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchHolidays();
  }, [selectedYear]);

  const fetchHolidays = async () => {
    setLoading(true);
    const yearStart = format(startOfYear(new Date(selectedYear, 0, 1)), "yyyy-MM-dd");
    const yearEnd = format(endOfYear(new Date(selectedYear, 0, 1)), "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("holidays")
      .select("*")
      .gte("date", yearStart)
      .lte("date", yearEnd)
      .order("date", { ascending: true });

    if (!error && data) {
      setHolidays(data);
    }
    setLoading(false);
  };

  // Group consecutive holidays, then split by month
  const holidayGroups = groupHolidays(holidays);

  const groupsByMonth = holidayGroups.reduce((acc: Record<number, HolidayGroup[]>, group) => {
    const month = new Date(group.startDate).getMonth();
    if (!acc[month]) acc[month] = [];
    acc[month].push(group);
    return acc;
  }, {});

  // Count total individual days per month for badge
  const totalDaysInMonth = (monthIndex: number) =>
    (groupsByMonth[monthIndex] || []).reduce((sum, g) => sum + g.days, 0);

  const months = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbfd] pb-20 pt-safe">
      {/* Main Content */}
      <main className="max-w-[600px] mx-auto px-4 pt-6 pb-4">
        {/* Page Title */}
        <h1 className="text-[32px] font-bold text-[#1d1d1f] mb-6">ปฏิทินวันหยุด</h1>
        {/* Year Selector */}
        <Card className="mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedYear(selectedYear - 1)}
              className="px-3 py-2 text-[#0071e3] hover:bg-[#0071e3]/10 rounded-lg transition-colors"
            >
              ‹ {selectedYear - 1}
            </button>
            <div className="flex items-center gap-2">
              <PartyPopper className="w-5 h-5 text-[#af52de]" />
              <span className="text-[20px] font-bold text-[#1d1d1f]">{selectedYear}</span>
            </div>
            <button
              onClick={() => setSelectedYear(selectedYear + 1)}
              className="px-3 py-2 text-[#0071e3] hover:bg-[#0071e3]/10 rounded-lg transition-colors"
            >
              {selectedYear + 1} ›
            </button>
          </div>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card elevated>
            <div className="text-center py-4">
              <p className="text-[32px] font-bold text-[#af52de]">
                {holidays.length}
              </p>
              <p className="text-[13px] text-[#86868b]">วันหยุดทั้งหมด</p>
            </div>
          </Card>
          <Card elevated>
            <div className="text-center py-4">
              <p className="text-[32px] font-bold text-[#0071e3]">
                {Object.keys(groupsByMonth).length}
              </p>
              <p className="text-[13px] text-[#86868b]">เดือนที่มีวันหยุด</p>
            </div>
          </Card>
        </div>

        {/* Holidays by Month */}
        {Object.keys(groupsByMonth).length === 0 ? (
          <Card>
            <div className="text-center py-10">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-[#86868b] opacity-30" />
              <p className="text-[#86868b]">ไม่มีวันหยุดในปีนี้</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {months.map((monthName, monthIndex) => {
              const monthGroups = groupsByMonth[monthIndex];
              if (!monthGroups) return null;

              return (
                <Card key={monthIndex}>
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-[#af52de]" />
                    <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
                      {monthName} {selectedYear}
                    </h2>
                    <Badge variant="info" className="ml-auto">
                      {totalDaysInMonth(monthIndex)} วัน
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {monthGroups.map((group: HolidayGroup) => {
                      const startDate = new Date(group.startDate);
                      const endDate = new Date(group.endDate);
                      const today = new Date();
                      const todayStr = format(today, "yyyy-MM-dd");
                      const isPast = endDate < today;
                      const isToday = group.holidays.some((h) => h.date === todayStr);
                      const isMultiDay = group.days > 1;

                      return (
                        <div
                          key={group.id}
                          className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${isToday
                              ? "bg-[#af52de]/10 border border-[#af52de]/30"
                              : isPast
                                ? "bg-[#f5f5f7] opacity-60"
                                : "bg-[#f5f5f7] hover:bg-[#e8e8ed]"
                            }`}
                        >
                          {isMultiDay ? (
                            <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center ${isToday ? "bg-[#af52de] text-white" : "bg-white"}`}>
                              <CalendarRange className={`w-4 h-4 ${isToday ? "text-white" : "text-[#af52de]"} mb-0.5`} />
                              <span className={`text-[10px] font-bold ${isToday ? "text-white" : "text-[#af52de]"}`}>
                                {group.days} วัน
                              </span>
                            </div>
                          ) : (
                            <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center ${isToday ? "bg-[#af52de] text-white" : "bg-white"}`}>
                              <span className="text-[16px] font-bold">
                                {format(startDate, "d")}
                              </span>
                              <span className="text-[10px] uppercase">
                                {format(startDate, "EEE", { locale: th }).slice(0, 2)}
                              </span>
                            </div>
                          )}
                          <div className="flex-1">
                            <p className={`text-[15px] font-medium ${isToday ? "text-[#af52de]" : "text-[#1d1d1f]"}`}>
                              {group.name}
                            </p>
                            <p className="text-[13px] text-[#86868b]">
                              {isMultiDay
                                ? `${format(startDate, "d MMM", { locale: th })} - ${format(endDate, "d MMM yyyy", { locale: th })} (${group.days} วัน)`
                                : format(startDate, "d MMMM yyyy", { locale: th })
                              }
                            </p>
                          </div>
                          {isToday && (
                            <Badge className="bg-[#af52de] text-white border-0">
                              วันนี้
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

export default function HolidaysPage() {
  return (
    <ProtectedRoute>
      <HolidaysContent />
    </ProtectedRoute>
  );
}

