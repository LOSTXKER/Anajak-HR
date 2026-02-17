"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { RequestItem, typeConfig } from "@/lib/types/request";

interface RejectReasonModalProps {
  request: RequestItem | null;
  processing?: boolean;
  onClose: () => void;
  onConfirm: (request: RequestItem, reason: string) => void;
}

export function RejectReasonModal({
  request,
  processing,
  onClose,
  onConfirm,
}: RejectReasonModalProps) {
  const [reason, setReason] = useState("");

  if (!request) return null;

  const typeInfo = typeConfig[request.type];

  const handleConfirm = () => {
    onConfirm(request, reason.trim());
    setReason("");
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <Modal isOpen={!!request} onClose={handleClose} title="ปฏิเสธคำขอ">
      <div className="space-y-4">
        {/* Warning */}
        <div className="flex items-start gap-3 p-4 bg-[#ff3b30]/10 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-[#ff3b30] flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-[#ff3b30]">ยืนยันการปฏิเสธ?</p>
            <p className="text-sm text-[#1d1d1f] mt-1">
              คุณกำลังจะปฏิเสธ <strong>{typeInfo.label}</strong> ของ{" "}
              <strong>{request.employeeName}</strong>
            </p>
          </div>
        </div>

        {/* Request Summary */}
        <div className="p-3 bg-[#f5f5f7] rounded-xl">
          <p className="text-sm font-medium text-[#1d1d1f]">{request.title}</p>
          <p className="text-xs text-[#86868b]">{request.subtitle}</p>
        </div>

        {/* Rejection Reason */}
        <div>
          <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
            เหตุผลในการปฏิเสธ
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="ระบุเหตุผล (ไม่บังคับ) เช่น: ข้อมูลไม่ถูกต้อง, เกินโควต้า"
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="danger"
            className="flex-1"
            onClick={handleConfirm}
            disabled={processing}
          >
            <X className="w-4 h-4 mr-1" />
            {processing ? "กำลังปฏิเสธ..." : "ยืนยันปฏิเสธ"}
          </Button>
          <Button variant="secondary" onClick={handleClose} disabled={processing}>
            ยกเลิก
          </Button>
        </div>
      </div>
    </Modal>
  );
}
