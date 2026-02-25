"use client";

import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { Check, X, Ban, Eye, Edit } from "lucide-react";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  RequestItem,
  typeConfig,
  statusConfig,
} from "@/lib/types/request";
import { canCancelRequest, canEditRequest } from "@/lib/hooks/use-request-filters";

interface RequestsTableProps {
  requests: RequestItem[];
  loading: boolean;
  processing: boolean;
  onViewDetail: (r: RequestItem) => void;
  onApprove: (r: RequestItem) => void;
  onReject: (r: RequestItem) => void;
  onCancel: (r: RequestItem) => void;
  onEdit: (r: RequestItem) => void;
}

export function RequestsTable({
  requests,
  loading,
  processing,
  onViewDetail,
  onApprove,
  onReject,
  onCancel,
  onEdit,
}: RequestsTableProps) {
  const columns: ColumnDef<RequestItem>[] = [
    {
      key: "employeeName",
      header: "พนักงาน",
      sortable: true,
      width: "200px",
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={r.employeeName} size="sm" />
          <div className="min-w-0">
            <p className="font-medium text-[#1d1d1f] truncate text-[13px]">{r.employeeName}</p>
            <p className="text-[11px] text-[#86868b] truncate">{r.employeeEmail}</p>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "ประเภท",
      sortable: true,
      width: "110px",
      cell: (r) => {
        const cfg = typeConfig[r.type];
        const Icon = cfg.icon;
        return (
          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${cfg.bgColor}`}>
            <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
            <span className={`text-[12px] font-medium ${cfg.color}`}>{cfg.label}</span>
          </div>
        );
      },
    },
    {
      key: "title",
      header: "รายละเอียด",
      sortable: false,
      cell: (r) => (
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[#1d1d1f] truncate max-w-[240px]">{r.title}</p>
          <p className="text-[11px] text-[#86868b] truncate max-w-[240px]">{r.subtitle}</p>
          {r.reason && (
            <p className="text-[11px] text-[#86868b] truncate max-w-[240px] mt-0.5">
              เหตุผล: {r.reason}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "สถานะ",
      sortable: true,
      width: "120px",
      cell: (r) => {
        const cfg = statusConfig[r.status] || statusConfig.pending;
        return (
          <span className={`px-2 py-1 rounded-lg text-[12px] font-medium ${cfg.bgColor} ${cfg.color}`}>
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: "date",
      header: "วันที่",
      sortable: true,
      width: "110px",
      cell: (r) => (
        <span className="text-[13px] text-[#1d1d1f] whitespace-nowrap">
          {(() => {
            try {
              return format(parseISO(r.date), "d MMM yy", { locale: th });
            } catch {
              return r.date;
            }
          })()}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "ส่งเมื่อ",
      sortable: true,
      width: "110px",
      cell: (r) => (
        <span className="text-[12px] text-[#86868b] whitespace-nowrap">
          {(() => {
            try {
              return format(parseISO(r.createdAt), "d MMM yy HH:mm", { locale: th });
            } catch {
              return "";
            }
          })()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "จัดการ",
      sortable: false,
      width: "140px",
      align: "center",
      cell: (r) => {
        const isPending = r.status === "pending";
        const canCancel = canCancelRequest(r.status);
        const canEdit = canEditRequest(r.status);

        return (
          <div className="flex items-center justify-center gap-0.5">
            {/* View */}
            <Button
              variant="text" size="sm"
              onClick={() => onViewDetail(r)}
              title="ดูรายละเอียด"
            >
              <Eye className="w-4 h-4 text-[#86868b]" />
            </Button>

            {/* Approve */}
            {isPending && (
              <Button
                variant="text" size="sm"
                onClick={() => onApprove(r)}
                disabled={processing}
                className="text-[#34c759] hover:bg-[#34c759]/10"
                title="อนุมัติ"
              >
                <Check className="w-4 h-4" />
              </Button>
            )}

            {/* Reject */}
            {isPending && (
              <Button
                variant="text" size="sm"
                onClick={() => onReject(r)}
                disabled={processing}
                className="text-[#ff3b30] hover:bg-[#ff3b30]/10"
                title="ปฏิเสธ"
              >
                <X className="w-4 h-4" />
              </Button>
            )}

            {/* Edit */}
            {canEdit && (
              <Button
                variant="text" size="sm"
                onClick={() => onEdit(r)}
                disabled={processing}
                className="text-[#0071e3] hover:bg-[#0071e3]/10"
                title="แก้ไข"
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}

            {/* Cancel */}
            {canCancel && (
              <Button
                variant="text" size="sm"
                onClick={() => onCancel(r)}
                disabled={processing}
                className="text-[#86868b] hover:bg-[#86868b]/10"
                title="ยกเลิก"
              >
                <Ban className="w-4 h-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={requests}
      loading={loading}
      rowKey={(r) => `${r.type}-${r.id}`}
      pageSize={25}
      emptyMessage="ไม่พบข้อมูลคำขอ"
      emptySubMessage="ลองเปลี่ยนเงื่อนไขการค้นหาหรือตัวกรอง"
    />
  );
}
