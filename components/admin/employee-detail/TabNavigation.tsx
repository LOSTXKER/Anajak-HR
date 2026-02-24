"use client";

import {
  User,
  Clock,
  Timer,
  Calendar,
  Home,
  AlertTriangle,
  Trophy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format, subMonths, addMonths } from "date-fns";
import { th } from "date-fns/locale";
import { TabType } from "./types";

interface TabNavigationProps {
  activeTab: TabType;
  currentMonth: Date;
  onTabChange: (tab: TabType) => void;
  onMonthChange: (date: Date) => void;
}

const tabs = [
  { id: "info" as TabType, label: "ข้อมูล", icon: User },
  { id: "attendance" as TabType, label: "Attendance", icon: Clock },
  { id: "ot" as TabType, label: "OT", icon: Timer },
  { id: "leave" as TabType, label: "ลา", icon: Calendar },
  { id: "wfh" as TabType, label: "WFH", icon: Home },
  { id: "late" as TabType, label: "สาย", icon: AlertTriangle },
  { id: "gamification" as TabType, label: "Game", icon: Trophy },
];

export function TabNavigation({
  activeTab,
  currentMonth,
  onTabChange,
  onMonthChange,
}: TabNavigationProps) {
  return (
    <>
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#f5f5f7] rounded-xl mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-white shadow-sm text-[#1d1d1f]"
                : "text-[#86868b] hover:text-[#1d1d1f]"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Month Navigation (for tabs except info and gamification) */}
      {activeTab !== "info" && activeTab !== "gamification" && (
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => onMonthChange(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[#6e6e73]" />
          </button>
          <h3 className="text-lg font-semibold text-[#1d1d1f] min-w-[160px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: th })}
          </h3>
          <button
            onClick={() => onMonthChange(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-[#6e6e73]" />
          </button>
        </div>
      )}
    </>
  );
}
