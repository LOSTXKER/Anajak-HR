"use client";

import { Eye, Check, X, Ban } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RequestItem, typeConfig, statusConfig } from "@/lib/types/request";

interface RequestListProps {
  requests: RequestItem[];
  loading?: boolean;
  processing?: boolean;
  onViewDetail: (request: RequestItem) => void;
  onApprove: (request: RequestItem) => void;
  onReject: (request: RequestItem) => void;
  onCancel: (request: RequestItem) => void;
}

export function RequestList({
  requests,
  loading,
  processing,
  onViewDetail,
  onApprove,
  onReject,
  onCancel,
}: RequestListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="text-[#86868b]">
          <p className="text-lg font-medium">ไม่พบข้อมูล</p>
          <p className="text-sm mt-1">ลองเปลี่ยนเงื่อนไขการค้นหา</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <RequestCard
          key={`${request.type}-${request.id}`}
          request={request}
          processing={processing}
          onViewDetail={onViewDetail}
          onApprove={onApprove}
          onReject={onReject}
          onCancel={onCancel}
        />
      ))}
    </div>
  );
}

// Individual Request Card
interface RequestCardProps {
  request: RequestItem;
  processing?: boolean;
  onViewDetail: (request: RequestItem) => void;
  onApprove: (request: RequestItem) => void;
  onReject: (request: RequestItem) => void;
  onCancel: (request: RequestItem) => void;
}

function RequestCard({
  request,
  processing,
  onViewDetail,
  onApprove,
  onReject,
  onCancel,
}: RequestCardProps) {
  const typeInfo = typeConfig[request.type];
  const statusInfo = statusConfig[request.status] || statusConfig.pending;
  const Icon = typeInfo.icon;
  const isPending = request.status === "pending";
  const canCancel =
    request.status === "pending" || request.status === "approved";

  return (
    <Card className="p-4 hover:shadow-md transition-all">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <Avatar name={request.employeeName} size="md" />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <h3 className="font-semibold text-[#1d1d1f] truncate">
                {request.employeeName}
              </h3>
              <p className="text-xs text-[#86868b]">{request.employeeEmail}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Type Badge */}
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${typeInfo.bgColor}`}
              >
                <Icon className={`w-3 h-3 ${typeInfo.color}`} />
                <span className={`text-xs font-medium ${typeInfo.color}`}>
                  {typeInfo.label}
                </span>
              </div>
              {/* Status Badge */}
              <Badge className={`${statusInfo.bgColor} ${statusInfo.color}`}>
                {statusInfo.label}
              </Badge>
            </div>
          </div>

          {/* Request Info */}
          <p className="text-sm font-medium text-[#1d1d1f]">{request.title}</p>
          <p className="text-xs text-[#86868b]">{request.subtitle}</p>

          {/* Reason */}
          {request.reason && (
            <p className="text-xs text-[#86868b] mt-1 line-clamp-1">
              เหตุผล: {request.reason}
            </p>
          )}

          {/* Cancel Info */}
          {request.status === "cancelled" && request.cancelReason && (
            <p className="text-xs text-[#ff3b30] mt-1">
              เหตุผลยกเลิก: {request.cancelReason}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="text"
            size="sm"
            onClick={() => onViewDetail(request)}
          >
            <Eye className="w-4 h-4" />
          </Button>

          {isPending && (
            <>
              <Button
                variant="text"
                size="sm"
                onClick={() => onApprove(request)}
                disabled={processing}
                className="text-[#34c759] hover:bg-[#34c759]/10"
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                variant="text"
                size="sm"
                onClick={() => onReject(request)}
                disabled={processing}
                className="text-[#ff3b30] hover:bg-[#ff3b30]/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          )}

          {canCancel && (
            <Button
              variant="text"
              size="sm"
              onClick={() => onCancel(request)}
              disabled={processing}
              className="text-[#86868b] hover:bg-[#86868b]/10"
            >
              <Ban className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
