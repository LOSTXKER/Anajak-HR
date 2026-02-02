"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Plus, Clock, Calendar, Home, AlertTriangle, MapPin } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Toggle } from "@/components/ui/Toggle";
import {
  RequestType,
  CreateFormData,
  Employee,
  OTRateInfo,
  typeConfig,
  leaveTypeLabels,
} from "./types";

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

        {/* OT Form */}
        {selectedType === "ot" && (
          <>
            <div>
              <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                วันที่ OT
              </label>
              <Input
                type="date"
                value={formData.otDate}
                onChange={(e) => updateFormData("otDate", e.target.value)}
              />
              {detectedOTInfo && (
                <p className="text-xs text-[#ff9500] mt-1">
                  ตรวจพบ: {detectedOTInfo.typeName} (อัตรา {detectedOTInfo.rate}x)
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                  เวลาเริ่ม
                </label>
                <Input
                  type="time"
                  value={formData.otStartTime}
                  onChange={(e) => updateFormData("otStartTime", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                  เวลาสิ้นสุด
                </label>
                <Input
                  type="time"
                  value={formData.otEndTime}
                  onChange={(e) => updateFormData("otEndTime", e.target.value)}
                />
              </div>
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
                onChange={(checked) => updateFormData("otIsCompleted", checked)}
              />
            </div>
          </>
        )}

        {/* Leave Form */}
        {selectedType === "leave" && (
          <>
            <div>
              <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                ประเภทการลา
              </label>
              <select
                value={formData.leaveType}
                onChange={(e) => updateFormData("leaveType", e.target.value)}
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
                  onChange={(e) => updateFormData("leaveStartDate", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                  วันที่สิ้นสุด
                </label>
                <Input
                  type="date"
                  value={formData.leaveEndDate}
                  onChange={(e) => updateFormData("leaveEndDate", e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
              <span className="text-sm font-medium text-[#1d1d1f]">ครึ่งวัน</span>
              <Toggle
                checked={formData.leaveIsHalfDay}
                onChange={(checked) => updateFormData("leaveIsHalfDay", checked)}
              />
            </div>
          </>
        )}

        {/* WFH Form */}
        {selectedType === "wfh" && (
          <>
            <div>
              <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                วันที่
              </label>
              <Input
                type="date"
                value={formData.wfhDate}
                onChange={(e) => updateFormData("wfhDate", e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
              <span className="text-sm font-medium text-[#1d1d1f]">ครึ่งวัน</span>
              <Toggle
                checked={formData.wfhIsHalfDay}
                onChange={(checked) => updateFormData("wfhIsHalfDay", checked)}
              />
            </div>
          </>
        )}

        {/* Late Form */}
        {selectedType === "late" && (
          <>
            <div>
              <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                วันที่
              </label>
              <Input
                type="date"
                value={formData.lateDate}
                onChange={(e) => updateFormData("lateDate", e.target.value)}
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
                  updateFormData("lateMinutes", parseInt(e.target.value) || 0)
                }
              />
            </div>
          </>
        )}

        {/* Field Work Form */}
        {selectedType === "field_work" && (
          <>
            <div>
              <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                วันที่
              </label>
              <Input
                type="date"
                value={formData.fieldWorkDate}
                onChange={(e) => updateFormData("fieldWorkDate", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                สถานที่ <span className="text-[#ff3b30]">*</span>
              </label>
              <Input
                type="text"
                value={formData.fieldWorkLocation}
                onChange={(e) =>
                  updateFormData("fieldWorkLocation", e.target.value)
                }
                placeholder="ระบุสถานที่ปฏิบัติงาน"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
              <span className="text-sm font-medium text-[#1d1d1f]">ครึ่งวัน</span>
              <Toggle
                checked={formData.fieldWorkIsHalfDay}
                onChange={(checked) =>
                  updateFormData("fieldWorkIsHalfDay", checked)
                }
              />
            </div>
          </>
        )}

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
