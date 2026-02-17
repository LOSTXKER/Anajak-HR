"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Clock, Camera } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import type { AttendanceRecord } from "./types";

interface AttendanceTabProps {
  data: AttendanceRecord[];
  onViewPhoto: (url: string, type: string) => void;
}

export function AttendanceTab({ data, onViewPhoto }: AttendanceTabProps) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="ไม่มีข้อมูลการเข้างาน"
        description="ไม่มีข้อมูลการเข้างานในเดือนนี้"
      />
    );
  }

  return (
    <div className="space-y-2">
      {data.map((att) => (
        <Card key={att.id} elevated className="!p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[13px] text-[#86868b]">
                {format(new Date(att.work_date), "d MMM yyyy", { locale: th })}
              </p>
              <p className="text-[15px] font-medium text-[#1d1d1f]">
                {att.clock_in_time ? format(new Date(att.clock_in_time), "HH:mm") : "-"}
                {att.clock_out_time && ` - ${format(new Date(att.clock_out_time), "HH:mm")}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-[#0071e3]">{att.total_hours?.toFixed(1) || 0} ชม.</p>
              {att.is_late ? (
                <Badge variant="warning">สาย {att.late_minutes}น.</Badge>
              ) : (
                <Badge variant="success">ปกติ</Badge>
              )}
            </div>
          </div>
          {(att.clock_in_photo_url || att.clock_out_photo_url) && (
            <div className="flex gap-2 pt-2 border-t border-[#e8e8ed]">
              {att.clock_in_photo_url && (
                <button
                  onClick={() => onViewPhoto(att.clock_in_photo_url!, "เข้างาน")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0071e3] bg-[#0071e3]/10 rounded-lg hover:bg-[#0071e3]/20 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  รูปเข้างาน
                </button>
              )}
              {att.clock_out_photo_url && (
                <button
                  onClick={() => onViewPhoto(att.clock_out_photo_url!, "ออกงาน")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#34c759] bg-[#34c759]/10 rounded-lg hover:bg-[#34c759]/20 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  รูปออกงาน
                </button>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
