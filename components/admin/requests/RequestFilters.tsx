"use client";

import { Search, RefreshCw, Plus, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  RequestType,
  RequestStatus,
  RequestStats,
  typeConfig,
  statusConfig,
} from "./types";

interface RequestFiltersProps {
  // Filter state
  activeType: RequestType | "all";
  activeStatus: RequestStatus;
  searchTerm: string;
  dateRange: { start: string; end: string };

  // Stats
  stats: RequestStats;

  // Loading state
  loading?: boolean;

  // Callbacks
  onTypeChange: (type: RequestType | "all") => void;
  onStatusChange: (status: RequestStatus) => void;
  onSearchChange: (term: string) => void;
  onDateRangeChange: (range: { start: string; end: string }) => void;
  onRefresh: () => void;
  onCreateClick: () => void;
}

export function RequestFilters({
  activeType,
  activeStatus,
  searchTerm,
  dateRange,
  stats,
  loading,
  onTypeChange,
  onStatusChange,
  onSearchChange,
  onDateRangeChange,
  onRefresh,
  onCreateClick,
}: RequestFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1d1d1f]">จัดการคำขอ</h1>
          <p className="text-[#86868b] text-sm mt-1">
            อนุมัติหรือปฏิเสธคำขอจากพนักงาน
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={onCreateClick}>
            <Plus className="w-4 h-4 mr-1" />
            สร้างคำขอ
          </Button>
        </div>
      </div>

      {/* Type Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => onTypeChange("all")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
            activeType === "all"
              ? "bg-[#1d1d1f] text-white"
              : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]"
          }`}
        >
          ทั้งหมด
          <Badge variant="default" className="ml-1">
            {stats.ot + stats.leave + stats.wfh + stats.late + stats.field_work}
          </Badge>
        </button>
        {(Object.keys(typeConfig) as RequestType[]).map((type) => {
          const config = typeConfig[type];
          const Icon = config.icon;
          return (
            <button
              key={type}
              onClick={() => onTypeChange(type)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                activeType === type
                  ? `${config.bgColor} ${config.color}`
                  : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {config.label}
              <Badge variant="default" className="ml-1">
                {stats[type]}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
          <input
            type="text"
            placeholder="ค้นหาชื่อพนักงาน..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#f5f5f7] border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={activeStatus}
            onChange={(e) => onStatusChange(e.target.value as RequestStatus)}
            className="appearance-none w-full sm:w-auto pl-4 pr-10 py-2.5 bg-[#f5f5f7] border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3] cursor-pointer"
          >
            <option value="all">ทุกสถานะ ({stats.pending + stats.approved + stats.completed + stats.rejected + stats.cancelled})</option>
            <option value="pending">รออนุมัติ ({stats.pending})</option>
            <option value="approved">อนุมัติแล้ว ({stats.approved})</option>
            <option value="completed">เสร็จสิ้น ({stats.completed})</option>
            <option value="rejected">ปฏิเสธ ({stats.rejected})</option>
            <option value="cancelled">ยกเลิก ({stats.cancelled})</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b] pointer-events-none" />
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) =>
              onDateRangeChange({ ...dateRange, start: e.target.value })
            }
            className="px-3 py-2.5 bg-[#f5f5f7] border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
          <span className="text-[#86868b]">-</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) =>
              onDateRangeChange({ ...dateRange, end: e.target.value })
            }
            className="px-3 py-2.5 bg-[#f5f5f7] border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
        </div>
      </div>

      {/* Stats Summary */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(statusConfig) as (keyof typeof statusConfig)[]).map(
          (status) => {
            const config = statusConfig[status];
            const count = stats[status as keyof RequestStats];
            if (typeof count !== "number") return null;
            return (
              <button
                key={status}
                onClick={() =>
                  onStatusChange(
                    activeStatus === status ? "all" : (status as RequestStatus)
                  )
                }
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeStatus === status
                    ? `${config.bgColor} ${config.color} ring-2 ring-offset-1`
                    : `${config.bgColor} ${config.color} opacity-60 hover:opacity-100`
                }`}
              >
                {config.label}: {count}
              </button>
            );
          }
        )}
      </div>
    </div>
  );
}
