"use client";

import { Button } from "@/components/ui/Button";
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Search } from "lucide-react";
import { format, isToday } from "date-fns";
import type { Branch, DateMode } from "./types";

interface AttendanceFiltersProps {
  // Date state
  dateMode: DateMode;
  selectedDate: Date;
  startDate: string;
  endDate: string;
  // Filter state
  searchTerm: string;
  filterBranch: string;
  filterStatus: string;
  // Options
  branches: Branch[];
  loading: boolean;
  // Actions
  onDateModeChange: (mode: DateMode) => void;
  onSelectedDateChange: (date: Date) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onSearchChange: (value: string) => void;
  onBranchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  onRefresh: () => void;
  onAdd: () => void;
}

export function AttendanceFilters({
  dateMode,
  selectedDate,
  startDate,
  endDate,
  searchTerm,
  filterBranch,
  filterStatus,
  branches,
  loading,
  onDateModeChange,
  onSelectedDateChange,
  onStartDateChange,
  onEndDateChange,
  onSearchChange,
  onBranchChange,
  onStatusChange,
  onPrevDay,
  onNextDay,
  onToday,
  onRefresh,
  onAdd,
}: AttendanceFiltersProps) {
  return (
    <>
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        {/* Date Mode Toggle */}
        <div className="flex items-center gap-2 bg-white border border-[#e8e8ed] rounded-xl p-1">
          <button
            onClick={() => onDateModeChange("single")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              dateMode === "single"
                ? "bg-[#0071e3] text-white"
                : "text-[#86868b] hover:text-[#1d1d1f]"
            }`}
          >
            รายวัน
          </button>
          <button
            onClick={() => onDateModeChange("range")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              dateMode === "range"
                ? "bg-[#0071e3] text-white"
                : "text-[#86868b] hover:text-[#1d1d1f]"
            }`}
          >
            ช่วงวัน
          </button>
        </div>

        {/* Date Picker */}
        {dateMode === "single" ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevDay}
              className="p-2 hover:bg-[#f5f5f7] rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <input
              type="date"
              value={format(selectedDate, "yyyy-MM-dd")}
              onChange={(e) => onSelectedDateChange(new Date(e.target.value))}
              className="px-4 py-2 border border-[#e8e8ed] rounded-xl text-sm"
            />
            <button
              onClick={onNextDay}
              className="p-2 hover:bg-[#f5f5f7] rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            {!isToday(selectedDate) && (
              <button
                onClick={onToday}
                className="px-3 py-2 text-sm text-[#0071e3] hover:bg-[#0071e3]/10 rounded-lg"
              >
                วันนี้
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="px-4 py-2 border border-[#e8e8ed] rounded-xl text-sm"
            />
            <span className="text-[#86868b]">ถึง</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="px-4 py-2 border border-[#e8e8ed] rounded-xl text-sm"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="secondary" onClick={onRefresh} disabled={loading}>
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            รีเฟรช
          </Button>
          <Button onClick={onAdd}>
            <Plus className="w-4 h-4 mr-2" />
            เพิ่ม Manual
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
          <input
            type="text"
            placeholder="ค้นหาชื่อพนักงาน..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[#e8e8ed] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20"
          />
        </div>
        <select
          value={filterBranch}
          onChange={(e) => onBranchChange(e.target.value)}
          className="px-4 py-2 border border-[#e8e8ed] rounded-xl text-sm bg-white"
        >
          <option value="all">ทุกสาขา</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className="px-4 py-2 border border-[#e8e8ed] rounded-xl text-sm bg-white"
        >
          <option value="all">ทุกสถานะ</option>
          <option value="present">ปกติ</option>
          <option value="late">มาสาย</option>
          <option value="absent">ขาด</option>
          <option value="leave">ลา</option>
          <option value="wfh">WFH</option>
          <option value="ot">มี OT</option>
        </select>
      </div>
    </>
  );
}
