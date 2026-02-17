"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Plus, ArrowLeft, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import {
  RequestType,
  CreateFormData,
  Employee,
  OTRateInfo,
  typeConfig,
} from "@/lib/types/request";
import {
  OTFormFields,
  LeaveFormFields,
  WFHFormFields,
  LateFormFields,
  FieldWorkFormFields,
} from "./forms";

interface CreateTabProps {
  employees: Employee[];
  detectedOTInfo: OTRateInfo | null;
  processing: boolean;
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

export function CreateTab({
  employees,
  detectedOTInfo,
  processing,
  onSubmit,
  onOTDateChange,
}: CreateTabProps) {
  const [selectedType, setSelectedType] = useState<RequestType | null>(null);
  const [formData, setFormData] = useState<CreateFormData>(defaultFormData);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (detectedOTInfo) {
      setFormData((prev) => ({ ...prev, otType: detectedOTInfo.type, otRate: detectedOTInfo.rate }));
    }
  }, [detectedOTInfo]);

  const updateFormData = (key: keyof CreateFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (key === "otDate") onOTDateChange(value);
  };

  const handleSubmit = async () => {
    if (!selectedType) return;
    onSubmit(selectedType, formData);
    setFormData(defaultFormData);
    setSelectedType(null);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleReset = () => {
    setSelectedType(null);
    setFormData(defaultFormData);
  };

  // Success Message
  if (success) {
    return (
      <Card elevated className="!py-12">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#34c759]/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-[#34c759]" />
          </div>
          <h3 className="text-lg font-semibold text-[#1d1d1f] mb-1">
            สร้างคำขอสำเร็จ
          </h3>
          <p className="text-sm text-[#86868b]">
            คำขอได้รับการอนุมัติและบันทึกแล้ว
          </p>
        </div>
      </Card>
    );
  }

  // Type Selection
  if (!selectedType) {
    return (
      <div className="space-y-4">
        <div className="mb-2">
          <h3 className="text-[17px] font-semibold text-[#1d1d1f]">เลือกประเภทคำขอ</h3>
          <p className="text-[14px] text-[#86868b]">สร้างคำขอแทนพนักงาน (อนุมัติอัตโนมัติ)</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(Object.keys(typeConfig) as RequestType[]).map((type) => {
            const config = typeConfig[type];
            const Icon = config.icon;
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`p-5 rounded-2xl border-2 border-transparent hover:border-current transition-all text-center ${config.bgColor} ${config.color} hover:shadow-md active:scale-95`}
              >
                <Icon className="w-8 h-8 mx-auto mb-2" />
                <span className="font-semibold text-[15px]">{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Form
  const typeInfo = typeConfig[selectedType];
  const Icon = typeInfo.icon;

  const renderFormFields = () => {
    switch (selectedType) {
      case "ot":
        return <OTFormFields formData={formData} detectedOTInfo={detectedOTInfo} onUpdate={updateFormData} />;
      case "leave":
        return <LeaveFormFields formData={formData} onUpdate={updateFormData} />;
      case "wfh":
        return <WFHFormFields formData={formData} onUpdate={updateFormData} />;
      case "late":
        return <LateFormFields formData={formData} onUpdate={updateFormData} />;
      case "field_work":
        return <FieldWorkFormFields formData={formData} onUpdate={updateFormData} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleReset}
          className="p-2 rounded-xl hover:bg-[#f5f5f7] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[#86868b]" />
        </button>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${typeInfo.bgColor}`}>
          <Icon className={`w-4 h-4 ${typeInfo.color}`} />
          <span className={`font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
        </div>
        <h3 className="text-[17px] font-semibold text-[#1d1d1f]">สร้างคำขอใหม่</h3>
      </div>

      <Card elevated>
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

          {/* Type-specific Fields */}
          {renderFormFields()}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-[#1d1d1f] mb-2">เหตุผล</label>
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
            <Button variant="secondary" onClick={handleReset}>
              เปลี่ยนประเภท
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
