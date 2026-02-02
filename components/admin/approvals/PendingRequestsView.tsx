"use client";

import { Card } from "@/components/ui/Card";
import { Inbox } from "lucide-react";
import { RequestItem, ApprovalStats } from "./types";
import { ApprovalCard } from "./ApprovalCard";

interface PendingRequestsViewProps {
  requests: RequestItem[];
  stats: ApprovalStats;
  processingIds: Set<string>;
  onApprove: (request: RequestItem) => void;
  onReject: (request: RequestItem) => void;
}

export function PendingRequestsView({
  requests,
  stats,
  processingIds,
  onApprove,
  onReject,
}: PendingRequestsViewProps) {
  if (requests.length === 0) {
    return (
      <Card elevated className="!py-16">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#34c759]/10 rounded-full flex items-center justify-center">
            <Inbox className="w-8 h-8 text-[#34c759]" />
          </div>
          <h3 className="text-lg font-semibold text-[#1d1d1f] mb-1">
            ไม่มีคำขอรออนุมัติ
          </h3>
          <p className="text-sm text-[#86868b]">
            คุณจัดการคำขอทั้งหมดเรียบร้อยแล้ว 🎉
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {requests.map((request) => (
          <ApprovalCard
            key={`${request.type}_${request.id}`}
            request={request}
            mode="pending"
            isProcessing={processingIds.has(`${request.type}_${request.id}`)}
            onApprove={() => onApprove(request)}
            onReject={() => onReject(request)}
          />
        ))}
      </div>

      {/* Quick Stats Footer */}
      {stats.total > 0 && (
        <div className="fixed bottom-20 left-0 right-0 md:bottom-6 md:left-auto md:right-6 px-4 md:px-0">
          <Card
            elevated
            className="!p-3 !rounded-2xl shadow-xl border border-[#e8e8ed] md:w-auto inline-flex items-center gap-4 mx-auto md:mx-0"
          >
            <span className="text-sm text-[#86868b]">รอดำเนินการ</span>
            <span className="text-lg font-bold text-[#1d1d1f]">
              {stats.total}
            </span>
            <div className="flex items-center gap-1">
              {stats.ot > 0 && (
                <span
                  className="w-2 h-2 rounded-full bg-[#ff9500]"
                  title={`OT: ${stats.ot}`}
                />
              )}
              {stats.leave > 0 && (
                <span
                  className="w-2 h-2 rounded-full bg-[#0071e3]"
                  title={`ลา: ${stats.leave}`}
                />
              )}
              {stats.wfh > 0 && (
                <span
                  className="w-2 h-2 rounded-full bg-[#af52de]"
                  title={`WFH: ${stats.wfh}`}
                />
              )}
              {stats.late > 0 && (
                <span
                  className="w-2 h-2 rounded-full bg-[#ff3b30]"
                  title={`มาสาย: ${stats.late}`}
                />
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
