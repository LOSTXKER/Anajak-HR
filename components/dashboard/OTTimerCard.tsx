"use client";

import Link from "next/link";
import { Timer } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { format } from "date-fns";

interface ActiveOT {
  id: string;
  actual_start_time?: string | null;
  ot_rate?: number | null;
  reason?: string;
  [key: string]: any;
}

interface OTTimerCardProps {
  activeOT: ActiveOT | null | undefined;
  otDuration: string;
}

export function OTTimerCard({ activeOT, otDuration }: OTTimerCardProps) {
  if (!activeOT) {
    return null;
  }

  return (
    <div className="rounded-2xl p-5 mb-4 bg-gradient-to-br from-[#ff9500] to-[#ff6b00]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-white/80" />
          <span className="text-[13px] text-white/80 font-medium">
            กำลังทำ OT
          </span>
        </div>
        <Badge className="bg-white/20 text-white border-0">
          {activeOT.ot_rate || 1.5}x
        </Badge>
      </div>

      <div className="text-center mb-4">
        <p className="text-[42px] font-bold text-white tracking-tight font-mono">
          {otDuration}
        </p>
        <p className="text-[13px] text-white/60">
          เริ่ม{" "}
          {activeOT.actual_start_time
            ? format(new Date(activeOT.actual_start_time), "HH:mm")
            : "-"}{" "}
          น.
        </p>
      </div>

      <Link href={`/ot/end/${activeOT.id}`}>
        <button className="w-full py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
          จบ OT
        </button>
      </Link>
    </div>
  );
}
