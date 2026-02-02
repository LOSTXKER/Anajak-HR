"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import {
  RequestType,
  CreateFormData,
  Employee,
  OTRateInfo,
  typeConfig,
} from "./types";
import {
  OTFormFields,
  LeaveFormFields,
  WFHFormFields,
  LateFormFields,
  FieldWorkFormFields,
} from "./forms";

interface CreateRequestModalProps {
  isOpen: boolean;
  selectedType: RequestType | null;
  employees: Employee[];
  detectedOTInfo: OTRateInfo | null;
  processing?: boolean;
  onClose: () => void;
  onTypeSelect: (type: RequestType) => void;
  onSubmit: (type: RequestType, formData: CreateFormData) => void;
  onOTDateChange: (date: string) => void;
}

const defaultFormData: CreateFormData = {
  employeeId: "",
  otDate: format(new Date(), "yyyy-MM-dd"),
  otStartTime: "18:00",
  otEndTime: "21:00",
  otIsCompleted: true,
  otType: "workday",
  otRate: 1.5,
  leaveType: "sick",
  leaveStartDate: format(new Date(), "yyyy-MM-dd"),
  leaveEndDate: format(new Date(), "yyyy-MM-dd"),
  leaveIsHalfDay: false,
  wfhDate: format(new Date(), "yyyy-MM-dd"),
  wfhIsHalfDay: false,
  lateDate: format(new Date(), "yyyy-MM-dd"),
  lateMinutes: 0,
  fieldWorkDate: format(new Date(), "yyyy-MM-dd"),
  fieldWorkIsHalfDay: false,
  fieldWorkLocation: "",
  reason: "",
};

export function CreateRequestModal({
  isOpen,
  selectedType,
  employees,
  detectedOTInfo,
  processing,
  onClose,
  onTypeSelect,
  onSubmit,
  onOTDateChange,
}: CreateRequestModalProps) {
  const [formData, setFormData] = useState<CreateFormData>(defaultFormData);

  // Update OT rate when detected
  useEffect(() => {
    if (detectedOTInfo) {
      setFormData((prev) => ({
        ...prev,
        otType: detectedOTInfo.type,
        otRate: detectedOTInfo.rate,
      }));
    }
  }, [detectedOTInfo]);

  const handleClose = () => {
    setFormData(defaultFormData);
    onClose();
  };

  const handleSubmit = () => {
    if (selectedType) {
      onSubmit(selectedType, formData);
      setFormData(defaultFormData);
    }
  };

  const updateFormData = (key: keyof CreateFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));

    // Trigger OT date change for rate detection
    if (key === "otDate") {
      onOTDateChange(value);
    }
  };

  // Type Selection Screen
  if (!selectedType) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="สร้างคำขอใหม่">
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(typeConfig) as RequestType[]).map((type) => {
            const config = typeConfig[type];
            const Icon = config.icon;
            return (
              <button
                key={type}
                onClick={() => onTypeSelect(type)}
                className={`p-4 rounded-xl border-2 border-transparent hover:border-current transition-all ${config.bgColor} ${config.color}`}
              >
                <Icon className="w-8 h-8 mx-auto mb-2" />
                <span className="font-medium">{config.label}</span>
              </button>
            );
          })}
        </div>
      </Modal>
    );
  }

  // Form Screen
  const typeInfo = typeConfig[selectedType];

  // Render form fields based on type
  const renderFormFields = () => {
    switch (selectedType) {
      case "ot":
        return (
          <OTFormFields
            formData={formData}
            detectedOTInfo={detectedOTInfo}
            onUpdate={updateFormData}
          />
        );
      case "leave":
        return <LeaveFormFields formData={formData} onUpdate={updateFormData} />;
      case "wfh":
        return <WFHFormFields formData={formData} onUpdate={updateFormData} />;
      case "late":
        return <LateFormFields formData={formData} onUpdate={updateFormData} />;
      case "field_work":
        return (
          <FieldWorkFormFields formData={formData} onUpdate={updateFormData} />
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`สร้าง ${typeInfo.label} ใหม่`}
    >
      <div className="space-y-4">
        {/* Employee Selection */}
        <div>
          <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
            พนักงาน <span className="text-[#ff3b30]">*</span>
          </label>
          <select
            value={formData.employeeId}
            onChange={(e) => updateFormData("employeeId", e.target.value)}
            className="w-full px-4 py-2.5 bg-[#f5f5f7] border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          >
            <option value="">เลือกพนักงาน</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.email})
              </option>
            ))}
          </select>
        </div>

        {/* Type-specific Form Fields */}
        {renderFormFields()}

        {/* Common Reason Field */}
        <div>
          <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
            เหตุผล
          </label>
          <Textarea
            value={formData.reason}
            onChange={(e) => updateFormData("reason", e.target.value)}
            placeholder="ระบุเหตุผล (ถ้ามี)"
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-[#e8e8ed]">
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={
              !formData.employeeId ||
              processing ||
              (selectedType === "field_work" && !formData.fieldWorkLocation.trim())
            }
          >
            <Plus className="w-4 h-4 mr-1" />
            {processing ? "กำลังสร้าง..." : "สร้างคำขอ"}
          </Button>
          <Button variant="secondary" onClick={() => onTypeSelect(null as any)}>
            เปลี่ยนประเภท
          </Button>
          <Button variant="text" onClick={handleClose}>
            ยกเลิก
          </Button>
        </div>
      </div>
    </Modal>
  );
}
