"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SettingsLayout } from "@/components/admin/SettingsLayout";
import { useToast } from "@/components/ui/Toast";
import { useSystemSettings } from "@/lib/hooks/use-system-settings";
import { Bell, CheckCircle } from "lucide-react";
import {
  NotificationToggles,
  PushSettings,
  NotificationSchedule,
  IOSInstructions,
} from "@/components/admin/settings";
import type { NotificationSettings } from "@/components/admin/settings";

const NOTIFICATION_KEYS = [
  "enable_checkin_notifications",
  "enable_checkout_notifications",
  "enable_holiday_notifications",
  "holiday_notification_days_before",
  "holiday_notification_time",
  "ot_notify_on_request",
  "ot_notify_on_approval",
  "ot_notify_on_start",
  "ot_notify_on_end",
  "enable_leave_notifications",
  "enable_wfh_notifications",
  "enable_late_notifications",
  "enable_fieldwork_notifications",
  "enable_announcement_notifications",
  "enable_employee_registration_notifications",
  "enable_anomaly_notifications",
  "auto_checkout_enabled",
  "auto_checkout_time",
  "auto_checkout_delay_hours",
  "auto_checkout_skip_if_ot",
  "reminder_enabled",
  "reminder_first_minutes",
  "reminder_second_minutes",
  "reminder_third_minutes",
  "notify_admin_on_auto_checkout",
  "allow_remote_checkout_after_hours",
  "work_start_time",
  "work_end_time",
];

const DEFAULT_SETTINGS: NotificationSettings = {
  enableCheckinNotifications: false,
  enableCheckoutNotifications: false,
  enableHolidayNotifications: true,
  holidayNotificationDaysBefore: "1",
  holidayNotificationTime: "09:00",
  otNotifyOnRequest: true,
  otNotifyOnApproval: true,
  otNotifyOnStart: true,
  otNotifyOnEnd: true,
  enableLeaveNotifications: false,
  enableWfhNotifications: false,
  enableLateNotifications: false,
  enableFieldworkNotifications: false,
  enableAnnouncementNotifications: false,
  enableEmployeeRegistrationNotifications: false,
  enableAnomalyNotifications: false,
  autoCheckoutEnabled: true,
  autoCheckoutTime: "22:00",
  autoCheckoutDelayHours: "4",
  autoCheckoutSkipIfOt: true,
  reminderEnabled: true,
  reminderFirstMinutes: "15",
  reminderSecondMinutes: "30",
  reminderThirdMinutes: "60",
  notifyAdminOnAutoCheckout: true,
  allowRemoteCheckoutAfterHours: false,
  workStartTime: "08:00",
  workEndTime: "17:00",
};

