"use client";

import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { X, Check, Edit, Ban, DollarSign, CheckCircle, XCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RequestItem, typeConfig, statusConfig } from "@/lib/types/request";

interface RequestDetailModalProps {
  request: RequestItem | null;
  processing?: boolean;
  onClose: () => void;
  onApprove: (request: RequestItem) => void;
  onReject: (request: RequestItem) => void;
  onEdit: (request: RequestItem) => void;
  onCancel: (request: RequestItem) => void;
}

export function RequestDetailModal({
  request,
  processing,
  onClose,
  onApprove,
  onReject,
  onEdit,
  onCancel,
}: RequestDetailModalProps) {
  if (!request) return null;

  const typeInfo = typeConfig[request.type];
  const statusInfo = statusConfig[request.status] || statusConfig.pending;
  const Icon = typeInfo.icon;
  const isPending = request.status === "pending";
  const isCompleted = request.status === "completed";
  const isRejected = request.status === "rejected";
  const canCancel =
    request.status === "pending" || request.status === "approved" || request.status === "completed";
  const canEdit =
    request.status === "pending" || request.status === "approved" || request.status === "completed";

  return (
    <Modal isOpen={!!request} onClose={onClose} title="รายละเอียดคำขอ">
      <div className="space-y-4">
        {/* Header with Type & Status */}
        <div className="flex items-center justify-between">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${typeInfo.bgColor}`}
          >
            <Icon className={`w-4 h-4 ${typeInfo.color}`} />
            <span className={`font-medium ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
          </div>
          <Badge className={`${statusInfo.bgColor} ${statusInfo.color}`}>
            {statusInfo.label}
          </Badge>
        </div>

        {/* Employee Info */}
        <div className="flex items-center gap-3 p-4 bg-[#f5f5f7] rounded-xl">
          <Avatar name={request.employeeName} size="lg" />
          <div>
            <h3 className="font-semibold text-[#1d1d1f]">
              {request.employeeName}
            </h3>
            <p className="text-sm text-[#86868b]">{request.employeeEmail}</p>
          </div>
        </div>

        {/* Request Details */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#86868b]">คำขอ</label>
            <p className="font-medium text-[#1d1d1f]">{request.title}</p>
            <p className="text-sm text-[#86868b]">{request.subtitle}</p>
          </div>

          {request.reason && (
            <div>
              <label className="text-xs text-[#86868b]">เหตุผล</label>
              <p className="text-sm text-[#1d1d1f]">{request.reason}</p>
            </div>
          )}

          {request.details && (
            <div>
              <label className="text-xs text-[#86868b]">รายละเอียด</label>
              <p className="text-sm text-[#1d1d1f] whitespace-pre-line">
                {request.details}
              </p>
            </div>
          )}

          <div>
            <label className="text-xs text-[#86868b]">วันที่ส่งคำขอ</label>
            <p className="text-sm text-[#1d1d1f]">
              {format(parseISO(request.createdAt), "d MMMM yyyy HH:mm", {
                locale: th,
              })}
            </p>
          </div>

          {/* OT Specific Info */}
          {request.type === "ot" && request.rawData && (
            <div className="p-3 bg-[#ff9500]/10 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#ff9500]" />
                <span className="text-sm font-medium text-[#ff9500]">
                  ข้อมูล OT
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-[#86868b]">ประเภท:</span>{" "}
                  <span className="font-medium">
                    {request.rawData.ot_type === "holiday"
                      ? "วันหยุด"
                      : request.rawData.ot_type === "weekend"
                      ? "วันหยุดสุดสัปดาห์"
                      : "วันทำงาน"}
                  </span>
                </div>
                <div>
                  <span className="text-[#86868b]">อัตราคูณ:</span>{" "}
                  <span className="font-medium">{request.rawData.ot_rate ?? "1.5"}x</span>
                </div>
                {/* Actual hours (for completed) vs approved hours */}
                {request.rawData.actual_ot_hours != null && (
                  <div>
                    <span className="text-[#86868b]">ชม.จริง:</span>{" "}
                    <span className="font-medium">{Number(request.rawData.actual_ot_hours).toFixed(2)} ชม.</span>
                  </div>
                )}
                {request.rawData.approved_ot_hours != null && (
                  <div>
                    <span className="text-[#86868b]">ชม.อนุมัติ:</span>{" "}
                    <span className="font-medium">{Number(request.rawData.approved_ot_hours).toFixed(2)} ชม.</span>
                  </div>
                )}
                {isCompleted && request.rawData.ot_amount != null && (
                  <div className="col-span-2 pt-1 border-t border-[#ff9500]/20">
                    <span className="text-[#86868b]">ยอดเงิน OT:</span>{" "}
                    <span className="font-bold text-[#ff9500] text-base">
                      ฿{Number(request.rawData.ot_amount).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {request.rawData.actual_ot_hours != null && request.rawData.ot_rate != null && (
                      <p className="text-[11px] text-[#86868b] mt-0.5">
                        = {Number(request.rawData.actual_ot_hours).toFixed(2)} ชม. × {request.rawData.ot_rate}x × อัตราต่อชั่วโมง
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Approval Info (for approved status) */}
          {request.approvedAt && !isRejected && (
            <div className="p-3 bg-[#34c759]/10 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-[#34c759]" />
                <span className="text-sm font-medium text-[#34c759]">
                  อนุมัติเมื่อ
                </span>
              </div>
              <p className="text-sm text-[#1d1d1f]">
                {format(parseISO(request.approvedAt), "d MMMM yyyy HH:mm", {
                  locale: th,
                })}
              </p>
              {request.approvedByName && (
                <p className="text-xs text-[#86868b] mt-1">
                  โดย: {request.approvedByName}
                </p>
              )}
            </div>
          )}

          {/* Rejection Info */}
          {isRejected && request.approvedAt && (
            <div className="p-3 bg-[#ff3b30]/10 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-[#ff3b30]" />
                <span className="text-sm font-medium text-[#ff3b30]">
                  ปฏิเสธเมื่อ
                </span>
              </div>
              <p className="text-sm text-[#1d1d1f]">
                {format(parseISO(request.approvedAt), "d MMMM yyyy HH:mm", {
                  locale: th,
                })}
              </p>
              {request.approvedByName && (
                <p className="text-xs text-[#86868b] mt-1">
                  โดย: {request.approvedByName}
                </p>
              )}
              {request.rejectReason && (
                <p className="text-sm text-[#1d1d1f] mt-1">
                  เหตุผล: {request.rejectReason}
                </p>
              )}
            </div>
          )}

          {/* Cancellation Info */}
          {request.status === "cancelled" && (
            <div className="p-3 bg-[#86868b]/10 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <Ban className="w-4 h-4 text-[#86868b]" />
                <span className="text-sm font-medium text-[#86868b]">
                  ถูกยกเลิก
                </span>
              </div>
              {request.cancelledAt && (
                <p className="text-sm text-[#1d1d1f]">
                  เมื่อ:{" "}
                  {format(parseISO(request.cancelledAt), "d MMMM yyyy HH:mm", {
                    locale: th,
                  })}
                </p>
              )}
              {request.cancelReason && (
                <p className="text-sm text-[#1d1d1f] mt-1">
                  เหตุผล: {request.cancelReason}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-[#e8e8ed]">
          {isPending && (
            <>
              <Button
                className="flex-1 bg-[#34c759] hover:bg-[#2db84e]"
                onClick={() => onApprove(request)}
                disabled={processing}
              >
                <Check className="w-4 h-4 mr-1" />
                อนุมัติ
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => onReject(request)}
                disabled={processing}
              >
                <X className="w-4 h-4 mr-1" />
                ปฏิเสธ
              </Button>
            </>
          )}

          {canEdit && (
            <Button variant="secondary" onClick={() => onEdit(request)}>
              <Edit className="w-4 h-4" />
            </Button>
          )}

          {canCancel && (
            <Button
              variant="secondary"
              onClick={() => onCancel(request)}
              disabled={processing}
            >
              <Ban className="w-4 h-4" />
            </Button>
          )}

          <Button variant="text" onClick={onClose}>
            ปิด
          </Button>
        </div>
      </div>
    </Modal>
  );
}
