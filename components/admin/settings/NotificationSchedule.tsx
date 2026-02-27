"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SettingsToggle } from "./SettingsToggle";
import { TimeInput } from "@/components/ui/TimeInput";
import { Timer, Bell, Save, Info, Clock } from "lucide-react";
import type { NotificationSettings } from "./types";

interface NotificationScheduleProps {
  settings: NotificationSettings;
  onChange: (updates: Partial<NotificationSettings>) => void;
  onSave: () => void;
  saving: boolean;
}

export function NotificationSchedule({
  settings,
  onChange,
  onSave,
  saving,
}: NotificationScheduleProps) {
  return (
    <div className="space-y-6">
      {/* Auto-checkout */}
      <Card elevated>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#af52de]/10 rounded-xl flex items-center justify-center">
            <Timer className="w-5 h-5 text-[#af52de]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">Auto Check-out</h3>
              <span className="px-2 py-0.5 bg-[#34c759] text-white text-[10px] font-bold rounded">LINE</span>
            </div>
            <p className="text-[13px] text-[#86868b]">เช็คเอาท์อัตโนมัติสำหรับคนลืม</p>
          </div>
        </div>

        <div className="space-y-4">
          <SettingsToggle
            label="เปิด Auto Check-out"
            description="ระบบจะเช็คเอาท์ให้อัตโนมัติ"
            enabled={settings.autoCheckoutEnabled}
            onChange={() => onChange({ autoCheckoutEnabled: !settings.autoCheckoutEnabled })}
          />

          {settings.autoCheckoutEnabled && (
            <div className="space-y-4">
              <div>
                <TimeInput
                  label="เวลาที่ระบบรัน Auto Check-out"
                  value={settings.autoCheckoutTime}
                  onChange={(val) => onChange({ autoCheckoutTime: val })}
                />
                <p className="text-[11px] text-[#86868b] mt-1.5 flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>
                    ระบบจะรันทุกวันตามเวลานี้ แต่บันทึกเวลาเช็คเอาท์เป็น
                    <strong> เวลาเลิกงาน ({settings.workEndTime} น.)</strong>
                  </span>
                </p>
              </div>

              <div className="border-t border-[#e5e5ea] pt-4 space-y-3">
                <SettingsToggle
                  label="ข้ามถ้ากำลังทำ OT"
                  description="ไม่ auto checkout พนักงานที่มี OT อนุมัติแล้ว"
                  enabled={settings.autoCheckoutSkipIfOt}
                  onChange={() => onChange({ autoCheckoutSkipIfOt: !settings.autoCheckoutSkipIfOt })}
                />

                <SettingsToggle
                  label="แจ้ง Admin เมื่อ Auto Check-out"
                  description="ส่ง LINE สรุปให้ Admin ทุกครั้งที่มี Auto Checkout"
                  enabled={settings.notifyAdminOnAutoCheckout}
                  onChange={() => onChange({ notifyAdminOnAutoCheckout: !settings.notifyAdminOnAutoCheckout })}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Reminder Settings */}
      <Card elevated>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#5ac8fa]/10 rounded-xl flex items-center justify-center">
            <Bell className="w-5 h-5 text-[#5ac8fa]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">เตือนลืมเช็คเอาท์</h3>
              <span className="px-2 py-0.5 bg-[#ff9500] text-white text-[10px] font-bold rounded">เร็วๆ นี้</span>
            </div>
            <p className="text-[13px] text-[#86868b]">ส่ง LINE เตือนก่อน Auto Check-out</p>
          </div>
        </div>

        <div className="space-y-4 opacity-60 pointer-events-none">
          <SettingsToggle
            label="เปิดการเตือน"
            enabled={settings.reminderEnabled}
            onChange={() => onChange({ reminderEnabled: !settings.reminderEnabled })}
            disabled
          />

          {settings.reminderEnabled && (
            <div className="space-y-3">
              <label className="block text-[13px] font-medium text-[#1d1d1f]">
                เตือนก่อน Auto Check-out (นาที)
              </label>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Clock className="w-3 h-3 text-[#86868b]" />
                    <span className="text-[11px] text-[#86868b]">ครั้งที่ 1</span>
                  </div>
                  <input
                    type="number"
                    min="5"
                    value={settings.reminderFirstMinutes}
                    disabled
                    className="w-full px-3 py-2.5 bg-[#f5f5f7] rounded-xl text-[14px] text-center"
                  />
                </div>
                <div className="relative">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Clock className="w-3 h-3 text-[#86868b]" />
                    <span className="text-[11px] text-[#86868b]">ครั้งที่ 2</span>
                  </div>
                  <input
                    type="number"
                    min="5"
                    value={settings.reminderSecondMinutes}
                    disabled
                    className="w-full px-3 py-2.5 bg-[#f5f5f7] rounded-xl text-[14px] text-center"
                  />
                </div>
                <div className="relative">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Clock className="w-3 h-3 text-[#86868b]" />
                    <span className="text-[11px] text-[#86868b]">ครั้งที่ 3</span>
                  </div>
                  <input
                    type="number"
                    min="5"
                    value={settings.reminderThirdMinutes}
                    disabled
                    className="w-full px-3 py-2.5 bg-[#f5f5f7] rounded-xl text-[14px] text-center"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 p-3 bg-[#ff9500]/5 rounded-xl border border-[#ff9500]/20">
          <p className="text-[12px] text-[#ff9500] flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 flex-shrink-0" />
            ฟีเจอร์เตือนก่อน Auto Check-out กำลังพัฒนา จะเปิดให้ใช้งานเร็วๆ นี้
          </p>
        </div>
      </Card>

      {/* Save Button */}
      <Button
        onClick={onSave}
        size="lg"
        loading={saving}
        fullWidth
        icon={!saving ? <Save className="w-5 h-5" /> : undefined}
      >
        {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
      </Button>
    </div>
  );
}
