"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { UserMinus, AlertTriangle } from "lucide-react";
import { Employee, ResignFormData } from "./types";

interface ResignationModalProps {
  employee: Employee | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: (formData: ResignFormData) => void;
}

export function ResignationModal({
  employee,
  saving,
  onClose,
  onConfirm,
}: ResignationModalProps) {
  const today = new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState<ResignFormData>({
    type: "resigned",
    resignationDate: today,
    lastWorkingDate: today,
    reason: "",
  });

  const handleSubmit = () => {
    if (!formData.resignationDate || !formData.lastWorkingDate) return;
    onConfirm(formData);
  };

  // Reset form when modal opens with new employee
  const handleClose = () => {
    setFormData({
      type: "resigned",
      resignationDate: today,
      lastWorkingDate: today,
      reason: "",
    });
    onClose();
  };

  if (!employee) return null;

  return (
    <Modal
      isOpen={!!employee}
      onClose={handleClose}
      title="พนักงานออกจากงาน"
      size="md"
    >
      <div className="space-y-5">
        {/* Warning */}
        <div className="flex items-start gap-3 p-4 bg-[#ff9500]/10 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-[#ff9500] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[14px] font-medium text-[#1d1d1f]">
              กำลังดำเนินการให้ &quot;{employee.name}&quot; ออกจากงาน
            </p>
            <p className="text-[13px] text-[#86868b] mt-1">
              ข้อมูลประวัติทั้งหมด (เงินเดือน, OT, วันลา, การเข้างาน) จะยังคงอยู่
              และสามารถรับกลับเข้าทำงานได้ในภายหลัง
            </p>
          </div>
        </div>

        {/* Type */}
        <div>
          <Select
            label="ประเภท"
            value={formData.type}
            onChange={(val) =>
              setFormData((f) => ({
                ...f,
                type: val as "resigned" | "terminated",
              }))
            }
            options={[
              { value: "resigned", label: "ลาออก" },
              { value: "terminated", label: "เลิกจ้าง / ไล่ออก" },
            ]}
          />
        </div>

        {/* Resignation Date */}
        <div>
          <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
            วันที่ยื่นออก
          </label>
          <input
            type="date"
            value={formData.resignationDate}
            onChange={(e) =>
              setFormData((f) => ({ ...f, resignationDate: e.target.value }))
            }
            className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all outline-none"
          />
        </div>

        {/* Last Working Date */}
        <div>
          <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
            วันทำงานวันสุดท้าย
          </label>
          <input
            type="date"
            value={formData.lastWorkingDate}
            onChange={(e) =>
              setFormData((f) => ({ ...f, lastWorkingDate: e.target.value }))
            }
            className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all outline-none"
          />
        </div>

        {/* Reason */}
        <div>
          <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
            เหตุผล (ไม่บังคับ)
          </label>
          <textarea
            value={formData.reason}
            onChange={(e) =>
              setFormData((f) => ({ ...f, reason: e.target.value }))
            }
            rows={3}
            placeholder="ระบุเหตุผล..."
            className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all outline-none resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={handleClose}
            fullWidth
            disabled={saving}
          >
            ยกเลิก
          </Button>
          <Button
            variant="danger"
            onClick={handleSubmit}
            fullWidth
            loading={saving}
            disabled={!formData.resignationDate || !formData.lastWorkingDate}
          >
            <UserMinus className="w-4 h-4" />
            ยืนยันออกจากงาน
          </Button>
        </div>
      </div>
    </Modal>
  );
}
