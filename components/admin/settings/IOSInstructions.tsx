"use client";

import { Info, AlertTriangle } from "lucide-react";
import type { NotificationSettings } from "./types";

interface IOSInstructionsProps {
  settings: NotificationSettings;
}

export function IOSInstructions({ settings }: IOSInstructionsProps) {
  return (
    <div className="mt-6 p-5 bg-[#f5f5f7] rounded-2xl border-2 border-[#e8e8ed]">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 rounded-lg bg-[#86868b] flex items-center justify-center flex-shrink-0">
          <Info className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-[17px] font-bold text-[#1d1d1f] mb-1 flex items-center gap-2">
            PWA Notifications (ข้อมูลเพิ่มเติม)
            <span className="px-2 py-0.5 bg-[#86868b] text-white text-[10px] font-bold rounded">อ่านอย่างเดียว</span>
          </h3>
          <p className="text-[13px] text-[#86868b]">
            Reminder ส่วนตัวสำหรับพนักงาน - พนักงานตั้งค่าเองผ่านแอป
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-medium text-[#86868b]">⏰ เตือนเช็คอิน</span>
            <span className="text-[16px] font-bold text-[#0071e3]">{settings.workStartTime} น.</span>
          </div>
          <p className="text-[11px] text-[#86868b]">อิงตาม work_start_time</p>
        </div>

        <div className="p-4 bg-white rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-medium text-[#86868b]">🏠 เตือนเช็คเอาท์</span>
            <span className="text-[16px] font-bold text-[#ff9500]">{settings.workEndTime} น.</span>
          </div>
          <p className="text-[11px] text-[#86868b]">อิงตาม work_end_time</p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-[#ff9500]/10 rounded-xl border border-[#ff9500]/20">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-[#ff9500] mt-0.5 flex-shrink-0" />
          <div className="text-[12px] text-[#1d1d1f] space-y-1">
            <p><strong>หมายเหตุ:</strong> PWA Notifications มีข้อจำกัด</p>
            <ul className="list-disc list-inside text-[#86868b] space-y-0.5 ml-2">
              <li>ใช้ setTimeout (ไม่ persistent - หายเมื่อปิด browser)</li>
              <li>iOS ต้องติดตั้งแอป + ใช้ iOS 16.4+</li>
              <li>ทำงานได้ดีถ้าแอปเปิดอยู่</li>
            </ul>
            <p className="text-[#ff9500] font-semibold mt-2">
              💡 แนะนำใช้ LINE Notifications เป็นหลัก (มีประสิทธิภาพกว่า)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
