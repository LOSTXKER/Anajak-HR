"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { 
  Bell, 
  Save, 
  ArrowLeft, 
  Clock, 
  Calendar, 
  AlertTriangle,
  LogIn,
  LogOut,
  Timer,
  Info,
} from "lucide-react";
import Link from "next/link";
import { TimeInput } from "@/components/ui/TimeInput";

// Toggle Switch Component
const ToggleSwitch = ({ 
  enabled, 
  onChange,
  disabled = false,
}: { 
  enabled: boolean; 
  onChange: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onChange}
    disabled={disabled}
    className={`
      relative w-12 h-7 rounded-full transition-colors flex-shrink-0
      ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      ${enabled ? "bg-[#34c759]" : "bg-[#d2d2d7]"}
    `}
  >
    <span
      className={`
        absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow-sm
        ${enabled ? "right-1" : "left-1"}
      `}
    />
  </button>
);

function NotificationSettingsContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState({
    // Checkin/Checkout Notifications
    enableCheckinNotifications: false,
    enableCheckoutNotifications: false,
    
    // Default reminder times for employees
    defaultCheckinReminderTime: "08:00",
    defaultCheckoutReminderTime: "17:00",
    
    // Holiday Notifications
    enableHolidayNotifications: true,
    holidayNotificationDaysBefore: "1",
    holidayNotificationTime: "09:00",
    
    // OT Notifications
    otNotifyOnRequest: true,
    otNotifyOnApproval: true,
    otNotifyOnStart: true,
    otNotifyOnEnd: true,
    
    // Auto-checkout & Reminder
    autoCheckoutEnabled: false,
    autoCheckoutTime: "23:00",
    autoCheckoutDelayHours: "2",
    autoCheckoutSkipIfOt: true,
    reminderEnabled: true,
    reminderFirstMinutes: "60",
    reminderSecondMinutes: "30",
    reminderThirdMinutes: "15",
    notifyAdminOnAutoCheckout: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("system_settings").select("*");

      if (data) {
        const map: any = {};
        data.forEach((item: any) => {
          map[item.setting_key] = item.setting_value;
        });

        setSettings({
          enableCheckinNotifications: map.enable_checkin_notifications === "true",
          enableCheckoutNotifications: map.enable_checkout_notifications === "true",
          
          defaultCheckinReminderTime: map.default_checkin_reminder_time || "08:00",
          defaultCheckoutReminderTime: map.default_checkout_reminder_time || "17:00",
          
          enableHolidayNotifications: map.enable_holiday_notifications !== "false",
          holidayNotificationDaysBefore: map.holiday_notification_days_before || "1",
          holidayNotificationTime: map.holiday_notification_time || "09:00",
          
          otNotifyOnRequest: map.ot_notify_on_request !== "false",
          otNotifyOnApproval: map.ot_notify_on_approval !== "false",
          otNotifyOnStart: map.ot_notify_on_start !== "false",
          otNotifyOnEnd: map.ot_notify_on_end !== "false",
          
          autoCheckoutEnabled: map.auto_checkout_enabled === "true",
          autoCheckoutTime: map.auto_checkout_time || "23:00",
          autoCheckoutDelayHours: map.auto_checkout_delay_hours || "2",
          autoCheckoutSkipIfOt: map.auto_checkout_skip_if_ot !== "false",
          reminderEnabled: map.reminder_enabled !== "false",
          reminderFirstMinutes: map.reminder_first_minutes || "60",
          reminderSecondMinutes: map.reminder_second_minutes || "30",
          reminderThirdMinutes: map.reminder_third_minutes || "15",
          notifyAdminOnAutoCheckout: map.notify_admin_on_auto_checkout !== "false",
        });
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดการตั้งค่าได้");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: "enable_checkin_notifications", value: settings.enableCheckinNotifications.toString() },
        { key: "enable_checkout_notifications", value: settings.enableCheckoutNotifications.toString() },
        
        { key: "default_checkin_reminder_time", value: settings.defaultCheckinReminderTime },
        { key: "default_checkout_reminder_time", value: settings.defaultCheckoutReminderTime },
        
        { key: "enable_holiday_notifications", value: settings.enableHolidayNotifications.toString() },
        { key: "holiday_notification_days_before", value: settings.holidayNotificationDaysBefore },
        { key: "holiday_notification_time", value: settings.holidayNotificationTime },
        
        { key: "ot_notify_on_request", value: settings.otNotifyOnRequest.toString() },
        { key: "ot_notify_on_approval", value: settings.otNotifyOnApproval.toString() },
        { key: "ot_notify_on_start", value: settings.otNotifyOnStart.toString() },
        { key: "ot_notify_on_end", value: settings.otNotifyOnEnd.toString() },
        
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
      <AdminLayout title="ตั้งค่าการแจ้งเตือน">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="ตั้งค่าการแจ้งเตือน" description="จัดการการแจ้งเตือนและ Auto-checkout">
      {/* Back Button */}
      <Link href="/admin/settings" className="inline-flex items-center gap-2 text-[#0071e3] hover:underline mb-6">
        <ArrowLeft className="w-4 h-4" />
        กลับไปหน้าตั้งค่า
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Checkin/Checkout Notifications */}
          <Card elevated>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#0071e3]/10 rounded-xl flex items-center justify-center">
                <Bell className="w-5 h-5 text-[#0071e3]" />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">แจ้งเตือนเข้า-ออกงาน</h3>
                <p className="text-[13px] text-[#86868b]">ส่ง LINE เมื่อพนักงานลงเวลา</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
                <div className="flex items-center gap-3">
                  <LogIn className="w-5 h-5 text-[#34c759]" />
                  <span className="text-[14px] text-[#1d1d1f]">แจ้งเตือนเมื่อเช็คอิน</span>
                </div>
                <ToggleSwitch 
                  enabled={settings.enableCheckinNotifications} 
                  onChange={() => setSettings({ ...settings, enableCheckinNotifications: !settings.enableCheckinNotifications })}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
                <div className="flex items-center gap-3">
                  <LogOut className="w-5 h-5 text-[#ff9500]" />
                  <span className="text-[14px] text-[#1d1d1f]">แจ้งเตือนเมื่อเช็คเอาท์</span>
                </div>
                <ToggleSwitch 
                  enabled={settings.enableCheckoutNotifications} 
                  onChange={() => setSettings({ ...settings, enableCheckoutNotifications: !settings.enableCheckoutNotifications })}
                />
              </div>
            </div>
          </Card>

          {/* Default Reminder Times */}
          <Card elevated>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#5856d6]/10 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#5856d6]" />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">เวลาแจ้งเตือนเริ่มต้น</h3>
                <p className="text-[13px] text-[#86868b]">เวลา default สำหรับพนักงาน</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">
                  ⏰ เวลาแจ้งเตือนเช็คอิน
                </label>
                <input
                  type="time"
                  value={settings.defaultCheckinReminderTime}
                  onChange={(e) => setSettings({ ...settings, defaultCheckinReminderTime: e.target.value })}
                  className="w-full px-4 py-3 bg-[#f5f5f7] border border-[#e8e8ed] rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20"
                />
                <p className="text-[12px] text-[#86868b] mt-1">พนักงานจะเห็นเวลานี้เป็นค่าเริ่มต้น</p>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">
                  🏠 เวลาแจ้งเตือนเช็คเอาท์
                </label>
                <input
                  type="time"
                  value={settings.defaultCheckoutReminderTime}
                  onChange={(e) => setSettings({ ...settings, defaultCheckoutReminderTime: e.target.value })}
                  className="w-full px-4 py-3 bg-[#f5f5f7] border border-[#e8e8ed] rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20"
                />
                <p className="text-[12px] text-[#86868b] mt-1">พนักงานสามารถปรับเวลาได้เอง</p>
              </div>
            </div>
          </Card>

          {/* OT Notifications */}
          <Card elevated>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#ff9500]" />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">แจ้งเตือน OT</h3>
                <p className="text-[13px] text-[#86868b]">ส่ง LINE เมื่อมี OT</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
                <span className="text-[14px] text-[#1d1d1f]">แจ้งเมื่อมีคำขอ OT ใหม่</span>
                <ToggleSwitch 
                  enabled={settings.otNotifyOnRequest} 
                  onChange={() => setSettings({ ...settings, otNotifyOnRequest: !settings.otNotifyOnRequest })}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
                <span className="text-[14px] text-[#1d1d1f]">แจ้งเมื่อ OT ได้รับการอนุมัติ</span>
                <ToggleSwitch 
                  enabled={settings.otNotifyOnApproval} 
                  onChange={() => setSettings({ ...settings, otNotifyOnApproval: !settings.otNotifyOnApproval })}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
                <span className="text-[14px] text-[#1d1d1f]">แจ้งเมื่อเริ่มทำ OT</span>
                <ToggleSwitch 
                  enabled={settings.otNotifyOnStart} 
                  onChange={() => setSettings({ ...settings, otNotifyOnStart: !settings.otNotifyOnStart })}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
                <span className="text-[14px] text-[#1d1d1f]">แจ้งเมื่อจบ OT</span>
                <ToggleSwitch 
                  enabled={settings.otNotifyOnEnd} 
                  onChange={() => setSettings({ ...settings, otNotifyOnEnd: !settings.otNotifyOnEnd })}
                />
              </div>
            </div>
          </Card>

          {/* Holiday Notifications */}
          <Card elevated>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#ff3b30]/10 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#ff3b30]" />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">แจ้งเตือนวันหยุด</h3>
                <p className="text-[13px] text-[#86868b]">แจ้งล่วงหน้าก่อนวันหยุด</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
                <span className="text-[14px] text-[#1d1d1f]">เปิดใช้งานการแจ้งเตือนวันหยุด</span>
                <ToggleSwitch 
                  enabled={settings.enableHolidayNotifications} 
                  onChange={() => setSettings({ ...settings, enableHolidayNotifications: !settings.enableHolidayNotifications })}
                />
              </div>

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
                      onChange={(e) => setSettings({ ...settings, holidayNotificationDaysBefore: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                    />
                  </div>
                  <TimeInput
                    label="เวลาแจ้งเตือน"
                    value={settings.holidayNotificationTime}
                    onChange={(val) => setSettings({ ...settings, holidayNotificationTime: val })}
                  />
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Auto-checkout */}
          <Card elevated>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#af52de]/10 rounded-xl flex items-center justify-center">
                <Timer className="w-5 h-5 text-[#af52de]" />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">Auto Check-out</h3>
                <p className="text-[13px] text-[#86868b]">เช็คเอาท์อัตโนมัติสำหรับคนลืม</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
                <div>
                  <span className="text-[14px] text-[#1d1d1f] block">เปิด Auto Check-out</span>
                  <span className="text-[12px] text-[#86868b]">ระบบจะเช็คเอาท์ให้อัตโนมัติ</span>
                </div>
                <ToggleSwitch 
                  enabled={settings.autoCheckoutEnabled} 
                  onChange={() => setSettings({ ...settings, autoCheckoutEnabled: !settings.autoCheckoutEnabled })}
                />
              </div>

              {settings.autoCheckoutEnabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <TimeInput
                      label="เวลา Auto Check-out"
                      value={settings.autoCheckoutTime}
                      onChange={(val) => setSettings({ ...settings, autoCheckoutTime: val })}
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
                        onChange={(e) => setSettings({ ...settings, autoCheckoutDelayHours: e.target.value })}
                        className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
                    <span className="text-[14px] text-[#1d1d1f]">ข้ามถ้ากำลังทำ OT</span>
                    <ToggleSwitch 
                      enabled={settings.autoCheckoutSkipIfOt} 
                      onChange={() => setSettings({ ...settings, autoCheckoutSkipIfOt: !settings.autoCheckoutSkipIfOt })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
                    <span className="text-[14px] text-[#1d1d1f]">แจ้ง Admin เมื่อ Auto Check-out</span>
                    <ToggleSwitch 
                      enabled={settings.notifyAdminOnAutoCheckout} 
                      onChange={() => setSettings({ ...settings, notifyAdminOnAutoCheckout: !settings.notifyAdminOnAutoCheckout })}
                    />
                  </div>
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
              <div>
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">เตือนลืมเช็คเอาท์</h3>
                <p className="text-[13px] text-[#86868b]">ส่ง LINE เตือนก่อน Auto Check-out</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
                <span className="text-[14px] text-[#1d1d1f]">เปิดการเตือน</span>
                <ToggleSwitch 
                  enabled={settings.reminderEnabled} 
                  onChange={() => setSettings({ ...settings, reminderEnabled: !settings.reminderEnabled })}
                />
              </div>

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
                      onChange={(e) => setSettings({ ...settings, reminderFirstMinutes: e.target.value })}
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
                      onChange={(e) => setSettings({ ...settings, reminderSecondMinutes: e.target.value })}
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
                      onChange={(e) => setSettings({ ...settings, reminderThirdMinutes: e.target.value })}
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
            onClick={handleSave} 
            size="lg" 
            loading={saving}
            fullWidth
            icon={!saving ? <Save className="w-5 h-5" /> : undefined}
          >
            {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่าการแจ้งเตือน"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}

export default function NotificationSettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <NotificationSettingsContent />
    </ProtectedRoute>
  );
}
