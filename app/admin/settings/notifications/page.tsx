"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Bell, Save, ArrowLeft, Clock, Calendar } from "lucide-react";
import Link from "next/link";
import { TimeInput } from "@/components/ui/TimeInput";

// Toggle Switch Component
const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
  <button
    type="button"
    onClick={onChange}
    className={`
      relative w-12 h-7 rounded-full transition-colors flex-shrink-0
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
    enableCheckinNotifications: false,
    enableCheckoutNotifications: false,
    enableHolidayNotifications: true,
    holidayNotificationDaysBefore: "1",
    holidayNotificationTime: "09:00",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("system_settings").select("*");

      if (data) {
        const settingsMap: any = {};
        data.forEach((item: any) => {
          settingsMap[item.setting_key] = item.setting_value;
        });

        setSettings({
          enableCheckinNotifications: settingsMap.enable_checkin_notifications === "true",
          enableCheckoutNotifications: settingsMap.enable_checkout_notifications === "true",
          enableHolidayNotifications: settingsMap.enable_holiday_notifications !== "false",
          holidayNotificationDaysBefore: settingsMap.holiday_notification_days_before || "1",
          holidayNotificationTime: settingsMap.holiday_notification_time || "09:00",
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
        { key: "enable_holiday_notifications", value: settings.enableHolidayNotifications.toString() },
        { key: "holiday_notification_days_before", value: settings.holidayNotificationDaysBefore },
        { key: "holiday_notification_time", value: settings.holidayNotificationTime },
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
    <AdminLayout title="ตั้งค่าการแจ้งเตือน" description="จัดการการแจ้งเตือนต่างๆ ของระบบ">
      <div className="mb-6">
        <Link href="/admin/settings">
          <Button variant="secondary" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
            กลับไปหน้าตั้งค่า
          </Button>
        </Link>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Attendance Notifications */}
        <Card elevated>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#5ac8fa]/10 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#5ac8fa]" />
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">แจ้งเตือนการเข้า-ออกงาน</h3>
              <p className="text-[13px] text-[#86868b]">แจ้งเตือนเมื่อมีการบันทึกเวลา</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-xl">
              <div>
                <span className="text-[15px] text-[#1d1d1f] block">แจ้งเตือนเมื่อเช็คอิน</span>
                <span className="text-[13px] text-[#86868b]">ส่งแจ้งเตือนทุกครั้งที่พนักงานเช็คอิน</span>
              </div>
              <ToggleSwitch 
                enabled={settings.enableCheckinNotifications} 
                onChange={() => setSettings({ ...settings, enableCheckinNotifications: !settings.enableCheckinNotifications })}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-xl">
              <div>
                <span className="text-[15px] text-[#1d1d1f] block">แจ้งเตือนเมื่อเช็คเอาท์</span>
                <span className="text-[13px] text-[#86868b]">ส่งแจ้งเตือนทุกครั้งที่พนักงานเช็คเอาท์</span>
              </div>
              <ToggleSwitch 
                enabled={settings.enableCheckoutNotifications} 
                onChange={() => setSettings({ ...settings, enableCheckoutNotifications: !settings.enableCheckoutNotifications })}
              />
            </div>

            {(settings.enableCheckinNotifications || settings.enableCheckoutNotifications) && (
              <div className="bg-[#5ac8fa]/10 rounded-xl p-4">
                <p className="text-[13px] text-[#5ac8fa] leading-relaxed">
                  ⚠️ <strong>คำเตือน:</strong> การแจ้งเตือนทุกครั้งอาจทำให้มีข้อความมากในกลุ่ม 
                  แนะนำให้ใช้เฉพาะเมื่อจำเป็น
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Holiday Notifications */}
        <Card elevated>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#ff9500]" />
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">แจ้งเตือนวันหยุด</h3>
              <p className="text-[13px] text-[#86868b]">แจ้งเตือนล่วงหน้าก่อนวันหยุด</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-xl">
              <div>
                <span className="text-[15px] text-[#1d1d1f] block">เปิดแจ้งเตือนวันหยุด</span>
                <span className="text-[13px] text-[#86868b]">ส่งแจ้งเตือนผ่าน LINE เมื่อใกล้วันหยุด</span>
              </div>
              <ToggleSwitch 
                enabled={settings.enableHolidayNotifications} 
                onChange={() => setSettings({ ...settings, enableHolidayNotifications: !settings.enableHolidayNotifications })}
              />
            </div>

            {settings.enableHolidayNotifications && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                      แจ้งเตือนล่วงหน้า (วัน)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="7"
                      value={settings.holidayNotificationDaysBefore}
                      onChange={(e) => setSettings({ ...settings, holidayNotificationDaysBefore: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#ff9500]/20 transition-all"
                    />
                    <p className="text-[13px] text-[#86868b] mt-1">0 = แจ้งเฉพาะวันหยุด</p>
                  </div>
                  <TimeInput
                    label="เวลาส่งแจ้งเตือน"
                    value={settings.holidayNotificationTime}
                    onChange={(e) => setSettings({ ...settings, holidayNotificationTime: e.target.value })}
                  />
                </div>

                <div className="bg-[#ff9500]/10 rounded-xl p-4">
                  <p className="text-[13px] text-[#ff9500] leading-relaxed">
                    💡 <strong>Vercel Hobby Plan:</strong> ระบบส่งแจ้งเตือนวันละครั้งตามเวลาที่ตั้งค่าใน Cron Job
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            size="lg" 
            loading={saving}
            icon={!saving ? <Save className="w-5 h-5" /> : undefined}
          >
            {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
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

