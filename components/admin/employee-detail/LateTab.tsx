"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { LateRequestRecord, getStatusBadgeVariant, getStatusLabel } from "./types";

interface LateTabProps {
  data: LateRequestRecord[];
}

export function LateTab({ data }: LateTabProps) {
  if (data.length === 0) {
    return (
      <Card elevated padding="none">
        <div className="text-center py-16 text-[#86868b]">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>ไม่มีคำขอมาสายในเดือนนี้</p>
        </div>
      </Card>
    );
  }

  return (
    <Card elevated padding="none">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#e8e8ed] bg-[#f9f9fb]">
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#86868b] uppercase">
                วันที่
              </th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">
                สาย (นาที)
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">
                เหตุผล
              </th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">
                สถานะ
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8e8ed]">
            {data.map((late) => (
              <tr key={late.id} className="hover:bg-[#f5f5f7]/50">
                <td className="px-4 py-3 text-sm font-medium text-[#1d1d1f]">
                  {format(new Date(late.request_date), "d MMM yyyy", {
                    locale: th,
                  })}
                </td>
                <td className="text-center px-3 py-3 text-sm text-[#ff9500] font-medium">
                  {late.actual_late_minutes != null
                    ? `${late.actual_late_minutes} นาที`
                    : "-"}
                </td>
                <td className="px-3 py-3 text-sm text-[#86868b] max-w-[200px] truncate">
                  {late.reason || "-"}
                </td>
                <td className="text-center px-3 py-3">
                  <Badge variant={getStatusBadgeVariant(late.status)}>
                    {getStatusLabel(late.status)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
