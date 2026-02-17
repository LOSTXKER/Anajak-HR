"use client";

import { Input } from "@/components/ui/Input";
import { CreateFormData } from "@/lib/types/request";

interface LateFormFieldsProps {
  formData: CreateFormData;
  onUpdate: (key: keyof CreateFormData, value: any) => void;
}

export function LateFormFields({ formData, onUpdate }: LateFormFieldsProps) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
          วันที่
        </label>
        <Input
          type="date"
          value={formData.lateDate}
          onChange={(e) => onUpdate("lateDate", e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
          จำนวนนาทีที่สาย
        </label>
        <Input
          type="number"
          min={0}
          value={formData.lateMinutes}
          onChange={(e) =>
            onUpdate("lateMinutes", parseInt(e.target.value) || 0)
          }
        />
      </div>
    </>
  );
}