function NotificationSettingsContent() {
  const toast = useToast();

  const { settings, setSettings, loading, saving, save } =
    useSystemSettings<NotificationSettings>({
      keys: NOTIFICATION_KEYS,
      defaults: DEFAULT_SETTINGS,
      deserialize: (raw) => ({
        enableCheckinNotifications: raw.enable_checkin_notifications === "true",
        enableCheckoutNotifications: raw.enable_checkout_notifications === "true",
        enableHolidayNotifications: raw.enable_holiday_notifications !== "false",
        holidayNotificationDaysBefore: raw.holiday_notification_days_before || "1",
        holidayNotificationTime: raw.holiday_notification_time || "09:00",
        otNotifyOnRequest: raw.ot_notify_on_request !== "false",
        otNotifyOnApproval: raw.ot_notify_on_approval !== "false",
        otNotifyOnStart: raw.ot_notify_on_start !== "false",
        otNotifyOnEnd: raw.ot_notify_on_end !== "false",
        enableLeaveNotifications: raw.enable_leave_notifications === "true",
        enableWfhNotifications: raw.enable_wfh_notifications === "true",
        enableLateNotifications: raw.enable_late_notifications === "true",
        enableFieldworkNotifications: raw.enable_fieldwork_notifications === "true",
        enableAnnouncementNotifications: raw.enable_announcement_notifications === "true",
        enableEmployeeRegistrationNotifications: raw.enable_employee_registration_notifications === "true",
        enableAnomalyNotifications: raw.enable_anomaly_notifications === "true",
        autoCheckoutEnabled: raw.auto_checkout_enabled === "true",
        autoCheckoutTime: raw.auto_checkout_time || "23:00",
        autoCheckoutDelayHours: raw.auto_checkout_delay_hours || "2",
        autoCheckoutSkipIfOt: raw.auto_checkout_skip_if_ot !== "false",
        reminderEnabled: raw.reminder_enabled !== "false",
        reminderFirstMinutes: raw.reminder_first_minutes || "15",
        reminderSecondMinutes: raw.reminder_second_minutes || "30",
        reminderThirdMinutes: raw.reminder_third_minutes || "60",
        notifyAdminOnAutoCheckout: raw.notify_admin_on_auto_checkout !== "false",
        allowRemoteCheckoutAfterHours: raw.allow_remote_checkout_after_hours === "true",
        workStartTime: raw.work_start_time || "08:00",
        workEndTime: raw.work_end_time || "17:00",
      }),
      serialize: (s) => ({
        enable_checkin_notifications: s.enableCheckinNotifications.toString(),
        enable_checkout_notifications: s.enableCheckoutNotifications.toString(),
        enable_holiday_notifications: s.enableHolidayNotifications.toString(),
        holiday_notification_days_before: s.holidayNotificationDaysBefore,
        holiday_notification_time: s.holidayNotificationTime,
        ot_notify_on_request: s.otNotifyOnRequest.toString(),
        ot_notify_on_approval: s.otNotifyOnApproval.toString(),
        ot_notify_on_start: s.otNotifyOnStart.toString(),
        ot_notify_on_end: s.otNotifyOnEnd.toString(),
        enable_leave_notifications: s.enableLeaveNotifications.toString(),
        enable_wfh_notifications: s.enableWfhNotifications.toString(),
        enable_late_notifications: s.enableLateNotifications.toString(),
        enable_fieldwork_notifications: s.enableFieldworkNotifications.toString(),
        enable_announcement_notifications: s.enableAnnouncementNotifications.toString(),
        enable_employee_registration_notifications: s.enableEmployeeRegistrationNotifications.toString(),
        enable_anomaly_notifications: s.enableAnomalyNotifications.toString(),
        auto_checkout_enabled: s.autoCheckoutEnabled.toString(),
        auto_checkout_time: s.autoCheckoutTime,
        auto_checkout_delay_hours: s.autoCheckoutDelayHours,
        auto_checkout_skip_if_ot: s.autoCheckoutSkipIfOt.toString(),
        reminder_enabled: s.reminderEnabled.toString(),
        reminder_first_minutes: s.reminderFirstMinutes,
        reminder_second_minutes: s.reminderSecondMinutes,
        reminder_third_minutes: s.reminderThirdMinutes,
        notify_admin_on_auto_checkout: s.notifyAdminOnAutoCheckout.toString(),
        allow_remote_checkout_after_hours: s.allowRemoteCheckoutAfterHours.toString(),
      }),
    });

  const handleSettingChange = (updates: Partial<NotificationSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    const ok = await save();
    if (ok) {
      toast.success("บันทึกสำเร็จ", "บันทึกการตั้งค่าเรียบร้อยแล้ว");
    } else {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกการตั้งค่าได้");
    }
  };

  if (loading) {
    return (
      <SettingsLayout title="การแจ้งเตือน">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout title="การแจ้งเตือน" description="จัดการการแจ้งเตือนและ Auto-checkout">
      {/* Info Banner */}
      <div className="mb-6 p-5 bg-gradient-to-br from-[#34c759]/10 to-[#34c759]/5 rounded-2xl border-2 border-[#34c759]/30">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#34c759] flex items-center justify-center flex-shrink-0">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div className="space-y-3 flex-1">
            <div>
              <h3 className="text-[18px] font-bold text-[#1d1d1f] mb-1">
                การตั้งค่าการแจ้งเตือนผ่าน LINE
              </h3>
              <p className="text-[14px] text-[#86868b]">
                ทุกการตั้งค่าในหน้านี้จะส่งการแจ้งเตือนผ่าน LINE App → ไปยัง Admin/Group ที่กำหนด
              </p>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white/80 rounded-xl">
              <CheckCircle className="w-4 h-4 text-[#34c759]" />
              <span className="text-[13px] text-[#1d1d1f]">
                <strong>ทำงานได้ 100%</strong> • แจ้งเตือนแม้ปิด Browser • รันอัตโนมัติด้วย Cron Job
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* LINE Notifications Section */}
      <div className="mb-4">
        <h2 className="text-[20px] font-bold text-[#1d1d1f] flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-[#34c759] text-white flex items-center justify-center text-[14px] font-bold">L</span>
          LINE Notifications
        </h2>
        <p className="text-[14px] text-[#86868b] mt-1 ml-10">แจ้งเตือนเมื่อมีเหตุการณ์เกิดขึ้นในระบบ</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - LINE Notification Toggles */}
        <NotificationToggles settings={settings} onChange={handleSettingChange} />

        {/* Right Column - Schedule & Save */}
        <NotificationSchedule
          settings={settings}
          onChange={handleSettingChange}
          onSave={handleSave}
          saving={saving}
        />
      </div>

      <PushSettings />
      <IOSInstructions settings={settings} />
    </SettingsLayout>
  );
}

export default function NotificationSettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <NotificationSettingsContent />
    </ProtectedRoute>
  );
}
