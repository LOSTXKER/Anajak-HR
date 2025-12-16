"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { TimeInput } from "@/components/ui/TimeInput";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Clock,
  Calendar,
  CheckCircle,
  AlertCircle,
  Smartphone,
  Volume2,
} from "lucide-react";
import {
  requestNotificationPermission,
  canShowNotifications,
  getNotificationSettings,
  saveNotificationSettings,
  testNotification,
  scheduleDailyNotifications,
  NotificationSettings,
} from "@/lib/utils/notifications";

function NotificationSettingsContent() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: false,
    checkinReminder: true,
    checkinTime: "08:00",
    checkoutReminder: true,
    checkoutTime: "17:00",
    workdaysOnly: true,
  });
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | "unsupported">("default");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loadedSettings = getNotificationSettings();
    setSettings(loadedSettings);

    // Check notification permission
    if ("Notification" in window) {
      setPermissionStatus(Notification.permission);
    } else {
      setPermissionStatus("unsupported");
    }
  }, []);

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setPermissionStatus(granted ? "granted" : "denied");
    
    if (granted) {
      setSettings((prev) => ({ ...prev, enabled: true }));
    }
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    if (enabled && permissionStatus !== "granted") {
      const granted = await requestNotificationPermission();
      if (!granted) {
        return;
      }
      setPermissionStatus("granted");
    }
    setSettings((prev) => ({ ...prev, enabled }));
  };

  const handleSave = () => {
    setSaving(true);
    saveNotificationSettings(settings);
    
    // Schedule notifications if enabled
    if (settings.enabled && canShowNotifications()) {
      scheduleDailyNotifications(settings);
    }
    
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 500);
  };

  const handleTest = () => {
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

  return (
    <div className="min-h-screen bg-[#fbfbfd]">
      {/* Header */}
      <header className="sticky top-0 z-50 apple-glass border-b border-[#d2d2d7]/30">
        <div className="max-w-[600px] mx-auto px-6 h-12 flex items-center justify-between">
          <Link href="/my-profile" className="flex items-center gap-2 text-[#0071e3]">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-[15px]">กลับ</span>
          </Link>
          <h1 className="text-[17px] font-semibold text-[#1d1d1f]">การแจ้งเตือน</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-[600px] mx-auto px-6 py-8 space-y-6">
        {/* Permission Status */}
        {permissionStatus === "unsupported" && (
          <div className="flex items-center gap-3 p-4 bg-[#ff9500]/10 rounded-xl border border-[#ff9500]/30">
            <AlertCircle className="w-5 h-5 text-[#ff9500]" />
            <div>
              <p className="text-[15px] font-medium text-[#ff9500]">ไม่รองรับการแจ้งเตือน</p>
              <p className="text-[13px] text-[#86868b]">
                Browser นี้ไม่รองรับ Web Notifications
              </p>
            </div>
          </div>
        )}

        {permissionStatus === "denied" && (
          <div className="flex items-center gap-3 p-4 bg-[#ff3b30]/10 rounded-xl border border-[#ff3b30]/30">
            <BellOff className="w-5 h-5 text-[#ff3b30]" />
            <div>
              <p className="text-[15px] font-medium text-[#ff3b30]">การแจ้งเตือนถูกปิด</p>
              <p className="text-[13px] text-[#86868b]">
                กรุณาเปิดการแจ้งเตือนในการตั้งค่า Browser
              </p>
            </div>
          </div>
        )}

        {/* Main Toggle */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                settings.enabled ? "bg-[#34c759]/10" : "bg-[#86868b]/10"
              }`}>
                {settings.enabled ? (
                  <Bell className="w-5 h-5 text-[#34c759]" />
                ) : (
                  <BellOff className="w-5 h-5 text-[#86868b]" />
                )}
              </div>
              <div>
                <p className="text-[17px] font-medium text-[#1d1d1f]">เปิดการแจ้งเตือน</p>
                <p className="text-[13px] text-[#86868b]">รับการแจ้งเตือนเช็คอิน/เช็คเอาท์</p>
              </div>
            </div>
            <Toggle
              checked={settings.enabled}
              onChange={handleToggleEnabled}
              disabled={permissionStatus === "unsupported" || permissionStatus === "denied"}
            />
          </div>
        </Card>

        {/* Check-in Reminder */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-[#e8e8ed]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0071e3]/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#0071e3]" />
                </div>
                <div>
                  <p className="text-[17px] font-medium text-[#1d1d1f]">แจ้งเตือนเช็คอิน</p>
                  <p className="text-[13px] text-[#86868b]">เตือนเมื่อถึงเวลาเข้างาน</p>
                </div>
              </div>
              <Toggle
                checked={settings.checkinReminder}
                onChange={(v) => updateSetting("checkinReminder", v)}
                disabled={!settings.enabled}
              />
            </div>
          </div>
          
          {settings.checkinReminder && settings.enabled && (
            <div className="p-4 bg-[#f5f5f7]">
              <label className="text-[13px] text-[#86868b] mb-2 block">เวลาแจ้งเตือน</label>
              <TimeInput
                value={settings.checkinTime}
                onChange={(v) => updateSetting("checkinTime", v)}
              />
            </div>
          )}
        </Card>

        {/* Check-out Reminder */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-[#e8e8ed]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#ff9500]/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#ff9500]" />
                </div>
                <div>
                  <p className="text-[17px] font-medium text-[#1d1d1f]">แจ้งเตือนเช็คเอาท์</p>
                  <p className="text-[13px] text-[#86868b]">เตือนเมื่อถึงเวลาเลิกงาน</p>
                </div>
              </div>
              <Toggle
                checked={settings.checkoutReminder}
                onChange={(v) => updateSetting("checkoutReminder", v)}
                disabled={!settings.enabled}
              />
            </div>
          </div>
          
          {settings.checkoutReminder && settings.enabled && (
            <div className="p-4 bg-[#f5f5f7]">
              <label className="text-[13px] text-[#86868b] mb-2 block">เวลาแจ้งเตือน</label>
              <TimeInput
                value={settings.checkoutTime}
                onChange={(v) => updateSetting("checkoutTime", v)}
              />
            </div>
          )}
        </Card>

        {/* Workdays Only */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#5856d6]/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#5856d6]" />
              </div>
              <div>
                <p className="text-[17px] font-medium text-[#1d1d1f]">เฉพาะวันทำงาน</p>
                <p className="text-[13px] text-[#86868b]">ไม่แจ้งเตือนวันเสาร์-อาทิตย์</p>
              </div>
            </div>
            <Toggle
              checked={settings.workdaysOnly}
              onChange={(v) => updateSetting("workdaysOnly", v)}
              disabled={!settings.enabled}
            />
          </div>
        </Card>

        {/* Test Notification */}
        {settings.enabled && permissionStatus === "granted" && (
          <Card className="p-4">
            <Button
              fullWidth
              variant="secondary"
              onClick={handleTest}
              loading={testing}
            >
              <Volume2 className="w-5 h-5" />
              ทดสอบการแจ้งเตือน
            </Button>
          </Card>
        )}

        {/* iOS PWA Info */}
        <div className="p-4 bg-[#f5f5f7] rounded-xl">
          <div className="flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-[#86868b] mt-0.5" />
            <div>
              <p className="text-[15px] font-medium text-[#1d1d1f] mb-1">
                หมายเหตุสำหรับ iOS
              </p>
              <p className="text-[13px] text-[#86868b] leading-relaxed">
                • ต้องใช้ iOS 16.4 ขึ้นไป<br />
                • ต้องติดตั้งแอปผ่าน "Add to Home Screen"<br />
                • การแจ้งเตือนจะทำงานเมื่อแอปเปิดอยู่หรือเพิ่งปิดไป
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
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
      </main>
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

