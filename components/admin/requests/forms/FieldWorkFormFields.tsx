"use client";

import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { CreateFormData } from "@/lib/types/request";

interface FieldWorkFormFieldsProps {
  formData: CreateFormData;
  onUpdate: (key: keyof CreateFormData, value: any) => void;
}

export function FieldWorkFormFields({
  formData,
  onUpdate,
}: FieldWorkFormFieldsProps) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
          วันที่
        </label>
        <Input
          type="date"
          value={formData.fieldWorkDate}
          onChange={(e) => onUpdate("fieldWorkDate", e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
          สถานที่ <span className="text-[#ff3b30]">*</span>
        </label>
        <Input
          type="text"
          value={formData.fieldWorkLocation}
          onChange={(e) => onUpdate("fieldWorkLocation", e.target.value)}
          placeholder="ระบุสถานที่ปฏิบัติงาน"
        />
      </div>
      <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
        <span className="text-sm font-medium text-[#1d1d1f]">ครึ่งวัน</span>
        <Toggle
          checked={formData.fieldWorkIsHalfDay}
          onChange={(checked) => onUpdate("fieldWorkIsHalfDay", checked)}
        />
      </div>
    </>
  );
}
