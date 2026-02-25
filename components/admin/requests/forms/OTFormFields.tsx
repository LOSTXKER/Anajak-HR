"use client";

import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { TimeInput } from "@/components/ui/TimeInput";
import { OTRateInfo, CreateFormData } from "@/lib/types/request";

interface OTFormFieldsProps {
  formData: CreateFormData;
  detectedOTInfo: OTRateInfo | null;
  onUpdate: (key: keyof CreateFormData, value: any) => void;
}

export function OTFormFields({
  formData,
  detectedOTInfo,
  onUpdate,
}: OTFormFieldsProps) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
          วันที่ OT
        </label>
        <Input
          type="date"
          value={formData.otDate}
          onChange={(e) => onUpdate("otDate", e.target.value)}
        />
        {detectedOTInfo && (
          <p className="text-xs text-[#ff9500] mt-1">
            ตรวจพบ: {detectedOTInfo.typeName} (อัตรา {detectedOTInfo.rate}x)
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TimeInput
          label="เวลาเริ่ม"
          value={formData.otStartTime}
          onChange={(v) => onUpdate("otStartTime", v)}
        />
        <TimeInput
          label="เวลาสิ้นสุด"
          value={formData.otEndTime}
          onChange={(v) => onUpdate("otEndTime", v)}
        />
      </div>
      <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
        <div>
          <p className="text-sm font-medium text-[#1d1d1f]">
            บันทึกเป็น OT เสร็จสิ้น
          </p>
          <p className="text-xs text-[#86868b]">คำนวณยอดเงินอัตโนมัติ</p>
        </div>
        <Toggle
          checked={formData.otIsCompleted}
          onChange={(checked) => onUpdate("otIsCompleted", checked)}
        />
      </div>
    </>
  );
}
