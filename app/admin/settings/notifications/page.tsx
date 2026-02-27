"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SettingsLayout } from "@/components/admin/SettingsLayout";
import { useToast } from "@/components/ui/Toast";
import { Bell, CheckCircle } from "lucide-react";
import {
  NotificationToggles,
  PushSettings,
  NotificationSchedule,
  IOSInstructions,
} from "@/components/admin/settings";
import type { NotificationSettings } from "@/components/admin/settings";

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
  autoCheckoutEnabled: false,
  autoCheckoutTime: "22:00",
  autoCheckoutDelayHours: "4",
  autoCheckoutSkipIfOt: true,
  reminderEnabled: true,
  reminderFirstMinutes: "60",
  reminderSecondMinutes: "30",
  reminderThirdMinutes: "15",
  notifyAdminOnAutoCheckout: true,
  workStartTime: "08:00",
  workEndTime: "17:00",
};

function NotificationSettingsContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("system_settings").select("*");

      if (data) {
        const map: Record<string, string> = {};
        data.forEach((item: { setting_key: string; setting_value: string }) => {
          map[item.setting_key] = item.setting_value;
        });

        setSettings({
          enableCheckinNotifications: map.enable_checkin_notifications === "true",
          enableCheckoutNotifications: map.enable_checkout_notifications === "true",
          enableHolidayNotifications: map.enable_holiday_notifications !== "false",
          holidayNotificationDaysBefore: map.holiday_notification_days_before || "1",
          holidayNotificationTime: map.holiday_notification_time || "09:00",
          otNotifyOnRequest: map.ot_notify_on_request !== "false",
          otNotifyOnApproval: map.ot_notify_on_approval !== "false",
          otNotifyOnStart: map.ot_notify_on_start !== "false",
          otNotifyOnEnd: map.ot_notify_on_end !== "false",
          enableLeaveNotifications: map.enable_leave_notifications === "true",
          enableWfhNotifications: map.enable_wfh_notifications === "true",
          enableLateNotifications: map.enable_late_notifications === "true",
          enableFieldworkNotifications: map.enable_fieldwork_notifications === "true",
          enableAnnouncementNotifications: map.enable_announcement_notifications === "true",
          enableEmployeeRegistrationNotifications: map.enable_employee_registration_notifications === "true",
          enableAnomalyNotifications: map.enable_anomaly_notifications === "true",
          autoCheckoutEnabled: map.auto_checkout_enabled === "true",
          autoCheckoutTime: map.auto_checkout_time || "23:00",
          autoCheckoutDelayHours: map.auto_checkout_delay_hours || "2",
          autoCheckoutSkipIfOt: map.auto_checkout_skip_if_ot !== "false",
          reminderEnabled: map.reminder_enabled !== "false",
          reminderFirstMinutes: map.reminder_first_minutes || "60",
          reminderSecondMinutes: map.reminder_second_minutes || "30",
          reminderThirdMinutes: map.reminder_third_minutes || "15",
          notifyAdminOnAutoCheckout: map.notify_admin_on_auto_checkout !== "false",
          workStartTime: map.work_start_time || "08:00",
          workEndTime: map.work_end_time || "17:00",
        });
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดการตั้งค่าได้");
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (updates: Partial<NotificationSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: "enable_checkin_notifications", value: settings.enableCheckinNotifications.toString() },
        { key: "enable_checkout_notifications", value: settings.enableCheckoutNotifications.toString() },
        { key: "enable_holiday_notifications", value: settings.enableHolidayNotifications.toString() },
        { key: "holiday_notification_days_before", value: settings.holidayNotificationDaysBefore },
        { key: "holiday_notification_time", value: settings.holidayNotificationTime },
        { key: "ot_notify_on_request", value: settings.otNotifyOnRequest.toString() },
        { key: "ot_notify_on_approval", value: settings.otNotifyOnApproval.toString() },
        { key: "ot_notify_on_start", value: settings.otNotifyOnStart.toString() },
        { key: "ot_notify_on_end", value: settings.otNotifyOnEnd.toString() },
        { key: "enable_leave_notifications", value: settings.enableLeaveNotifications.toString() },
        { key: "enable_wfh_notifications", value: settings.enableWfhNotifications.toString() },
        { key: "enable_late_notifications", value: settings.enableLateNotifications.toString() },
        { key: "enable_fieldwork_notifications", value: settings.enableFieldworkNotifications.toString() },
        { key: "enable_announcement_notifications", value: settings.enableAnnouncementNotifications.toString() },
        { key: "enable_employee_registration_notifications", value: settings.enableEmployeeRegistrationNotifications.toString() },
        { key: "enable_anomaly_notifications", value: settings.enableAnomalyNotifications.toString() },
        { key: "auto_checkout_enabled", value: settings.autoCheckoutEnabled.toString() },
        { key: "auto_checkout_time", value: settings.autoCheckoutTime },
        { key: "auto_checkout_delay_hours", value: settings.autoCheckoutDelayHours },
        { key: "auto_checkout_skip_if_ot", value: settings.autoCheckoutSkipIfOt.toString() },
        { key: "reminder_enabled", value: settings.reminderEnabled.toString() },
        { key: "reminder_first_minutes", value: settings.reminderFirstMinutes },
        { key: "reminder_second_minutes", value: settings.reminderSecondMinutes },
        { key: "reminder_third_minutes", value: settings.reminderThirdMinutes },
        { key: "notify_admin_on_auto_checkout", value: settings.notifyAdminOnAutoCheckout.toString() },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("system_settings")
          .upsert(
            { setting_key: update.key, setting_value: update.value },
            { onConflict: "setting_key" }
          );
        if (error) throw error;
      }

      toast.success("บันทึกสำเร็จ", "บันทึกการตั้งค่าเรียบร้อยแล้ว");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกการตั้งค่าได้");
    } finally {
      setSaving(false);
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
