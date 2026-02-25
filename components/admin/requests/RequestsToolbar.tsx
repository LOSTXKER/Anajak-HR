"use client";

import { RefreshCw, Search, ChevronDown, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { RequestType, RequestStatus, RequestStats, typeConfig, statusConfig } from "@/lib/types/request";

interface RequestsToolbarProps {
  stats: RequestStats;
  loading: boolean;
  activeType: RequestType | "all";
  activeStatus: RequestStatus;
  searchTerm: string;
  dateRange: { start: string; end: string } | null;
  onTypeChange: (type: RequestType | "all") => void;
  onStatusChange: (status: RequestStatus) => void;
  onSearchChange: (term: string) => void;
  onDateRangeChange: (range: { start: string; end: string } | null) => void;
  onRefresh: () => void;
  onCreateClick: () => void;
}

export function RequestsToolbar({
  stats,
  loading,
  activeType,
  activeStatus,
  searchTerm,
  dateRange,
  onTypeChange,
  onStatusChange,
  onSearchChange,
  onDateRangeChange,
  onRefresh,
  onCreateClick,
}: RequestsToolbarProps) {
  const totalAll =
    stats.ot + stats.leave + stats.wfh + stats.late + stats.field_work;

  return (
    <div className="space-y-3">
      {/* Row 1: Type pills + Create button */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <button
            onClick={() => onTypeChange("all")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all ${
              activeType === "all"
                ? "bg-[#1d1d1f] text-white"
                : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]"
            }`}
          >
            ทั้งหมด
            <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${activeType === "all" ? "bg-white/20 text-white" : "bg-[#e8e8ed] text-[#1d1d1f]"}`}>
              {totalAll}
            </span>
          </button>

          {(Object.keys(typeConfig) as RequestType[]).map((type) => {
            const cfg = typeConfig[type];
            const Icon = cfg.icon;
            return (
              <button
                key={type}
                onClick={() => onTypeChange(type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all ${
                  activeType === type
                    ? `${cfg.bgColor} ${cfg.color} ring-2 ring-inset ring-current`
                    : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cfg.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${activeType === type ? "bg-white/40" : "bg-[#e8e8ed]"}`}>
                  {stats[type]}
                </span>
              </button>
            );
          })}
        </div>

        <Button size="sm" onClick={onCreateClick}>
          <Plus className="w-4 h-4" />
          สร้างคำขอ
        </Button>
      </div>

      {/* Row 2: Search + Status + Date + Refresh */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
          <input
            type="text"
            placeholder="ค้นหาชื่อพนักงาน..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#f5f5f7] border-0 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
        </div>

        {/* Status */}
        <div className="relative">
          <select
            value={activeStatus}
            onChange={(e) => onStatusChange(e.target.value as RequestStatus)}
            className="appearance-none pl-3 pr-8 py-2 bg-[#f5f5f7] border-0 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] cursor-pointer"
          >
            <option value="all">ทุกสถานะ ({totalAll})</option>
            <option value="pending">รออนุมัติ ({stats.pending})</option>
            <option value="approved">อนุมัติแล้ว ({stats.approved})</option>
            <option value="completed">เสร็จสิ้น ({stats.completed})</option>
            <option value="rejected">ปฏิเสธ ({stats.rejected})</option>
            <option value="cancelled">ยกเลิก ({stats.cancelled})</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#86868b] pointer-events-none" />
        </div>

        {/* Date range */}
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={dateRange?.start || ""}
            onChange={(e) => {
              const start = e.target.value;
              if (!start) { onDateRangeChange(null); return; }
              onDateRangeChange({ start, end: dateRange?.end || start });
            }}
            className="px-3 py-2 bg-[#f5f5f7] border-0 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
          <span className="text-[#86868b] text-[13px]">–</span>
          <input
            type="date"
            value={dateRange?.end || ""}
            onChange={(e) => {
              const end = e.target.value;
              if (!end) { onDateRangeChange(null); return; }
              onDateRangeChange({ start: dateRange?.start || end, end });
            }}
            className="px-3 py-2 bg-[#f5f5f7] border-0 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
          {dateRange && (
            <button
              onClick={() => onDateRangeChange(null)}
              className="p-1.5 text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <Button variant="secondary" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Row 3: Status summary pills */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(statusConfig) as string[]).map((status) => {
          const cfg = statusConfig[status];
          const count = (stats as any)[status];
          if (typeof count !== "number") return null;
          return (
            <button
              key={status}
              onClick={() => onStatusChange(activeStatus === status ? "all" : (status as RequestStatus))}
              className={`px-3 py-1 rounded-lg text-[12px] font-medium transition-all ${cfg.bgColor} ${cfg.color} ${
                activeStatus === status ? "ring-2 ring-offset-1 ring-current opacity-100" : "opacity-60 hover:opacity-100"
              }`}
            >
              {cfg.label}: {count}
            </button>
          );
        })}
      </div>
    </div>
  );
}
