"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { BottomNav } from "@/components/BottomNav";
import {
  Bell,
  BellOff,
  BellRing,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Smartphone,
  Volume2,
  ArrowLeft,
  Megaphone,
  ClipboardCheck,
  CalendarOff,
  Shield,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import {
  requestNotificationPermission,
  getNotificationSettingsAsync,
  getDefaultNotificationSettingsFromDB,
  saveNotificationSettings,
  testNotification,
  type NotificationSettings,
} from "@/lib/utils/notifications";
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isPushSubscribed,
} from "@/lib/utils/web-push";

type PermissionState = "unsupported" | "default" | "granted" | "denied";

function NotificationSettingsContent() {
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: false,
    checkinReminder: true,
    checkinTime: "08:00",
    checkoutReminder: true,
    checkoutTime: "17:00",
    workdaysOnly: true,
    pushAnnouncements: true,
    pushApprovals: true,
    pushLeave: true,
  });
  const [permissionStatus, setPermissionStatus] = useState<PermissionState>("default");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPushActive, setIsPushActive] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const storedSettings = await getNotificationSettingsAsync();

        let adminSettings = { checkinTime: "08:30", checkoutTime: "17:30" };
        try {
          const dbSettings = await Promise.race([
            getDefaultNotificationSettingsFromDB(),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
          ]);
          if (dbSettings) {
            adminSettings = { checkinTime: dbSettings.checkinTime, checkoutTime: dbSettings.checkoutTime };
          }
        } catch {
          // use defaults
        }

        setSettings({
          ...{
            pushAnnouncements: true,
            pushApprovals: true,
            pushLeave: true,
          },
          ...storedSettings,
          checkinTime: adminSettings.checkinTime,
          checkoutTime: adminSettings.checkoutTime,
        });

        if ("Notification" in window) {
          setPermissionStatus(Notification.permission as PermissionState);
        } else {
          setPermissionStatus("unsupported");
        }

        const subscribed = await isPushSubscribed();
        setIsPushActive(subscribed);

        if (subscribed && storedSettings.enabled === false) {
          setSettings((prev) => ({ ...prev, enabled: true }));
        }
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleEnablePush = useCallback(async () => {
    setError(null);
    setSubscribing(true);

    try {
      if (permissionStatus !== "granted") {
        const granted = await requestNotificationPermission();
        if (!granted) {
          setError("ไม่ได้รับอนุญาตการแจ้งเตือน กรุณาเปิดใน Settings ของ Browser/อุปกรณ์");
          setSubscribing(false);
          return;
        }
        setPermissionStatus("granted");
      }

      const subscription = await subscribeToPushNotifications();
      if (subscription) {
        setIsPushActive(true);
        setSettings((prev) => ({ ...prev, enabled: true }));
        saveNotificationSettings({ ...settings, enabled: true });
      } else {
        setError("ไม่สามารถเชื่อมต่อ Push Notification ได้ ลองใหม่อีกครั้ง");
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเปิดการแจ้งเตือน");
    } finally {
      setSubscribing(false);
    }
  }, [permissionStatus, settings]);

  const handleDisablePush = useCallback(async () => {
    setSubscribing(true);
    try {
      await unsubscribeFromPushNotifications();
      setIsPushActive(false);
      setSettings((prev) => ({ ...prev, enabled: false }));
      saveNotificationSettings({ ...settings, enabled: false });
    } finally {
      setSubscribing(false);
    }
  }, [settings]);

  const handleToggleEnabled = useCallback(async (enabled: boolean) => {
    if (enabled) {
      await handleEnablePush();
    } else {
      await handleDisablePush();
    }
  }, [handleEnablePush, handleDisablePush]);

  const handleSave = () => {
    setSaving(true);
    saveNotificationSettings(settings);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 400);
  };

  const handleTest = async () => {
    setTesting(true);
    testNotification();
    setTimeout(() => setTesting(false), 1000);
  };

  const updateSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] pb-20 pt-safe">
        <main className="max-w-[600px] mx-auto px-4 pt-6">
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbfd] pb-20 pt-safe">
      <main className="max-w-[600px] mx-auto px-4 sm:px-6 pt-6 pb-4 space-y-5">
        {/* Page Title */}
        <div className="flex items-center gap-4 mb-2">
          <Link
            href="/settings"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-[#86868b]" />
          </Link>
          <h1 className="text-[32px] font-bold text-[#1d1d1f]">การแจ้งเตือน</h1>
        </div>

        {/* Push Notification Status */}
        <Card elevated className="overflow-hidden">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isPushActive ? "bg-[#34c759]/10" : "bg-[#86868b]/10"
                }`}>
                  {isPushActive ? (
                    <BellRing className="w-6 h-6 text-[#34c759]" />
                  ) : (
                    <BellOff className="w-6 h-6 text-[#86868b]" />
                  )}
                </div>
                <div>
                  <p className="text-[17px] font-semibold text-[#1d1d1f]">Push Notification</p>
                  <p className="text-[13px] text-[#86868b] mt-0.5">
                    {isPushActive
                      ? "เปิดอยู่ — รับการแจ้งเตือนแม้ปิดแอป"
                      : "ปิดอยู่ — จะไม่ได้รับการแจ้งเตือน"}
                  </p>
                </div>
              </div>
              <Toggle
                checked={settings.enabled}
                onChange={handleToggleEnabled}
                disabled={subscribing || permissionStatus === "unsupported"}
              />
            </div>
          </div>

          {/* Connection Status */}
          <div className={`px-5 py-3 border-t border-[#e8e8ed] flex items-center gap-2 ${
            isPushActive ? "bg-[#34c759]/5" : "bg-[#f5f5f7]"
          }`}>
            {isPushActive ? (
              <>
                <Wifi className="w-4 h-4 text-[#34c759]" />
                <span className="text-[13px] text-[#34c759] font-medium">เชื่อมต่อ Push สำเร็จ</span>
              </>
            ) : subscribing ? (
              <>
                <RefreshCw className="w-4 h-4 text-[#0071e3] animate-spin" />
                <span className="text-[13px] text-[#0071e3] font-medium">กำลังเชื่อมต่อ...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-[#86868b]" />
                <span className="text-[13px] text-[#86868b]">ยังไม่ได้เชื่อมต่อ</span>
              </>
            )}
          </div>
        </Card>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-[#ff3b30]/5 rounded-xl border border-[#ff3b30]/20">
            <XCircle className="w-5 h-5 text-[#ff3b30] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[14px] text-[#ff3b30] font-medium">{error}</p>
              {permissionStatus === "denied" && (
                <p className="text-[12px] text-[#86868b] mt-1">
                  ไปที่ Settings &gt; Safari/Chrome &gt; เปิดการแจ้งเตือนสำหรับเว็บไซต์นี้
                </p>
              )}
            </div>
          </div>
        )}

        {/* Permission Warning */}
        {permissionStatus === "unsupported" && (
          <div className="flex items-start gap-3 p-4 bg-[#ff9500]/5 rounded-xl border border-[#ff9500]/20">
            <AlertCircle className="w-5 h-5 text-[#ff9500] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[14px] font-medium text-[#ff9500]">ไม่รองรับการแจ้งเตือน</p>
              <p className="text-[12px] text-[#86868b] mt-1">
                Browser นี้ไม่รองรับ Push Notification กรุณาใช้ Chrome, Safari หรือติดตั้งแอปผ่าน Add to Home Screen
              </p>
            </div>
          </div>
        )}

        {permissionStatus === "denied" && !error && (
          <div className="flex items-start gap-3 p-4 bg-[#ff3b30]/5 rounded-xl border border-[#ff3b30]/20">
            <Shield className="w-5 h-5 text-[#ff3b30] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[14px] font-medium text-[#ff3b30]">การแจ้งเตือนถูกบล็อก</p>
              <p className="text-[12px] text-[#86868b] mt-1">
                กรุณาเปิดการแจ้งเตือนในการตั้งค่าของ Browser หรืออุปกรณ์
              </p>
              <Button
                size="sm"
                variant="secondary"
                className="mt-2"
                onClick={handleEnablePush}
                loading={subscribing}
              >
                <RefreshCw className="w-4 h-4" />
                ลองขออนุญาตอีกครั้ง
              </Button>
            </div>
          </div>
        )}

        {/* Push Notification Categories */}
        {settings.enabled && (
          <div>
            <p className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wide px-1 mb-3">
              ประเภทการแจ้งเตือน
            </p>
            <Card elevated className="divide-y divide-[#e8e8ed]">
              {/* Announcements */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0071e3]/10 flex items-center justify-center">
                    <Megaphone className="w-5 h-5 text-[#0071e3]" />
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-[#1d1d1f]">ประกาศ</p>
                    <p className="text-[12px] text-[#86868b]">แจ้งเตือนเมื่อมีประกาศใหม่</p>
                  </div>
                </div>
                <Toggle
                  checked={settings.pushAnnouncements}
                  onChange={(v) => updateSetting("pushAnnouncements", v)}
                />
              </div>

              {/* Approvals */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#34c759]/10 flex items-center justify-center">
                    <ClipboardCheck className="w-5 h-5 text-[#34c759]" />
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-[#1d1d1f]">การอนุมัติ</p>
                    <p className="text-[12px] text-[#86868b]">แจ้งเมื่อคำขอได้รับการอนุมัติ/ปฏิเสธ</p>
                  </div>
                </div>
                <Toggle
                  checked={settings.pushApprovals}
                  onChange={(v) => updateSetting("pushApprovals", v)}
                />
              </div>

              {/* Leave */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#ff9500]/10 flex items-center justify-center">
                    <CalendarOff className="w-5 h-5 text-[#ff9500]" />
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-[#1d1d1f]">วันหยุด/วันลา</p>
                    <p className="text-[12px] text-[#86868b]">แจ้งเตือนวันหยุดและสถานะการลา</p>
                  </div>
                </div>
                <Toggle
                  checked={settings.pushLeave}
                  onChange={(v) => updateSetting("pushLeave", v)}
                />
              </div>
            </Card>
          </div>
        )}

        {/* Check-in/out Reminders */}
        {settings.enabled && (
          <div>
            <p className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wide px-1 mb-3">
              แจ้งเตือนตามเวลา
            </p>
            <Card elevated className="divide-y divide-[#e8e8ed]">
              {/* Check-in Reminder */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0071e3]/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-[#0071e3]" />
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-[#1d1d1f]">แจ้งเตือนเช็คอิน</p>
                    <p className="text-[12px] text-[#86868b]">
                      ทุกวันเวลา {settings.checkinTime} น.
                    </p>
                  </div>
                </div>
                <Toggle
                  checked={settings.checkinReminder}
                  onChange={(v) => updateSetting("checkinReminder", v)}
                />
              </div>

              {/* Check-out Reminder */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#ff9500]/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-[#ff9500]" />
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-[#1d1d1f]">แจ้งเตือนเช็คเอาท์</p>
                    <p className="text-[12px] text-[#86868b]">
                      ทุกวันเวลา {settings.checkoutTime} น.
                    </p>
                  </div>
                </div>
                <Toggle
                  checked={settings.checkoutReminder}
                  onChange={(v) => updateSetting("checkoutReminder", v)}
                />
              </div>
            </Card>

            <p className="text-[12px] text-[#86868b] px-1 mt-2">
              เวลาเช็คอิน/เช็คเอาท์ตั้งค่าโดยผู้ดูแลระบบ · ไม่แจ้งเตือนในวันหยุด
            </p>
          </div>
        )}

        {/* Actions */}
        {settings.enabled && (
          <div className="space-y-3">
            {/* Test */}
            <Button
              fullWidth
              variant="secondary"
              onClick={handleTest}
              loading={testing}
              size="lg"
            >
              <Volume2 className="w-5 h-5" />
              ทดสอบการแจ้งเตือน
            </Button>

            {/* Save */}
            <Button
              fullWidth
              onClick={handleSave}
              loading={saving}
              size="lg"
            >
              {saved ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  บันทึกแล้ว
                </>
              ) : (
                "บันทึกการตั้งค่า"
              )}
            </Button>
          </div>
        )}

        {/* iOS Info */}
        <div className="p-4 bg-[#f5f5f7] rounded-xl">
          <div className="flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-[#86868b] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[15px] font-medium text-[#1d1d1f] mb-1">
                สำหรับ iPhone / iPad
              </p>
              <div className="text-[13px] text-[#86868b] leading-relaxed space-y-1">
                <p>1. เปิดเว็บใน <strong>Safari</strong></p>
                <p>2. กดปุ่ม Share → <strong>"Add to Home Screen"</strong></p>
                <p>3. เปิดแอปจาก Home Screen</p>
                <p>4. กลับมาเปิด Push Notification ที่หน้านี้</p>
              </div>
              <p className="text-[11px] text-[#86868b] mt-2">
                ต้องใช้ iOS 16.4 ขึ้นไป · Push ทำงานเมื่อแอปเปิดอยู่หรือเพิ่งปิดไป
              </p>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

export default function NotificationSettingsPage() {
  return (
    <ProtectedRoute>
      <NotificationSettingsContent />
    </ProtectedRoute>
  );
}
