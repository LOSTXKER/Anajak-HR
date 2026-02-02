"use client";

import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { formatCurrency, OTDetail, Employee } from "./types";

interface OTDetailModalProps {
  employee: Employee | null;
  currentMonth: Date;
  details: OTDetail[];
  loading: boolean;
  onClose: () => void;
}

export function OTDetailModal({
  employee,
  currentMonth,
  details,
  loading,
  onClose,
}: OTDetailModalProps) {
  if (!employee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center justify-between bg-[#fbfbfd]">
          <div>
            <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
              รายละเอียด OT
            </h3>
            <p className="text-[13px] text-[#86868b]">
              {employee.name} - {format(currentMonth, "MMMM yyyy", { locale: th })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#e8e8ed] rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-[#86868b]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-[#ff9500] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : details.length === 0 ? (
            <div className="text-center py-8 text-[#86868b]">
              ไม่มีรายการ OT
            </div>
          ) : (
            <div className="space-y-3">
              {details.map((ot) => (
                <div
                  key={ot.id}
                  className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[14px] font-medium text-[#1d1d1f]">
                        {format(new Date(ot.request_date), "d MMM", {
                          locale: th,
                        })}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                          ot.ot_rate >= 2
                            ? "bg-[#ff3b30]/10 text-[#ff3b30]"
                            : ot.ot_rate > 1
                              ? "bg-[#ff9500]/10 text-[#ff9500]"
                              : "bg-[#0071e3]/10 text-[#0071e3]"
                        }`}
                      >
                        {ot.ot_rate}x
                      </span>
                    </div>
                    <p className="text-[12px] text-[#86868b]">
                      {ot.ot_type === "holiday"
                        ? "วันหยุดนักขัตฤกษ์"
                        : ot.ot_type === "weekend"
                          ? "วันหยุดสุดสัปดาห์"
                          : "หลังเลิกงาน"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-semibold text-[#1d1d1f]">
                      ฿{formatCurrency(ot.ot_amount)}
                    </p>
                    <p className="text-[12px] text-[#86868b]">
                      {ot.actual_ot_hours} ชม.
                    </p>
                  </div>
                </div>
              ))}

              {/* Total Summary Row */}
              <div className="flex items-center justify-between p-3 mt-2 border-t border-[#e8e8ed]">
                <span className="text-[14px] font-semibold text-[#1d1d1f]">
                  รวมทั้งหมด
                </span>
                <span className="text-[15px] font-bold text-[#ff9500]">
                  ฿
                  {formatCurrency(
                    details.reduce((sum, item) => sum + item.ot_amount, 0)
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#fbfbfd] border-t border-[#e8e8ed]">
          <Button fullWidth onClick={onClose}>
            ปิด
          </Button>
        </div>
      </div>
    </div>
  );
}
