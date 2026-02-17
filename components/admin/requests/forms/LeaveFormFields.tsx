"use client";

import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { CreateFormData, leaveTypeLabels } from "@/lib/types/request";

interface LeaveFormFieldsProps {
  formData: CreateFormData;
  onUpdate: (key: keyof CreateFormData, value: any) => void;
}

export function LeaveFormFields({ formData, onUpdate }: LeaveFormFieldsProps) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
          ประเภทการลา
        </label>
        <select
          value={formData.leaveType}
          onChange={(e) => onUpdate("leaveType", e.target.value)}
          className="w-full px-4 py-2.5 bg-[#f5f5f7] border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
        >
          {Object.entries(leaveTypeLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
            วันที่เริ่ม
          </label>
          <Input
            type="date"
            value={formData.leaveStartDate}
            onChange={(e) => onUpdate("leaveStartDate", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
            วันที่สิ้นสุด
          </label>
          <Input
            type="date"
            value={formData.leaveEndDate}
            onChange={(e) => onUpdate("leaveEndDate", e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
        <span className="text-sm font-medium text-[#1d1d1f]">ครึ่งวัน</span>
        <Toggle
          checked={formData.leaveIsHalfDay}
          onChange={(checked) => onUpdate("leaveIsHalfDay", checked)}
        />
      </div>
    </>
  );
}
