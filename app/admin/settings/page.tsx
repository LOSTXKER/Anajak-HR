"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  Clock,
  Shield,
  Save,
  CheckCircle,
  MessageCircle,
  ChevronRight,
  Bell,
  UserCheck,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { TimeInput } from "@/components/ui/TimeInput";

function SettingsContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState({
    workStartTime: "09:00",
    workEndTime: "18:00",
    lateThreshold: "15",
    enableNotifications: true,
    requirePhoto: true,
    requireGPS: true,
    requireAccountApproval: true,
    enableHolidayNotifications: true,
    holidayNotificationDaysBefore: "1",
    holidayNotificationTime: "09:00",
    enableCheckinNotifications: false,
    enableCheckoutNotifications: false,
    lineChannelToken: "",
    lineRecipientId: "",
    lineRecipientType: "group",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*");

      if (error) throw error;

      if (data) {
        const settingsMap: any = {};
        data.forEach((item: any) => {
          settingsMap[item.setting_key] = item.setting_value;
        });

        setSettings({
          workStartTime: settingsMap.work_start_time || "09:00",
          workEndTime: settingsMap.work_end_time || "18:00",
          lateThreshold: settingsMap.late_threshold_minutes || "15",
          requirePhoto: settingsMap.require_photo === "true",
          requireGPS: settingsMap.require_gps === "true",
          requireAccountApproval: settingsMap.require_account_approval !== "false", // Default to true
          enableNotifications: settingsMap.enable_notifications === "true",
          enableHolidayNotifications: settingsMap.enable_holiday_notifications !== "false",
          holidayNotificationDaysBefore: settingsMap.holiday_notification_days_before || "1",
          holidayNotificationTime: settingsMap.holiday_notification_time || "09:00",
          enableCheckinNotifications: settingsMap.enable_checkin_notifications === "true",
          enableCheckoutNotifications: settingsMap.enable_checkout_notifications === "true",
          lineChannelToken: settingsMap.line_channel_access_token || "",
          lineRecipientId: settingsMap.line_recipient_id || "",
          lineRecipientType: settingsMap.line_recipient_type || "group",
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดการตั้งค่าได้");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: "work_start_time", value: settings.workStartTime },
        { key: "work_end_time", value: settings.workEndTime },
        { key: "late_threshold_minutes", value: settings.lateThreshold },
        { key: "require_photo", value: settings.requirePhoto.toString() },
        { key: "require_gps", value: settings.requireGPS.toString() },
        { key: "require_account_approval", value: settings.requireAccountApproval.toString() },
        { key: "enable_notifications", value: settings.enableNotifications.toString() },
        { key: "enable_holiday_notifications", value: settings.enableHolidayNotifications.toString() },
        { key: "holiday_notification_days_before", value: settings.holidayNotificationDaysBefore },
        { key: "holiday_notification_time", value: settings.holidayNotificationTime },
        { key: "enable_checkin_notifications", value: settings.enableCheckinNotifications.toString() },
        { key: "enable_checkout_notifications", value: settings.enableCheckoutNotifications.toString() },
        { key: "line_channel_access_token", value: settings.lineChannelToken },
        { key: "line_recipient_id", value: settings.lineRecipientId },
        { key: "line_recipient_type", value: settings.lineRecipientType },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("system_settings")
          .upsert(
            {
              setting_key: update.key,
              setting_value: update.value,
            },
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

  const handleTestLine = async () => {
    if (!settings.lineChannelToken || !settings.lineRecipientId) {
      toast.error("กรุณากรอกข้อมูล LINE", "ต้องกรอก Channel Token และ Recipient ID");
      return;
    }

    setTesting(true);
    try {
      const response = await fetch("/api/line/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: settings.lineChannelToken,
          to: settings.lineRecipientId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("ส่งข้อความสำเร็จ", "ตรวจสอบใน LINE ของคุณ");
      } else {
        toast.error("ส่งข้อความไม่สำเร็จ", result.error || "กรุณาตรวจสอบ Token และ ID");
      }
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error.message);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="ตั้งค่าระบบ">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="ตั้งค่าระบบ" description="จัดการการตั้งค่าต่างๆ ของระบบ">
      <div className="max-w-2xl space-y-6">
        {/* Work Time Settings */}
        <Card elevated>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#0071e3]/10 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#0071e3]" />
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                เวลาทำงาน
              </h3>
              <p className="text-[13px] text-[#86868b]">กำหนดเวลาเข้า-ออกงาน</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <TimeInput
              label="เวลาเข้างาน"
              value={settings.workStartTime}
              onChange={(e) =>
                setSettings({ ...settings, workStartTime: e.target.value })
              }
            />
            <TimeInput
              label="เวลาเลิกงาน"
              value={settings.workEndTime}
              onChange={(e) =>
                setSettings({ ...settings, workEndTime: e.target.value })
              }
            />
          </div>

          <div className="mt-4">
            <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
              เกณฑ์มาสาย (นาที)
            </label>
            <input
              type="number"
              value={settings.lateThreshold}
              onChange={(e) =>
                setSettings({ ...settings, lateThreshold: e.target.value })
              }
              className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
            />
            <p className="text-[13px] text-[#86868b] mt-1">
              หลังเวลาเข้างานกี่นาทีถือว่ามาสาย
            </p>
          </div>
        </Card>

        {/* Security Settings */}
        <Card elevated>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#ff9500]" />
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                ความปลอดภัย
              </h3>
              <p className="text-[13px] text-[#86868b]">การยืนยันตัวตน</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-xl cursor-pointer hover:bg-[#e8e8ed] transition-colors">
              <span className="text-[15px] text-[#1d1d1f]">
                บังคับถ่ายรูปเมื่อเช็กอิน
              </span>
              <button
                type="button"
                onClick={() =>
                  setSettings({ ...settings, requirePhoto: !settings.requirePhoto })
                }
                className={`
                  relative w-12 h-7 rounded-full transition-colors
                  ${settings.requirePhoto ? "bg-[#34c759]" : "bg-[#d2d2d7]"}
                `}
              >
                <span
                  className={`
                    absolute top-1 w-5 h-5 bg-white rounded-full transition-transform
                    ${settings.requirePhoto ? "right-1" : "left-1"}
                  `}
                />
              </button>
            </label>

            <label className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-xl cursor-pointer hover:bg-[#e8e8ed] transition-colors">
              <span className="text-[15px] text-[#1d1d1f]">บังคับเปิด GPS</span>
              <button
                type="button"
                onClick={() =>
                  setSettings({ ...settings, requireGPS: !settings.requireGPS })
                }
                className={`
                  relative w-12 h-7 rounded-full transition-colors
                  ${settings.requireGPS ? "bg-[#34c759]" : "bg-[#d2d2d7]"}
                `}
              >
                <span
                  className={`
                    absolute top-1 w-5 h-5 bg-white rounded-full transition-transform
                    ${settings.requireGPS ? "right-1" : "left-1"}
                  `}
                />
              </button>
            </label>

            <label className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-xl cursor-pointer hover:bg-[#e8e8ed] transition-colors">
              <div>
                <span className="text-[15px] text-[#1d1d1f] block">
                  เปิดการแจ้งเตือน
                </span>
                <span className="text-[13px] text-[#86868b]">
                  เปิด/ปิดการแจ้งเตือนทั้งหมด
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    enableNotifications: !settings.enableNotifications,
                  })
                }
                className={`
                  relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ml-4
                  ${settings.enableNotifications ? "bg-[#34c759]" : "bg-[#d2d2d7]"}
                `}
              >
                <span
                  className={`
                    absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow-sm
                    ${settings.enableNotifications ? "right-1" : "left-1"}
                  `}
                />
              </button>
            </label>
          </div>
        </Card>

        {/* Attendance Notification Settings */}
        <Card elevated>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#5ac8fa]/10 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#5ac8fa]" />
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                แจ้งเตือนการเข้า-ออกงาน
              </h3>
              <p className="text-[13px] text-[#86868b]">แจ้งเตือนเมื่อมีการบันทึกเวลา</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-xl cursor-pointer hover:bg-[#e8e8ed] transition-colors">
              <div>
                <span className="text-[15px] text-[#1d1d1f] block">
                  แจ้งเตือนเมื่อเช็คอิน
                </span>
                <span className="text-[13px] text-[#86868b]">
                  ส่งแจ้งเตือนทุกครั้งที่พนักงานเช็คอินเข้างาน
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSettings({ ...settings, enableCheckinNotifications: !settings.enableCheckinNotifications })
                }
                className={`
                  relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ml-4
                  ${settings.enableCheckinNotifications ? "bg-[#34c759]" : "bg-[#d2d2d7]"}
                `}
              >
                <span
                  className={`
                    absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow-sm
                    ${settings.enableCheckinNotifications ? "right-1" : "left-1"}
                  `}
                />
              </button>
            </label>

            <label className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-xl cursor-pointer hover:bg-[#e8e8ed] transition-colors">
              <div>
                <span className="text-[15px] text-[#1d1d1f] block">
                  แจ้งเตือนเมื่อเช็คเอาท์
                </span>
                <span className="text-[13px] text-[#86868b]">
                  ส่งแจ้งเตือนทุกครั้งที่พนักงานเช็คเอาท์ออกงาน
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSettings({ ...settings, enableCheckoutNotifications: !settings.enableCheckoutNotifications })
                }
                className={`
                  relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ml-4
                  ${settings.enableCheckoutNotifications ? "bg-[#34c759]" : "bg-[#d2d2d7]"}
                `}
              >
                <span
                  className={`
                    absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow-sm
                    ${settings.enableCheckoutNotifications ? "right-1" : "left-1"}
                  `}
                />
              </button>
            </label>

            {(settings.enableCheckinNotifications || settings.enableCheckoutNotifications) && (
              <div className="bg-[#5ac8fa]/10 rounded-xl p-4">
                <p className="text-[13px] text-[#5ac8fa] leading-relaxed">
                  ⚠️ <strong>คำเตือน:</strong> การแจ้งเตือนทุกครั้งอาจทำให้มีข้อความมากในกลุ่ม 
                  แนะนำให้ใช้เฉพาะเมื่อจำเป็น หรือเปิดเฉพาะเช็คอินเพื่อตรวจสอบการมาสาย
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Holiday Notification Settings */}
        <Card elevated>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-[#ff9500]" />
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                แจ้งเตือนวันหยุด
              </h3>
              <p className="text-[13px] text-[#86868b]">แจ้งเตือนล่วงหน้าและวันหยุด</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-xl cursor-pointer hover:bg-[#e8e8ed] transition-colors">
              <div>
                <span className="text-[15px] text-[#1d1d1f] block">
                  เปิดแจ้งเตือนวันหยุด
                </span>
                <span className="text-[13px] text-[#86868b]">
                  ส่งแจ้งเตือนผ่าน LINE เมื่อใกล้วันหยุด
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSettings({ ...settings, enableHolidayNotifications: !settings.enableHolidayNotifications })
                }
                className={`
                  relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ml-4
                  ${settings.enableHolidayNotifications ? "bg-[#34c759]" : "bg-[#d2d2d7]"}
                `}
              >
                <span
                  className={`
                    absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow-sm
                    ${settings.enableHolidayNotifications ? "right-1" : "left-1"}
                  `}
                />
              </button>
            </label>

            {settings.enableHolidayNotifications && (
              <div className="space-y-3">
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
                      onChange={(e) =>
                        setSettings({ ...settings, holidayNotificationDaysBefore: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#ff9500]/20 transition-all border border-transparent focus:border-[#ff9500]"
                    />
                    <p className="text-[13px] text-[#86868b] mt-1">
                      0 = แจ้งเฉพาะวันหยุด
                    </p>
                  </div>
                  <div>
                    <TimeInput
                      label="เวลาส่งแจ้งเตือน"
                      value={settings.holidayNotificationTime}
                      onChange={(e) =>
                        setSettings({ ...settings, holidayNotificationTime: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="bg-[#ff9500]/10 rounded-xl p-4">
                  <p className="text-[13px] text-[#ff9500] leading-relaxed">
                    💡 <strong>Vercel Hobby Plan:</strong> ระบบส่งแจ้งเตือนวันละครั้งตามเวลาที่ตั้งค่าใน Cron Job
                    (ปัจจุบัน: {settings.holidayNotificationTime} น.)
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Account Approval Settings */}
        <Card elevated>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#af52de]/10 rounded-xl flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-[#af52de]" />
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                การอนุมัติบัญชี
              </h3>
              <p className="text-[13px] text-[#86868b]">จัดการการลงทะเบียนพนักงานใหม่</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-xl cursor-pointer hover:bg-[#e8e8ed] transition-colors">
              <div>
                <span className="text-[15px] text-[#1d1d1f] block">
                  บังคับอนุมัติบัญชีก่อนใช้งาน
                </span>
                <span className="text-[13px] text-[#86868b]">
                  {settings.requireAccountApproval 
                    ? "พนักงานใหม่ต้องรอ Admin อนุมัติก่อนเข้าใช้งาน" 
                    : "พนักงานใหม่สามารถใช้งานได้ทันทีหลังสมัคร"}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSettings({ ...settings, requireAccountApproval: !settings.requireAccountApproval })
                }
                className={`
                  relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ml-4
                  ${settings.requireAccountApproval ? "bg-[#34c759]" : "bg-[#d2d2d7]"}
                `}
              >
                <span
                  className={`
                    absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow-sm
                    ${settings.requireAccountApproval ? "right-1" : "left-1"}
                  `}
                />
              </button>
            </label>

            {settings.requireAccountApproval && (
              <div className="bg-[#af52de]/10 rounded-xl p-4">
                <p className="text-[13px] text-[#af52de] leading-relaxed">
                  💡 เมื่อเปิดใช้งาน พนักงานใหม่ที่สมัครสมาชิกจะมีสถานะ "รออนุมัติ" 
                  และต้องให้ Admin อนุมัติที่หน้า "อนุมัติบัญชี" ก่อนจึงจะเข้าใช้งานได้
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Message Templates Link */}
        <Link href="/admin/settings/messages">
          <Card elevated className="hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-[#06C755]/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#06C755]/10 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-[#06C755]" />
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                    ตั้งค่าข้อความ LINE
                  </h3>
                  <p className="text-[13px] text-[#86868b]">
                    ปรับแต่งข้อความที่ส่งไปใน LINE
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#86868b]" />
            </div>
          </Card>
        </Link>

        {/* Auto Checkout Settings Link */}
        <Link href="/admin/settings/auto-checkout">
          <Card elevated className="hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-[#ff9500]/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
                  <Bell className="w-5 h-5 text-[#ff9500]" />
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                    Auto Check-out & เตือนความจำ
                  </h3>
                  <p className="text-[13px] text-[#86868b]">
                    ตั้งค่าระบบเช็คเอาท์อัตโนมัติและการแจ้งเตือน
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#86868b]" />
            </div>
          </Card>
        </Link>

        {/* OT Settings Link */}
        <Link href="/admin/settings/ot">
          <Card elevated className="hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-[#ff9500]/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#ff9500]" />
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                    ตั้งค่า OT
                  </h3>
                  <p className="text-[13px] text-[#86868b]">
                    กำหนดกฎ, อัตราค่าตอบแทน, และข้อจำกัดการทำ OT
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#86868b]" />
            </div>
          </Card>
        </Link>

        {/* Payroll Settings Link */}
        <Link href="/admin/settings/payroll">
          <Card elevated className="hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-[#34c759]/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#34c759]/10 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-[#34c759]" />
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                    ตั้งค่าเงินเดือน (Payroll)
                  </h3>
                  <p className="text-[13px] text-[#86868b]">
                    กำหนดอัตราหัก/เพิ่ม สำหรับคำนวณเงินเดือน
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#86868b]" />
            </div>
          </Card>
        </Link>

        {/* LINE Messaging API Settings */}
        <Card elevated>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#06C755]/10 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-[#06C755]" />
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                LINE Messaging API
              </h3>
              <p className="text-[13px] text-[#86868b]">
                สำหรับส่งการแจ้งเตือน
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="Channel Access Token"
              type="password"
              value={settings.lineChannelToken}
              onChange={(e) =>
                setSettings({ ...settings, lineChannelToken: e.target.value })
              }
              placeholder="ใส่ Channel Access Token จาก LINE Developers"
            />

            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                ประเภทผู้รับ
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setSettings({ ...settings, lineRecipientType: "user" })
                  }
                  className={`
                    flex-1 px-4 py-3 rounded-xl text-[15px] font-medium transition-all
                    ${
                      settings.lineRecipientType === "user"
                        ? "bg-[#06C755] text-white ring-4 ring-[#06C755]/20"
                        : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]"
                    }
                  `}
                >
                  User ID (1-on-1)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSettings({ ...settings, lineRecipientType: "group" })
                  }
                  className={`
                    flex-1 px-4 py-3 rounded-xl text-[15px] font-medium transition-all
                    ${
                      settings.lineRecipientType === "group"
                        ? "bg-[#06C755] text-white ring-4 ring-[#06C755]/20"
                        : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]"
                    }
                  `}
                >
                  Group ID (กลุ่ม)
                </button>
              </div>
            </div>

            <Input
              label={
                settings.lineRecipientType === "user"
                  ? "LINE User ID"
                  : "LINE Group ID"
              }
              value={settings.lineRecipientId}
              onChange={(e) =>
                setSettings({ ...settings, lineRecipientId: e.target.value })
              }
              placeholder={
                settings.lineRecipientType === "user"
                  ? "U1234567890abcdef..."
                  : "C1234567890abcdef..."
              }
            />

            <div className="bg-[#06C755]/10 rounded-xl p-4">
              <p className="text-[13px] text-[#06C755] leading-relaxed mb-3">
                💡 <strong>วิธีหา User ID / Group ID:</strong>
              </p>
              <ol className="text-[13px] text-[#06C755]/90 space-y-2 ml-4 list-decimal">
                <li>เพิ่มบอทเป็นเพื่อนหรือเชิญเข้ากลุ่ม</li>
                <li>ส่งข้อความหาบอท</li>
                <li>ดู webhook events เพื่อหา ID</li>
              </ol>
              <p className="text-[13px] text-[#06C755]/90 mt-3">
                📖 ดูคู่มือเต็มได้ที่{" "}
                <a
                  href="https://developers.line.biz/en/docs/messaging-api/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  LINE_MESSAGING_SETUP.md
                </a>
              </p>
            </div>

            {/* Test Button */}
            <Button
              variant="secondary"
              onClick={handleTestLine}
              loading={testing}
              fullWidth
              icon={!testing ? <MessageCircle className="w-5 h-5" /> : undefined}
            >
              {testing ? "กำลังส่งข้อความทดสอบ..." : "ทดสอบส่งข้อความ LINE"}
            </Button>
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

export default function SettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <SettingsContent />
    </ProtectedRoute>
  );
}
