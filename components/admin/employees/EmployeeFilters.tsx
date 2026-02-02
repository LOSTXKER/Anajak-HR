"use client";

import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Search } from "lucide-react";

interface EmployeeFiltersProps {
  searchTerm: string;
  filterStatus: string;
  filterRole: string;
  pendingCount: number;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onRoleChange: (value: string) => void;
}

export function EmployeeFilters({
  searchTerm,
  filterStatus,
  filterRole,
  pendingCount,
  onSearchChange,
  onStatusChange,
  onRoleChange,
}: EmployeeFiltersProps) {
  return (
    <Card elevated className="mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868b]" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ หรืออีเมล..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
            />
          </div>
        </div>
        <Select
          value={filterStatus}
          onChange={onStatusChange}
          options={[
            { value: "all", label: "ทุกสถานะ" },
            { value: "pending", label: `รออนุมัติ (${pendingCount})` },
            { value: "approved", label: "อนุมัติแล้ว" },
            { value: "rejected", label: "ปฏิเสธ" },
          ]}
        />
        <Select
          value={filterRole}
          onChange={onRoleChange}
          options={[
            { value: "all", label: "ทุกตำแหน่ง" },
            { value: "admin", label: "👑 Admin" },
            { value: "supervisor", label: "👨‍💼 Supervisor" },
            { value: "staff", label: "👤 Staff" },
          ]}
        />
      </div>
    </Card>
  );
}
