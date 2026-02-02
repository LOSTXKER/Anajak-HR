"use client";

import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Check, X, Ban } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { RequestItem, typeConfig, statusConfig } from "./types";

interface ApprovalCardProps {
  request: RequestItem;
  mode: "pending" | "history";
  isProcessing?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
}

export function ApprovalCard({
  request,
  mode,
  isProcessing = false,
  onApprove,
  onReject,
  onCancel,
}: ApprovalCardProps) {
  const config = typeConfig[request.type];
  const sConfig = statusConfig[request.status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Card
      elevated
      className={`!p-0 overflow-hidden ${
        mode === "pending" ? "hover:shadow-lg transition-shadow" : ""
      }`}
    >
      <div className="flex items-stretch">
        <div
          className={`w-1.5 ${mode === "pending" ? config.bgColor : sConfig.bgColor}`}
        />

        <div className="flex-1 p-4">
          <div className="flex items-start gap-3">
            <Avatar name={request.employeeName} size="md" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="text-[15px] font-semibold text-[#1d1d1f] truncate">
                  {request.employeeName}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${config.bgColor} ${config.color}`}
                >
                  <Icon className="w-3 h-3" />
                  {config.label}
                </span>
                {mode === "history" && (
                  <span
                    className={`px-2 py-0.5 rounded-md text-xs font-medium ${sConfig.bgColor} ${sConfig.color}`}
                  >
                    {sConfig.label}
                  </span>
                )}
              </div>

              <p className="text-[14px] font-medium text-[#1d1d1f]">
                {request.title}
              </p>
              <p className="text-[13px] text-[#86868b]">{request.subtitle}</p>

              {request.reason && mode === "pending" && (
                <p className="text-[12px] text-[#6e6e73] mt-1.5 line-clamp-2 bg-[#f5f5f7] rounded-lg px-2.5 py-1.5">
                  {request.reason}
                </p>
              )}

              {request.cancelReason && mode === "history" && (
                <p className="text-[12px] text-[#ff3b30] mt-1.5 bg-[#ff3b30]/10 rounded-lg px-2.5 py-1.5">
                  เหตุผลยกเลิก: {request.cancelReason}
                </p>
              )}

              <p className="text-[11px] text-[#86868b] mt-2">
                {formatDistanceToNow(new Date(request.createdAt), {
                  addSuffix: true,
                  locale: th,
                })}
              </p>
            </div>

            {/* Actions */}
            {mode === "pending" && (
              <div className="flex flex-col gap-2 ml-2">
                <button
                  onClick={onApprove}
                  disabled={isProcessing}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#34c759] text-white hover:bg-[#30b350] active:scale-95 transition-all disabled:opacity-50"
                  title="อนุมัติ"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={onReject}
                  disabled={isProcessing}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#ff3b30] text-white hover:bg-[#e0352b] active:scale-95 transition-all disabled:opacity-50"
                  title="ปฏิเสธ"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {mode === "history" && request.status === "approved" && (
              <button
                onClick={onCancel}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-[13px] font-medium text-[#ff3b30] bg-[#ff3b30]/10 hover:bg-[#ff3b30]/20 transition-colors"
                title="ยกเลิก"
              >
                <Ban className="w-4 h-4" />
                ยกเลิก
              </button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
