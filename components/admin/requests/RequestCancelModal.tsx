"use client";

import { useState } from "react";
import { Ban, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { RequestItem, typeConfig } from "./types";

interface RequestCancelModalProps {
  request: RequestItem | null;
  processing?: boolean;
  onClose: () => void;
  onConfirm: (request: RequestItem, reason: string) => void;
}

export function RequestCancelModal({
  request,
  processing,
  onClose,
  onConfirm,
}: RequestCancelModalProps) {
  const [cancelReason, setCancelReason] = useState("");

  if (!request) return null;

  const typeInfo = typeConfig[request.type];

  const handleConfirm = () => {
    if (cancelReason.trim()) {
      onConfirm(request, cancelReason.trim());
      setCancelReason("");
    }
  };

  const handleClose = () => {
    setCancelReason("");
    onClose();
  };

  return (
    <Modal isOpen={!!request} onClose={handleClose} title="ยกเลิกคำขอ">
      <div className="space-y-4">
        {/* Warning */}
        <div className="flex items-start gap-3 p-4 bg-[#ff3b30]/10 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-[#ff3b30] flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-[#ff3b30]">ยืนยันการยกเลิก?</p>
            <p className="text-sm text-[#1d1d1f] mt-1">
              คุณกำลังจะยกเลิก <strong>{typeInfo.label}</strong> ของ{" "}
              <strong>{request.employeeName}</strong>
            </p>
          </div>
        </div>

        {/* Request Summary */}
        <div className="p-3 bg-[#f5f5f7] rounded-xl">
          <p className="text-sm font-medium text-[#1d1d1f]">{request.title}</p>
          <p className="text-xs text-[#86868b]">{request.subtitle}</p>
        </div>

        {/* Cancel Reason */}
        <div>
          <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
            เหตุผลในการยกเลิก <span className="text-[#ff3b30]">*</span>
          </label>
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="กรุณาระบุเหตุผลในการยกเลิก..."
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="danger"
            className="flex-1"
            onClick={handleConfirm}
            disabled={!cancelReason.trim() || processing}
          >
            <Ban className="w-4 h-4 mr-1" />
            {processing ? "กำลังยกเลิก..." : "ยืนยันยกเลิก"}
          </Button>
          <Button variant="secondary" onClick={handleClose} disabled={processing}>
            ไม่ใช่
          </Button>
        </div>
      </div>
    </Modal>
  );
}
