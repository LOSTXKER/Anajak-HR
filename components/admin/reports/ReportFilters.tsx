"use client";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Search, ChevronLeft, ChevronRight, RefreshCw, Download } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { th } from "date-fns/locale";
import { Branch } from "./types";

interface ReportFiltersProps {
  currentMonth: Date;
  searchTerm: string;
  selectedBranch: string;
  selectedRole: string;
  branches: Branch[];
  loading: boolean;
  hasData: boolean;
  onMonthChange: (date: Date) => void;
  onSearchChange: (value: string) => void;
  onBranchChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onRefresh: () => void;
  onExport: () => void;
}

export function ReportFilters({
  currentMonth,
  searchTerm,
  selectedBranch,
  selectedRole,
  branches,
  loading,
  hasData,
  onMonthChange,
  onSearchChange,
  onBranchChange,
  onRoleChange,
  onRefresh,
  onExport,
}: ReportFiltersProps) {
  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onMonthChange(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[#6e6e73]" />
          </button>
          <h2 className="text-[17px] font-semibold text-[#1d1d1f] min-w-[180px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: th })}
          </h2>
          <button
            onClick={() => onMonthChange(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-[#6e6e73]" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="text" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onExport}
            disabled={!hasData}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
          <input
            type="text"
            placeholder="ค้นหาพนักงาน..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#d2d2d7] focus:border-[#0071e3] outline-none text-[15px]"
          />
        </div>
        <div className="min-w-[150px]">
          <Select
            value={selectedBranch}
            onChange={onBranchChange}
            options={[
              { value: "all", label: "ทุกสาขา" },
              { value: "none", label: "ไม่มีสาขา" },
              ...branches.map((b) => ({ value: b.id, label: b.name })),
            ]}
            placeholder="เลือกสาขา"
          />
        </div>
        <div className="min-w-[130px]">
          <Select
            value={selectedRole}
            onChange={onRoleChange}
            options={[
              { value: "all", label: "ทุกตำแหน่ง" },
              { value: "staff", label: "พนักงาน" },
              { value: "supervisor", label: "หัวหน้างาน" },
              { value: "admin", label: "Admin" },
            ]}
            placeholder="ตำแหน่ง"
          />
        </div>
      </div>
    </div>
  );
}
