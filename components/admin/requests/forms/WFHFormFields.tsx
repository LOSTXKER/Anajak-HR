"use client";

import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { CreateFormData } from "@/lib/types/request";

interface WFHFormFieldsProps {
  formData: CreateFormData;
  onUpdate: (key: keyof CreateFormData, value: any) => void;
}

export function WFHFormFields({ formData, onUpdate }: WFHFormFieldsProps) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
          วันที่
        </label>
        <Input
          type="date"
          value={formData.wfhDate}
          onChange={(e) => onUpdate("wfhDate", e.target.value)}
        />
      </div>
      <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
        <span className="text-sm font-medium text-[#1d1d1f]">ครึ่งวัน</span>
        <Toggle
          checked={formData.wfhIsHalfDay}
          onChange={(checked) => onUpdate("wfhIsHalfDay", checked)}
        />
      </div>
    </>
  );
}
