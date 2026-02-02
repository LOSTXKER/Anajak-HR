"use client";

import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Save, Calendar, AlertTriangle, X } from "lucide-react";
import { Employee, EditFormData } from "./types";

interface EmployeeEditModalProps {
  employee: Employee | null;
  formData: EditFormData;
  employees: Employee[];
  saving: boolean;
  onClose: () => void;
  onFormChange: (data: EditFormData) => void;
  onSave: () => void;
}

export function EmployeeEditModal({
  employee,
  formData,
  employees,
  saving,
  onClose,
  onFormChange,
  onSave,
}: EmployeeEditModalProps) {
  if (!employee) return null;

  const isLastAdmin =
    employee.role === "admin" &&
    formData.role !== "admin" &&
    employees.filter((e) => e.role === "admin").length <= 1;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`แก้ไขข้อมูล - ${employee.name}`}
      size="lg"
    >
      <div className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="ชื่อ-นามสกุล"
            value={formData.name}
            onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
          />
          <Input
            label="อีเมล"
            type="email"
            value={formData.email}
            onChange={(e) =>
              onFormChange({ ...formData, email: e.target.value })
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="เบอร์โทร"
            value={formData.phone}
            onChange={(e) =>
              onFormChange({ ...formData, phone: e.target.value })
            }
          />
          <Select
            label="ตำแหน่ง"
            value={formData.role}
            onChange={(v) => onFormChange({ ...formData, role: v })}
            options={[
              { value: "staff", label: "👤 Staff" },
              { value: "supervisor", label: "👨‍💼 Supervisor" },
              { value: "admin", label: "👑 Admin" },
            ]}
          />
        </div>

        {/* Admin demotion warning */}
        {employee.role === "admin" && formData.role !== "admin" && (
          <div className="p-3 bg-[#fff7ed] border border-[#fed7aa] rounded-lg">
            <p className="text-[13px] text-[#9a3412] font-medium flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              กำลังลดสิทธิ์จาก Admin เป็น{" "}
              {formData.role === "staff" ? "Staff" : "Supervisor"}
            </p>
            {isLastAdmin && (
              <p className="text-[12px] text-[#ff3b30] mt-1 font-semibold flex items-center gap-1">
                <X className="w-3.5 h-3.5" />
                ไม่สามารถเปลี่ยนได้! นี่คือ Admin คนสุดท้ายในระบบ
              </p>
            )}
          </div>
        )}

        <Input
          label="เงินเดือน (฿)"
          type="number"
          value={formData.baseSalary}
          onChange={(e) =>
            onFormChange({ ...formData, baseSalary: e.target.value })
          }
        />

        {/* Leave Quotas */}
        <div className="border-t border-[#e8e8ed] pt-4">
          <h4 className="text-sm font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            โควต้าวันลา
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="วันพักร้อน"
              type="number"
              min="0"
              value={formData.annualQuota}
              onChange={(e) =>
                onFormChange({
                  ...formData,
                  annualQuota: parseInt(e.target.value) || 0,
                })
              }
            />
            <Input
              label="วันลาป่วย"
              type="number"
              min="0"
              value={formData.sickQuota}
              onChange={(e) =>
                onFormChange({
                  ...formData,
                  sickQuota: parseInt(e.target.value) || 0,
                })
              }
            />
            <Input
              label="วันลากิจ"
              type="number"
              min="0"
              value={formData.personalQuota}
              onChange={(e) =>
                onFormChange({
                  ...formData,
                  personalQuota: parseInt(e.target.value) || 0,
                })
              }
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            ยกเลิก
          </Button>
          <Button
            onClick={onSave}
            loading={saving}
            disabled={isLastAdmin}
            className="flex-1"
          >
            <Save className="w-4 h-4" />
            บันทึก
          </Button>
        </div>
      </div>
    </Modal>
  );
}
