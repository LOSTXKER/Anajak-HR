"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { TimeInput } from "@/components/ui/TimeInput";
import { RequestItem } from "@/lib/types/request";
import { calculateOTAmount, buildLocalISO } from "@/lib/utils/ot-calculator";

export interface ManualCompleteOTData {
  actual_start_time: string;
  actual_end_time: string;
  admin_note: string;
}

interface Props {
  request: RequestItem | null;
  baseSalary: number;
  daysPerMonth: number;
  hoursPerDay: number;
  processing?: boolean;
  onClose: () => void;
  onSubmit: (request: RequestItem, data: ManualCompleteOTData) => void;
}

export function ManualCompleteOTModal({
  request,
  baseSalary,
  daysPerMonth,
  hoursPerDay,
  processing,
  onClose,
  onSubmit,
}: Props) {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!request) return;
    const approvedStart = request.rawData.approved_start_time
      || request.rawData.requested_start_time;
    const approvedEnd = request.rawData.approved_end_time
      || request.rawData.requested_end_time;
    setStartTime(approvedStart ? format(new Date(approvedStart), "HH:mm") : "");
    setEndTime(approvedEnd ? format(new Date(approvedEnd), "HH:mm") : "");
    setNote("");
  }, [request]);

  const preview = useMemo(() => {
    if (!request || !startTime || !endTime) return null;
    const requestDate = request.rawData.request_date as string;
    const otRate = parseFloat(request.rawData.ot_rate ?? "1") || 1;
    const startISO = buildLocalISO(requestDate, startTime);
    const endISO = buildLocalISO(requestDate, endTime);
    if (new Date(endISO) <= new Date(startISO)) return null;
    const calc = calculateOTAmount({
      startTime: startISO,
      endTime: endISO,
      baseSalary,
      otRate,
      daysPerMonth,
      hoursPerDay,
    });
    return { ...calc, otRate };
  }, [request, startTime, endTime, baseSalary, daysPerMonth, hoursPerDay]);

  if (!request) return null;

  const canSubmit = !!startTime && !!endTime && note.trim().length > 0 && !!preview;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(request, {
      actual_start_time: startTime,
      actual_end_time: endTime,
      admin_note: note.trim(),
    });
  };

  return (
    <Modal isOpen={!!request} onClose={onClose} title="ปิด OT แบบ manual">
      <div className="space-y-4">
        <div className="p-3 bg-[#f5f5f7] rounded-xl">
          <p className="text-sm font-medium text-[#1d1d1f]">
            {request.employeeName}
          </p>
          <p className="text-xs text-[#86868b]">{request.employeeEmail}</p>
          <p className="text-xs text-[#86868b] mt-1">
            วันที่ OT:{" "}
            {format(new Date(request.rawData.request_date), "d MMMM yyyy", {
              locale: th,
            })}
          </p>
        </div>

        <div className="p-3 bg-[#ff9500]/10 rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-[#ff9500] mt-0.5 flex-shrink-0" />
          <p className="text-[13px] text-[#1d1d1f]">
            ปิด OT แทนพนักงาน เช่น พนักงานลืมกดเริ่ม/ปิด — ระบบจะตั้งเวลาจริง
            (actual) ตามที่กรอกและคำนวณยอดเงิน OT ทันที
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TimeInput
            label="เวลาเริ่ม (จริง)"
            value={startTime}
            onChange={setStartTime}
          />
          <TimeInput
            label="เวลาสิ้นสุด (จริง)"
            value={endTime}
            onChange={setEndTime}
          />
        </div>

        {preview && (
          <div className="p-3 bg-[#34c759]/10 rounded-xl space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-[#86868b]">ชั่วโมง OT:</span>
              <span className="font-medium">{preview.hours.toFixed(2)} ชม.</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#86868b]">อัตราคูณ:</span>
              <span className="font-medium">{preview.otRate}x</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-[#34c759]/20">
              <span className="text-[#86868b]">ยอด OT:</span>
              <span className="font-bold text-[#34c759] text-base">
                ฿
                {Number(preview.amount ?? 0).toLocaleString("th-TH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
            หมายเหตุ (จำเป็น)
          </label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="เช่น พนักงานลืมกดเริ่ม OT, ลืมกดปิด OT"
            rows={2}
          />
        </div>

        <div className="flex gap-2 pt-4 border-t border-[#e8e8ed]">
          <Button
            className="flex-1 bg-[#34c759] hover:bg-[#2db84e]"
            onClick={handleSubmit}
            disabled={!canSubmit || processing}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            {processing ? "กำลังปิด..." : "ยืนยันปิด OT"}
          </Button>
          <Button variant="text" onClick={onClose}>
            ยกเลิก
          </Button>
        </div>
      </div>
    </Modal>
  );
}
