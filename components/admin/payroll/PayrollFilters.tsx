"use client";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { th } from "date-fns/locale";
import type { Employee, Branch } from "./types";

interface PayrollFiltersProps {
  currentMonth: Date;
  searchTerm: string;
  selectedEmployee: string;
  selectedBranch: string;
  employees: Employee[];
  branches: Branch[];
  hasData: boolean;
  onMonthChange: (date: Date) => void;
  onSearchChange: (value: string) => void;
  onEmployeeChange: (value: string) => void;
  onBranchChange: (value: string) => void;
  onExport: () => void;
}

export function PayrollFilters({
  currentMonth,
  searchTerm,
  selectedEmployee,
  selectedBranch,
  employees,
  branches,
  hasData,
  onMonthChange,
  onSearchChange,
  onEmployeeChange,
  onBranchChange,
  onExport,
}: PayrollFiltersProps) {
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
        <div className="min-w-[180px]">
          <Select
            value={selectedEmployee}
            onChange={onEmployeeChange}
            options={[
              { value: "all", label: "พนักงานทั้งหมด" },
              ...employees.map((e) => ({ value: e.id, label: e.name })),
            ]}
            placeholder="เลือกพนักงาน"
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
      </div>
    </div>
  );
}
