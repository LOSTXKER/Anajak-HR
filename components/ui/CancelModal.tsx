"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Textarea } from "./Textarea";
import { AlertCircle, X } from "lucide-react";

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  title?: string;
  description?: string;
  requestType?: string;
}

export function CancelModal({
  isOpen,
  onClose,
  onConfirm,
  title = "ยกเลิกการอนุมัติ",
  description,
  requestType = "คำขอ",
}: CancelModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError("กรุณาระบุเหตุผลการยกเลิก");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await onConfirm(reason);
      setReason("");
      onClose();
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setReason("");
      setError("");
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidth="md">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#ff3b30]/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-[#ff3b30]" />
            </div>
            <div>
              <h2 className="text-[20px] font-semibold text-[#1d1d1f]">{title}</h2>
              <p className="text-[13px] text-[#86868b] mt-0.5">
                {description || `การดำเนินการนี้จะยกเลิกการอนุมัติ${requestType}ที่เลือก`}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="w-8 h-8 rounded-full hover:bg-[#f5f5f7] flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-[#86868b]" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="mb-4 p-3 bg-[#ff9500]/10 rounded-xl border border-[#ff9500]/20">
          <div className="flex gap-2">
            <AlertCircle className="w-5 h-5 text-[#ff9500] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[14px] font-medium text-[#ff9500]">คำเตือน</p>
              <ul className="text-[13px] text-[#86868b] mt-1 space-y-1 list-disc list-inside">
                <li>การยกเลิกจะเปลี่ยนสถานะเป็น "ยกเลิกแล้ว"</li>
                <li>ระบบจะบันทึกประวัติการยกเลิกไว้</li>
                <li>พนักงานจะได้รับการแจ้งเตือนผ่าน LINE (ถ้าเปิดใช้งาน)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Reason Input */}
        <div className="mb-6">
          <label className="block text-[15px] font-medium text-[#1d1d1f] mb-2">
            เหตุผลการยกเลิก <span className="text-[#ff3b30]">*</span>
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="เช่น: กดอนุมัติผิดพลาด, ข้อมูลไม่ถูกต้อง, เปลี่ยนแปลงแผนงาน"
            rows={4}
            disabled={loading}
            className="w-full"
          />
          <p className="text-[13px] text-[#86868b] mt-1">
            จำนวนตัวอักษร: {reason.length}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-[#ff3b30]/10 rounded-xl border border-[#ff3b30]/20">
            <p className="text-[14px] text-[#ff3b30]">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
            fullWidth
            size="lg"
          >
            ยกเลิก
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            loading={loading}
            disabled={!reason.trim()}
            fullWidth
            size="lg"
          >
            ยืนยันการยกเลิก
          </Button>
        </div>
      </div>
    </Modal>
  );
}

