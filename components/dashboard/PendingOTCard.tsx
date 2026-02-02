"use client";

import Link from "next/link";
import { Timer, Play } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { format } from "date-fns";

interface OTRequest {
  id: string;
  requested_start_time?: string;
  requested_end_time?: string;
  reason?: string;
  [key: string]: any;
}

interface PendingOTCardProps {
  pendingOT: OTRequest[];
  activeOT: OTRequest | null | undefined;
}

export function PendingOTCard({ pendingOT, activeOT }: PendingOTCardProps) {
  // Don't show if no pending OT or there's an active OT
  if (pendingOT.length === 0 || activeOT) {
    return null;
  }

  return (
    <div className="rounded-2xl p-5 mb-4 bg-[#f0fdf4] border border-[#bbf7d0]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-[#22c55e]" />
          <span className="text-[13px] text-[#15803d] font-medium">
            OT พร้อมเริ่มวันนี้
          </span>
        </div>
        <Badge className="bg-[#dcfce7] text-[#15803d] border-[#bbf7d0]">
          {pendingOT.length} รายการ
        </Badge>
      </div>

      <div className="space-y-3">
        {pendingOT.map((ot) => (
          <div
            key={ot.id}
            className="bg-white rounded-xl p-4 border border-[#e5e7eb]"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[15px] font-semibold text-[#1d1d1f]">
                  {ot.requested_start_time && format(new Date(ot.requested_start_time), "HH:mm")} -{" "}
                  {ot.requested_end_time && format(new Date(ot.requested_end_time), "HH:mm")} น.
                </p>
                <p className="text-[13px] text-[#6e6e73] line-clamp-1">
                  {ot.reason || "-"}
                </p>
              </div>
            </div>
            <Link href={`/ot/start/${ot.id}`}>
              <button className="w-full py-2.5 bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
                <Play className="w-4 h-4" />
                เริ่ม OT
              </button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
