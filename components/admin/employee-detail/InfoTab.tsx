"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { X, Save } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Employee, Branch } from "./types";

interface InfoTabProps {
  employee: Employee;
  branches: Branch[];
  editMode: boolean;
  editForm: Partial<Employee>;
  saving: boolean;
  onEditFormChange: (form: Partial<Employee>) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function InfoTab({
  employee,
  branches,
  editMode,
  editForm,
  saving,
  onEditFormChange,
  onSave,
  onCancel,
}: InfoTabProps) {
  return (
    <Card elevated>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="font-semibold text-[#1d1d1f] border-b border-[#e8e8ed] pb-2">
            ข้อมูลพื้นฐาน
          </h3>
          {editMode ? (
            <>
              <Input
                label="ชื่อ-นามสกุล"
                value={editForm.name || ""}
                onChange={(e) =>
                  onEditFormChange({ ...editForm, name: e.target.value })
                }
              />
              <Input
                label="อีเมล"
                type="email"
                value={editForm.email || ""}
                onChange={(e) =>
                  onEditFormChange({ ...editForm, email: e.target.value })
                }
              />
              <Input
                label="เบอร์โทร"
                value={editForm.phone || ""}
                onChange={(e) =>
                  onEditFormChange({ ...editForm, phone: e.target.value })
                }
              />
              <Input
                label="ตำแหน่ง"
                value={editForm.position || ""}
                onChange={(e) =>
                  onEditFormChange({ ...editForm, position: e.target.value })
                }
              />
              <Select
                label="สาขา"
                value={editForm.branch_id || ""}
                onChange={(v) =>
                  onEditFormChange({ ...editForm, branch_id: v })
                }
                options={[
                  { value: "", label: "ไม่ระบุ" },
                  ...branches.map((b) => ({ value: b.id, label: b.name })),
                ]}
              />
            </>
          ) : (
            <div className="space-y-3">
              <InfoRow label="ชื่อ-นามสกุล" value={employee.name} />
              <InfoRow label="อีเมล" value={employee.email} />
              <InfoRow label="เบอร์โทร" value={employee.phone || "-"} />
              <InfoRow label="ตำแหน่ง" value={employee.position || "-"} />
              <InfoRow label="สาขา" value={employee.branch?.name || "-"} />
              <InfoRow
                label="วันเริ่มงาน"
                value={
                  employee.hire_date
                    ? format(new Date(employee.hire_date), "d MMMM yyyy", {
                        locale: th,
                      })
                    : "-"
                }
              />
            </div>
          )}
        </div>

        {/* Salary & Leave Quota */}
        <div className="space-y-4">
          <h3 className="font-semibold text-[#1d1d1f] border-b border-[#e8e8ed] pb-2">
            เงินเดือน & โควต้าลา
          </h3>
          {editMode ? (
            <>
              <Input
                label="เงินเดือน (฿)"
                type="number"
                value={editForm.base_salary?.toString() || ""}
                onChange={(e) =>
                  onEditFormChange({
                    ...editForm,
                    base_salary: parseFloat(e.target.value) || 0,
                  })
                }
              />
              <Input
                label="โควต้าลาป่วย (วัน)"
                type="number"
                value={editForm.sick_leave_quota?.toString() || ""}
                onChange={(e) =>
                  onEditFormChange({
                    ...editForm,
                    sick_leave_quota: parseInt(e.target.value) || 0,
                  })
                }
              />
              <Input
                label="โควต้าลากิจ (วัน)"
                type="number"
                value={editForm.personal_leave_quota?.toString() || ""}
                onChange={(e) =>
                  onEditFormChange({
                    ...editForm,
                    personal_leave_quota: parseInt(e.target.value) || 0,
                  })
                }
              />
              <Input
                label="โควต้าลาพักร้อน (วัน)"
                type="number"
                value={editForm.annual_leave_quota?.toString() || ""}
                onChange={(e) =>
                  onEditFormChange({
                    ...editForm,
                    annual_leave_quota: parseInt(e.target.value) || 0,
                  })
                }
              />
            </>
          ) : (
            <div className="space-y-3">
              <InfoRow
                label="เงินเดือน"
                value={`฿${employee.base_salary?.toLocaleString() || 0}`}
                valueClass="text-[#34c759]"
              />
              <InfoRow
                label="โควต้าลาป่วย"
                value={`${employee.sick_leave_quota || 0} วัน`}
              />
              <InfoRow
                label="โควต้าลากิจ"
                value={`${employee.personal_leave_quota || 0} วัน`}
              />
              <InfoRow
                label="โควต้าลาพักร้อน"
                value={`${employee.annual_leave_quota || 0} วัน`}
              />
            </div>
          )}
        </div>
      </div>

      {/* Edit Actions */}
      {editMode && (
        <div className="flex gap-3 mt-6 pt-6 border-t border-[#e8e8ed]">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            <X className="w-4 h-4" />
            ยกเลิก
          </Button>
          <Button onClick={onSave} loading={saving} className="flex-1">
            <Save className="w-4 h-4" />
            บันทึก
          </Button>
        </div>
      )}
    </Card>
  );
}

function InfoRow({
  label,
  value,
  valueClass = "text-[#1d1d1f]",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between py-2 border-b border-[#f5f5f7]">
      <span className="text-[#86868b]">{label}</span>
      <span className={`font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}
