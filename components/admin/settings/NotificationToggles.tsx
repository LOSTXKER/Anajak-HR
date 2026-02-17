"use client";

import { Card } from "@/components/ui/Card";
import { SettingsToggle } from "./SettingsToggle";
import {
  Bell,
  Clock,
  Calendar,
  FileText,
  Home,
  MapPin,
  Megaphone,
  UserPlus,
  LogIn,
  LogOut,
  AlertTriangle,
} from "lucide-react";
import { TimeInput } from "@/components/ui/TimeInput";
import type { NotificationSettings } from "./types";

interface NotificationTogglesProps {
  settings: NotificationSettings;
  onChange: (updates: Partial<NotificationSettings>) => void;
}

export function NotificationToggles({ settings, onChange }: NotificationTogglesProps) {
  return (
    <div className="space-y-6">
      {/* Checkin/Checkout Notifications */}
      <Card elevated>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#0071e3]/10 rounded-xl flex items-center justify-center">
            <Bell className="w-5 h-5 text-[#0071e3]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">แจ้งเตือนเข้า-ออกงาน</h3>
              <span className="px-2 py-0.5 bg-[#34c759] text-white text-[10px] font-bold rounded">LINE</span>
            </div>
            <p className="text-[13px] text-[#86868b]">ส่ง LINE เมื่อพนักงานลงเวลา</p>
          </div>
        </div>

        <div className="space-y-3">
          <SettingsToggle
            label="แจ้งเตือนเมื่อเช็คอิน"
            icon={<LogIn className="w-5 h-5 text-[#34c759]" />}
            enabled={settings.enableCheckinNotifications}
            onChange={() => onChange({ enableCheckinNotifications: !settings.enableCheckinNotifications })}
          />
          <SettingsToggle
            label="แจ้งเตือนเมื่อเช็คเอาท์"
            icon={<LogOut className="w-5 h-5 text-[#ff9500]" />}
            enabled={settings.enableCheckoutNotifications}
            onChange={() => onChange({ enableCheckoutNotifications: !settings.enableCheckoutNotifications })}
          />
        </div>
      </Card>

      {/* OT Notifications */}
      <Card elevated>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-[#ff9500]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">แจ้งเตือน OT</h3>
              <span className="px-2 py-0.5 bg-[#34c759] text-white text-[10px] font-bold rounded">LINE</span>
            </div>
            <p className="text-[13px] text-[#86868b]">ส่ง LINE เมื่อมี OT</p>
          </div>
        </div>

        <div className="space-y-3">
          <SettingsToggle
            label="แจ้งเมื่อมีคำขอ OT ใหม่"
            enabled={settings.otNotifyOnRequest}
            onChange={() => onChange({ otNotifyOnRequest: !settings.otNotifyOnRequest })}
          />
          <SettingsToggle
            label="แจ้งเมื่อ OT ได้รับการอนุมัติ"
            enabled={settings.otNotifyOnApproval}
            onChange={() => onChange({ otNotifyOnApproval: !settings.otNotifyOnApproval })}
          />
          <SettingsToggle
            label="แจ้งเมื่อเริ่มทำ OT"
            enabled={settings.otNotifyOnStart}
            onChange={() => onChange({ otNotifyOnStart: !settings.otNotifyOnStart })}
          />
          <SettingsToggle
            label="แจ้งเมื่อจบ OT"
            enabled={settings.otNotifyOnEnd}
            onChange={() => onChange({ otNotifyOnEnd: !settings.otNotifyOnEnd })}
          />
        </div>
      </Card>

      {/* Holiday Notifications */}
      <Card elevated>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#ff3b30]/10 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-[#ff3b30]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">แจ้งเตือนวันหยุด</h3>
              <span className="px-2 py-0.5 bg-[#34c759] text-white text-[10px] font-bold rounded">LINE</span>
            </div>
            <p className="text-[13px] text-[#86868b]">แจ้งล่วงหน้าก่อนวันหยุด</p>
          </div>
        </div>

        <div className="space-y-4">
          <SettingsToggle
            label="เปิดใช้งานการแจ้งเตือนวันหยุด"
            enabled={settings.enableHolidayNotifications}
            onChange={() => onChange({ enableHolidayNotifications: !settings.enableHolidayNotifications })}
          />

          {settings.enableHolidayNotifications && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                  แจ้งล่วงหน้า (วัน)
                </label>
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={settings.holidayNotificationDaysBefore}
                  onChange={(e) => onChange({ holidayNotificationDaysBefore: e.target.value })}
                  className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                />
              </div>
              <TimeInput
                label="เวลาแจ้งเตือน"
                value={settings.holidayNotificationTime}
                onChange={(val) => onChange({ holidayNotificationTime: val })}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Request Notifications (Leave, WFH, Late, Field Work) */}
      <Card elevated>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#5856d6]/10 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-[#5856d6]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">แจ้งเตือนคำขอต่างๆ</h3>
              <span className="px-2 py-0.5 bg-[#34c759] text-white text-[10px] font-bold rounded">LINE</span>
            </div>
            <p className="text-[13px] text-[#86868b]">ลางาน, WFH, มาสาย, งานนอกสถานที่</p>
          </div>
        </div>

        <div className="space-y-3">
          <SettingsToggle
            label="ลางาน"
            description="คำขอใหม่ + อนุมัติ/ปฏิเสธ"
            icon={<FileText className="w-5 h-5 text-[#5856d6]" />}
            enabled={settings.enableLeaveNotifications}
            onChange={() => onChange({ enableLeaveNotifications: !settings.enableLeaveNotifications })}
          />
          <SettingsToggle
            label="WFH (Work From Home)"
            description="คำขอใหม่ + อนุมัติ/ปฏิเสธ"
            icon={<Home className="w-5 h-5 text-[#007aff]" />}
            enabled={settings.enableWfhNotifications}
            onChange={() => onChange({ enableWfhNotifications: !settings.enableWfhNotifications })}
          />
          <SettingsToggle
            label="ขออนุมัติมาสาย"
            description="คำขอใหม่ + อนุมัติ/ปฏิเสธ"
            icon={<Clock className="w-5 h-5 text-[#ff9500]" />}
            enabled={settings.enableLateNotifications}
            onChange={() => onChange({ enableLateNotifications: !settings.enableLateNotifications })}
          />
          <SettingsToggle
            label="งานนอกสถานที่"
            description="คำขอใหม่ + อนุมัติ/ปฏิเสธ"
            icon={<MapPin className="w-5 h-5 text-[#34c759]" />}
            enabled={settings.enableFieldworkNotifications}
            onChange={() => onChange({ enableFieldworkNotifications: !settings.enableFieldworkNotifications })}
          />
        </div>
      </Card>

      {/* Other Notifications */}
      <Card elevated>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#ff2d55]/10 rounded-xl flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-[#ff2d55]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">แจ้งเตือนอื่นๆ</h3>
              <span className="px-2 py-0.5 bg-[#34c759] text-white text-[10px] font-bold rounded">LINE</span>
            </div>
            <p className="text-[13px] text-[#86868b]">ประกาศ, พนักงานใหม่, Anomaly</p>
          </div>
        </div>

        <div className="space-y-3">
          <SettingsToggle
            label="ประกาศใหม่"
            description="แจ้งเมื่อมีประกาศใหม่"
            icon={<Megaphone className="w-5 h-5 text-[#ff2d55]" />}
            enabled={settings.enableAnnouncementNotifications}
            onChange={() => onChange({ enableAnnouncementNotifications: !settings.enableAnnouncementNotifications })}
          />
          <SettingsToggle
            label="พนักงานลงทะเบียนใหม่"
            description="แจ้งเมื่อมีคนสมัครใหม่"
            icon={<UserPlus className="w-5 h-5 text-[#007aff]" />}
            enabled={settings.enableEmployeeRegistrationNotifications}
            onChange={() => onChange({ enableEmployeeRegistrationNotifications: !settings.enableEmployeeRegistrationNotifications })}
          />
          <SettingsToggle
            label="Anomaly / ผิดปกติ"
            description="เช็คเอาท์ก่อนเวลา, GPS ไม่ตรง ฯลฯ"
            icon={<AlertTriangle className="w-5 h-5 text-[#ff9500]" />}
            enabled={settings.enableAnomalyNotifications}
            onChange={() => onChange({ enableAnomalyNotifications: !settings.enableAnomalyNotifications })}
          />
        </div>
      </Card>
    </div>
  );
}
