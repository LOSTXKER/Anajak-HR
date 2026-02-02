"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Trash2 } from "lucide-react";

interface DeleteModalProps {
  isOpen: boolean;
  itemName: string;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteModal({
  isOpen,
  itemName,
  deleting,
  onClose,
  onConfirm,
}: DeleteModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ยืนยันการลบ" size="sm">
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-full bg-[#ff3b30]/10 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-8 h-8 text-[#ff3b30]" />
        </div>
        <p className="text-[#1d1d1f] mb-2">
          ต้องการลบ <strong>{itemName}</strong> หรือไม่?
        </p>
        <p className="text-sm text-[#86868b]">
          การดำเนินการนี้ไม่สามารถย้อนกลับได้
        </p>
      </div>
      <div className="flex gap-3 mt-4">
        <Button variant="secondary" onClick={onClose} className="flex-1">
          ยกเลิก
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={deleting} className="flex-1">
          ลบ
        </Button>
      </div>
    </Modal>
  );
}
