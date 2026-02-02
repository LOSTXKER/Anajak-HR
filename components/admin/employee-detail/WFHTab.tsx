"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Home } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { WFHRecord, getStatusBadgeVariant, getStatusLabel } from "./types";

interface WFHTabProps {
  data: WFHRecord[];
  onDelete: (id: string, name: string) => void;
}

export function WFHTab({ data, onDelete }: WFHTabProps) {
  if (data.length === 0) {
    return (
      <Card elevated padding="none">
        <div className="text-center py-16 text-[#86868b]">
          <Home className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>ไม่มีข้อมูล WFH ในเดือนนี้</p>
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
              <th className="text-left px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">
                เหตุผล
              </th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">
                สถานะ
              </th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8e8ed]">
            {data.map((wfh) => (
              <tr key={wfh.id} className="hover:bg-[#f5f5f7]/50">
                <td className="px-4 py-3 text-sm font-medium text-[#1d1d1f]">
                  {format(new Date(wfh.date), "d MMM yyyy", { locale: th })}
                </td>
                <td className="text-center px-3 py-3 text-sm text-[#1d1d1f]">
                  {wfh.is_half_day ? "ครึ่งวัน" : "เต็มวัน"}
                </td>
                <td className="px-3 py-3 text-sm text-[#86868b] max-w-[200px] truncate">
                  {wfh.reason || "-"}
                </td>
                <td className="text-center px-3 py-3">
                  <Badge variant={getStatusBadgeVariant(wfh.status)}>
                    {getStatusLabel(wfh.status)}
                  </Badge>
                </td>
                <td className="text-right px-4 py-3">
                  {wfh.status === "pending" && (
                    <button
                      onClick={() =>
                        onDelete(
                          wfh.id,
                          `WFH ${format(new Date(wfh.date), "d MMM", {
                            locale: th,
                          })}`
                        )
                      }
                      className="text-xs text-[#ff3b30] hover:underline"
                    >
                      ยกเลิก
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
