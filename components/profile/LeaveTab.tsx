"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Calendar, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { getStatusBadge, getLeaveTypeLabel } from "./helpers";
import type { LeaveRecord } from "./types";

interface LeaveTabProps {
  data: LeaveRecord[];
  canceling: string | null;
  onCancel: (type: "leave", id: string) => void;
}

export function LeaveTab({ data, canceling, onCancel }: LeaveTabProps) {
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="ไม่มีข้อมูลการลา"
        description="ไม่มีข้อมูลการลาในเดือนนี้"
      />
    );
  }

  return (
    <>
      <div className="space-y-2">
        {data.map((leave) => (
          <Card key={leave.id} elevated className="!p-4">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="info">{getLeaveTypeLabel(leave.leave_type)}</Badge>
              {getStatusBadge(leave.status)}
            </div>
            <p className="text-[15px] font-medium text-[#1d1d1f]">
              {format(new Date(leave.start_date), "d MMM", { locale: th })}
              {leave.start_date !== leave.end_date && (
                <> - {format(new Date(leave.end_date), "d MMM", { locale: th })}</>
              )}
              {leave.is_half_day && " (ครึ่งวัน)"}
            </p>
            <p className="text-[13px] text-[#86868b] mt-1">{leave.reason}</p>
            {leave.status === "pending" && (
              <button
                onClick={() => setCancelTarget(leave.id)}
                disabled={canceling === leave.id}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#ff3b30] bg-[#ff3b30]/10 rounded-lg hover:bg-[#ff3b30]/20 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {canceling === leave.id ? "กำลังยกเลิก..." : "ยกเลิกคำขอ"}
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
            onCancel("leave", cancelTarget);
            setCancelTarget(null);
          }
        }}
        title="ยกเลิกคำขอลา"
        message="ต้องการยกเลิกคำขอลานี้หรือไม่?"
        type="danger"
        confirmText="ยกเลิกคำขอ"
        cancelText="ไม่ใช่"
        loading={!!canceling}
      />
    </>
  );
}
