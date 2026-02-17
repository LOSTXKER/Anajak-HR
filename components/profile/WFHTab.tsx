"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Home, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { getStatusBadge } from "./helpers";
import type { WFHRecord } from "./types";

interface WFHTabProps {
  data: WFHRecord[];
  canceling: string | null;
  onCancel: (type: "wfh", id: string) => void;
}

export function WFHTab({ data, canceling, onCancel }: WFHTabProps) {
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <EmptyState
        icon={Home}
        title="ไม่มีข้อมูล WFH"
        description="ไม่มีข้อมูล WFH ในเดือนนี้"
      />
    );
  }

  return (
    <>
      <div className="space-y-2">
        {data.map((wfh) => (
          <Card key={wfh.id} elevated className="!p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[13px] text-[#86868b]">
                {format(new Date(wfh.date), "d MMM yyyy", { locale: th })}
              </p>
              {getStatusBadge(wfh.status)}
            </div>
            <p className="text-[15px] font-medium text-[#1d1d1f]">
              Work From Home {wfh.is_half_day && "(ครึ่งวัน)"}
            </p>
            <p className="text-[13px] text-[#86868b] mt-1">{wfh.reason}</p>
            {wfh.status === "pending" && (
              <button
                onClick={() => setCancelTarget(wfh.id)}
                disabled={canceling === wfh.id}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#ff3b30] bg-[#ff3b30]/10 rounded-lg hover:bg-[#ff3b30]/20 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {canceling === wfh.id ? "กำลังยกเลิก..." : "ยกเลิกคำขอ"}
              </button>
            )}
          </Card>
        ))}
      </div>

      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => {
          if (cancelTarget) {
            onCancel("wfh", cancelTarget);
            setCancelTarget(null);
          }
        }}
        title="ยกเลิกคำขอ WFH"
        message="ต้องการยกเลิกคำขอ WFH นี้หรือไม่?"
        type="danger"
        confirmText="ยกเลิกคำขอ"
        cancelText="ไม่ใช่"
        loading={!!canceling}
      />
    </>
  );
}
