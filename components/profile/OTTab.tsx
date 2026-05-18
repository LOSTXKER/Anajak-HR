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
            <div className="min-w-0 flex-1 pr-3">
              <p className="text-[15px] font-medium text-[#1d1d1f]">
                {getOTTypeLabel(ot.ot_type)}
              </p>
              <p className="text-[13px] text-[#86868b] truncate">{ot.reason}</p>
              {(ot.requested_start_time || ot.actual_start_time) && (
                <div className="mt-1.5 text-[12px] text-[#86868b] space-y-0.5">
                  {ot.requested_start_time && ot.requested_end_time && (
                    <p>
                      <span className="text-[#86868b]/70">ขอ:</span>{" "}
                      {format(new Date(ot.requested_start_time), "HH:mm")}-{format(new Date(ot.requested_end_time), "HH:mm")}
                    </p>
                  )}
                  {ot.actual_start_time && ot.actual_end_time && (
                    <p>
                      <span className="text-[#86868b]/70">ทำจริง:</span>{" "}
                      <span className="text-[#1d1d1f] font-medium">
                        {format(new Date(ot.actual_start_time), "HH:mm")}-{format(new Date(ot.actual_end_time), "HH:mm")}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold text-[#ff9500]">
                {ot.actual_ot_hours?.toFixed(2) || ot.approved_ot_hours?.toFixed(2) || 0} ชม.
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
