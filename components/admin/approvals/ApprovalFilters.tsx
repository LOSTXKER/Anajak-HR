"use client";

import { Button } from "@/components/ui/Button";
import { FileText, History, RefreshCw } from "lucide-react";
import {
  RequestType,
  ViewMode,
  HistoryStatus,
  ApprovalStats,
  typeConfig,
} from "./types";

interface ApprovalFiltersProps {
  viewMode: ViewMode;
  activeType: RequestType | "all";
  historyStatus: HistoryStatus;
  stats: ApprovalStats;
  loading: boolean;
  onViewModeChange: (mode: ViewMode) => void;
  onTypeChange: (type: RequestType | "all") => void;
  onHistoryStatusChange: (status: HistoryStatus) => void;
  onRefresh: () => void;
}

export function ApprovalFilters({
  viewMode,
  activeType,
  historyStatus,
  stats,
  loading,
  onViewModeChange,
  onTypeChange,
  onHistoryStatusChange,
  onRefresh,
}: ApprovalFiltersProps) {
  return (
    <>
      {/* View Mode Toggle */}
      <div className="flex items-center gap-2 mb-6 p-1 bg-[#f5f5f7] rounded-2xl w-fit">
        <button
          onClick={() => onViewModeChange("pending")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[14px] font-medium transition-all ${
            viewMode === "pending"
              ? "bg-white text-[#1d1d1f] shadow-sm"
              : "text-[#6e6e73] hover:text-[#1d1d1f]"
          }`}
        >
          <FileText className="w-4 h-4" />
          รออนุมัติ
          {stats.total > 0 && (
            <span className="px-2 py-0.5 bg-[#ff3b30] text-white text-[11px] font-bold rounded-full">
              {stats.total}
            </span>
          )}
        </button>
        <button
          onClick={() => onViewModeChange("history")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[14px] font-medium transition-all ${
            viewMode === "history"
              ? "bg-white text-[#1d1d1f] shadow-sm"
              : "text-[#6e6e73] hover:text-[#1d1d1f]"
          }`}
        >
          <History className="w-4 h-4" />
          ประวัติ
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
        <button
          onClick={() => onTypeChange("all")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium whitespace-nowrap transition-all ${
            activeType === "all"
              ? "bg-[#1d1d1f] text-white shadow-lg"
              : "bg-white text-[#1d1d1f] border border-[#e8e8ed] hover:border-[#1d1d1f]"
          }`}
        >
          ทั้งหมด
        </button>

        {(Object.keys(typeConfig) as RequestType[]).map((type) => {
          const config = typeConfig[type];
          const count = viewMode === "pending" ? stats[type] : 0;
          const Icon = config.icon;

          return (
            <button
              key={type}
              onClick={() => onTypeChange(type)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium whitespace-nowrap transition-all ${
                activeType === type
                  ? `${config.bgColor} ${config.color} shadow-sm`
                  : "bg-white text-[#6e6e73] border border-[#e8e8ed] hover:border-[#d2d2d7]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {config.label}
              {count > 0 && viewMode === "pending" && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    activeType === type ? "bg-white/50" : "bg-[#f5f5f7]"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}

        <div className="flex-1" />

        {/* History Status Filter */}
        {viewMode === "history" && (
          <select
            value={historyStatus}
            onChange={(e) =>
              onHistoryStatusChange(e.target.value as HistoryStatus)
            }
            className="px-3 py-2 rounded-xl text-sm bg-white border border-[#e8e8ed] focus:outline-none"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="approved">อนุมัติแล้ว</option>
            <option value="rejected">ปฏิเสธ</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
        )}

        <Button
          variant="text"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="!px-3"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
    </>
  );
}
