"use client";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Timer } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { getStatusBadge, getOTTypeLabel } from "./helpers";
import type { OTRecord } from "./types";

interface OTTabProps {
  data: OTRecord[];
}

export function OTTab({ data }: OTTabProps) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={Timer}
        title="ไม่มีข้อมูล OT"
        description="ไม่มีข้อมูล OT ในเดือนนี้"
      />
    );
  }

  return (
    <div className="space-y-2">
      {data.map((ot) => (
        <Card key={ot.id} elevated className="!p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] text-[#86868b]">
              {format(new Date(ot.request_date), "d MMM yyyy", { locale: th })}
            </p>
            {getStatusBadge(ot.status)}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[15px] font-medium text-[#1d1d1f]">
                {getOTTypeLabel(ot.ot_type)}
              </p>
              <p className="text-[13px] text-[#86868b] truncate max-w-[200px]">{ot.reason}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-[#ff9500]">
                {ot.actual_ot_hours?.toFixed(1) || ot.approved_ot_hours?.toFixed(1) || 0} ชม.
              </p>
              {ot.ot_amount && (
                <p className="text-sm font-semibold text-[#34c759]">฿{ot.ot_amount.toLocaleString()}</p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
