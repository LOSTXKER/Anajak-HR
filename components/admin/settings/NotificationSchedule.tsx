"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SettingsToggle } from "./SettingsToggle";
import { TimeInput } from "@/components/ui/TimeInput";
import { Timer, AlertTriangle, Save, Info } from "lucide-react";
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
            <>
              <div className="grid grid-cols-2 gap-4">
                <TimeInput
                  label="เวลา Auto Check-out"
                  value={settings.autoCheckoutTime}
                  onChange={(val) => onChange({ autoCheckoutTime: val })}
                />
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                    หลังเลิกงาน (ชม.)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={settings.autoCheckoutDelayHours}
                    onChange={(e) => onChange({ autoCheckoutDelayHours: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                  />
                </div>
              </div>

              <SettingsToggle
                label="ข้ามถ้ากำลังทำ OT"
                enabled={settings.autoCheckoutSkipIfOt}
                onChange={() => onChange({ autoCheckoutSkipIfOt: !settings.autoCheckoutSkipIfOt })}
              />

              <SettingsToggle
                label="แจ้ง Admin เมื่อ Auto Check-out"
                enabled={settings.notifyAdminOnAutoCheckout}
                onChange={() => onChange({ notifyAdminOnAutoCheckout: !settings.notifyAdminOnAutoCheckout })}
              />
            </>
          )}
        </div>
      </Card>

      {/* Reminder Settings */}
      <Card elevated>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#5ac8fa]/10 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-[#5ac8fa]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">เตือนลืมเช็คเอาท์</h3>
              <span className="px-2 py-0.5 bg-[#34c759] text-white text-[10px] font-bold rounded">LINE</span>
            </div>
            <p className="text-[13px] text-[#86868b]">ส่ง LINE เตือนก่อน Auto Check-out</p>
          </div>
        </div>

        <div className="space-y-4">
          <SettingsToggle
            label="เปิดการเตือน"
            enabled={settings.reminderEnabled}
            onChange={() => onChange({ reminderEnabled: !settings.reminderEnabled })}
          />

          {settings.reminderEnabled && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                  ครั้งที่ 1 (นาที)
                </label>
                <input
                  type="number"
                  min="5"
                  value={settings.reminderFirstMinutes}
                  onChange={(e) => onChange({ reminderFirstMinutes: e.target.value })}
                  className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                  ครั้งที่ 2 (นาที)
                </label>
                <input
                  type="number"
                  min="5"
                  value={settings.reminderSecondMinutes}
                  onChange={(e) => onChange({ reminderSecondMinutes: e.target.value })}
                  className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                  ครั้งที่ 3 (นาที)
                </label>
                <input
                  type="number"
                  min="5"
                  value={settings.reminderThirdMinutes}
                  onChange={(e) => onChange({ reminderThirdMinutes: e.target.value })}
                  className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                />
              </div>
            </div>
          )}

          <p className="text-xs text-[#86868b] mt-2 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            เตือนก่อน Auto Check-out เช่น 60 นาที, 30 นาที, 15 นาที
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
        {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า LINE Notifications"}
      </Button>
    </div>
  );
}
