"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { DateInput } from "@/components/ui/DateInput";
import { TimeInput } from "@/components/ui/TimeInput";
import type { Employee, AddAttendanceForm } from "./types";

interface AddAttendanceModalProps {
  isOpen: boolean;
  employees: Employee[];
  form: AddAttendanceForm;
  saving: boolean;
  onClose: () => void;
  onFormChange: (form: AddAttendanceForm) => void;
  onSubmit: () => void;
}

export function AddAttendanceModal({
  isOpen,
  employees,
  form,
  saving,
  onClose,
  onFormChange,
  onSubmit,
}: AddAttendanceModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="เพิ่มการเข้างาน Manual"
      size="md"
    >
      <div className="space-y-4">
        <Select
          label="พนักงาน"
          value={form.employeeId}
          onChange={(v) => onFormChange({ ...form, employeeId: v })}
          options={[
            { value: "", label: "เลือกพนักงาน" },
            ...employees.map((e) => ({ value: e.id, label: e.name })),
          ]}
        />
        <DateInput
          label="วันที่"
          value={form.workDate}
          onChange={(v) => onFormChange({ ...form, workDate: v })}
        />
        <div className="grid grid-cols-2 gap-4">
          <TimeInput
            label="เวลาเข้างาน"
            value={form.clockInTime}
            onChange={(v) => onFormChange({ ...form, clockInTime: v })}
          />
          <TimeInput
            label="เวลาออกงาน"
            value={form.clockOutTime}
            onChange={(v) => onFormChange({ ...form, clockOutTime: v })}
          />
        </div>
        <Select
          label="สถานะ"
          value={form.status}
          onChange={(v) => onFormChange({ ...form, status: v })}
          options={[
            { value: "present", label: "ปกติ" },
            { value: "late", label: "มาสาย" },
          ]}
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isLate"
            checked={form.isLate}
            onChange={(e) => onFormChange({ ...form, isLate: e.target.checked })}
            className="w-4 h-4 rounded border-[#d2d2d7]"
          />
          <label htmlFor="isLate" className="text-sm text-[#1d1d1f]">
            มาสาย
          </label>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <Button variant="secondary" onClick={onClose} className="flex-1">
          ยกเลิก
        </Button>
        <Button onClick={onSubmit} loading={saving} className="flex-1">
          บันทึก
        </Button>
      </div>
    </Modal>
  );
}
