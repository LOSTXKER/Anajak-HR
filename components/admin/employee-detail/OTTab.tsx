"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Timer } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { OTRecord, getOTTypeLabel, getStatusBadgeVariant, getStatusLabel } from "./types";

interface OTTabProps {
  data: OTRecord[];
  onDelete: (id: string, name: string) => void;
}

export function OTTab({ data, onDelete }: OTTabProps) {
  if (data.length === 0) {
    return (
      <Card elevated padding="none">
        <div className="text-center py-16 text-[#86868b]">
          <Timer className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>ไม่มีข้อมูล OT ในเดือนนี้</p>
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
                ประเภท
              </th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">
                ชม.
              </th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">
                อัตรา
              </th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">
                เงิน
              </th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">
                สถานะ
              </th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8e8ed]">
            {data.map((ot) => (
              <tr key={ot.id} className="hover:bg-[#f5f5f7]/50">
                <td className="px-4 py-3 text-sm font-medium text-[#1d1d1f]">
                  {format(new Date(ot.request_date), "d MMM yyyy", {
                    locale: th,
                  })}
                </td>
                <td className="text-center px-3 py-3 text-sm text-[#1d1d1f]">
                  {getOTTypeLabel(ot.ot_type)}
                </td>
                <td className="text-center px-3 py-3 text-sm font-semibold text-[#0071e3]">
                  {ot.actual_ot_hours?.toFixed(1) ||
                    ot.approved_ot_hours?.toFixed(1) ||
                    "-"}
                </td>
                <td className="text-center px-3 py-3 text-sm text-[#86868b]">
                  {ot.ot_rate?.toFixed(1)}x
                </td>
                <td className="text-right px-3 py-3 text-sm font-semibold text-[#34c759]">
                  ฿{ot.ot_amount?.toLocaleString() || 0}
                </td>
                <td className="text-center px-3 py-3">
                  <Badge variant={getStatusBadgeVariant(ot.status)}>
                    {getStatusLabel(ot.status)}
                  </Badge>
                </td>
                <td className="text-right px-4 py-3">
                  <button
                    onClick={() =>
                      onDelete(
                        ot.id,
                        `OT ${format(new Date(ot.request_date), "d MMM", {
                          locale: th,
                        })}`
                      )
                    }
                    className="text-xs text-[#ff3b30] hover:underline"
                  >
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
