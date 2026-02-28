"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SettingsToggle } from "./SettingsToggle";
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
      {/* Auto-checkout notification */}
      <Card elevated>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#af52de]/10 rounded-xl flex items-center justify-center">
            <Timer className="w-5 h-5 text-[#af52de]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">แจ้งเตือน Auto Check-out</h3>
              <span className="px-2 py-0.5 bg-[#34c759] text-white text-[10px] font-bold rounded">LINE</span>
            </div>
            <p className="text-[13px] text-[#86868b]">แจ้งเตือนเมื่อระบบ auto checkout ให้พนักงาน</p>
          </div>
        </div>

        <div className="space-y-4">
          <SettingsToggle
            label="แจ้ง Admin เมื่อ Auto Check-out"
            description="ส่ง LINE สรุปให้ Admin ทุกครั้งที่มี Auto Checkout"
            enabled={settings.notifyAdminOnAutoCheckout}
            onChange={() => onChange({ notifyAdminOnAutoCheckout: !settings.notifyAdminOnAutoCheckout })}
          />

          <p className="text-[11px] text-[#86868b] flex items-start gap-1">
            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>ตั้งค่าเปิด/ปิด Auto Check-out และเวลาได้ที่หน้า <strong>ตั้งค่าเวลาทำงาน</strong></span>
          </p>
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
              <span className="px-2 py-0.5 bg-[#34c759] text-white text-[10px] font-bold rounded">LINE</span>
            </div>
            <p className="text-[13px] text-[#86868b]">ส่ง LINE เตือนพนักงานก่อน Auto Check-out</p>
          </div>
        </div>

        <div className="space-y-4">
          <SettingsToggle
            label="เปิดการเตือน"
            description="ส่ง LINE เตือนพนักงานที่ลืมเช็คเอาท์"
            enabled={settings.reminderEnabled}
            onChange={() => onChange({ reminderEnabled: !settings.reminderEnabled })}
          />

          {settings.reminderEnabled && (
            <div className="space-y-3">
              <label className="block text-[13px] font-medium text-[#1d1d1f]">
                เตือนก่อน Auto Check-out (นาที)
              </label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Clock className="w-3 h-3 text-[#86868b]" />
                    <span className="text-[11px] text-[#86868b]">ครั้งที่ 1</span>
                  </div>
                  <input
                    type="number"
                    min="5"
                    value={settings.reminderFirstMinutes}
                    onChange={(e) => onChange({ reminderFirstMinutes: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#f5f5f7] rounded-xl text-[14px] text-center focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Clock className="w-3 h-3 text-[#86868b]" />
                    <span className="text-[11px] text-[#86868b]">ครั้งที่ 2</span>
                  </div>
                  <input
                    type="number"
                    min="5"
                    value={settings.reminderSecondMinutes}
                    onChange={(e) => onChange({ reminderSecondMinutes: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#f5f5f7] rounded-xl text-[14px] text-center focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Clock className="w-3 h-3 text-[#86868b]" />
                    <span className="text-[11px] text-[#86868b]">ครั้งที่ 3</span>
                  </div>
                  <input
                    type="number"
                    min="5"
                    value={settings.reminderThirdMinutes}
                    onChange={(e) => onChange({ reminderThirdMinutes: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#f5f5f7] rounded-xl text-[14px] text-center focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                  />
                </div>
              </div>
              <p className="text-[11px] text-[#86868b] flex items-start gap-1">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>ตัวเลขคือ "นาทีก่อนเวลา Auto Check-out" เช่น 60 = เตือน 1 ชม.ก่อน</span>
              </p>
            </div>
          )}
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
