"use client";

import { Card } from "@/components/ui/Card";
import { History } from "lucide-react";
import { RequestItem } from "./types";
import { ApprovalCard } from "./ApprovalCard";

interface ApprovalHistoryViewProps {
  requests: RequestItem[];
  onCancel: (request: RequestItem) => void;
}

export function ApprovalHistoryView({
  requests,
  onCancel,
}: ApprovalHistoryViewProps) {
  if (requests.length === 0) {
    return (
      <Card elevated className="!py-16">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#f5f5f7] rounded-full flex items-center justify-center">
            <History className="w-8 h-8 text-[#86868b]" />
          </div>
          <h3 className="text-lg font-semibold text-[#1d1d1f] mb-1">
            ไม่มีประวัติ
          </h3>
          <p className="text-sm text-[#86868b]">
            ยังไม่มีคำขอที่ดำเนินการแล้ว
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <ApprovalCard
          key={`${request.type}_${request.id}`}
          request={request}
          mode="history"
          onCancel={() => onCancel(request)}
        />
      ))}
    </div>
  );
}
