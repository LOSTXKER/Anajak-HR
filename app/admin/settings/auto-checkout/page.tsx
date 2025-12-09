"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TimeInput } from "@/components/ui/TimeInput";
import { useToast } from "@/components/ui/Toast";
import {
  Clock,
  Bell,
  MapPin,
  Shield,
  Save,
  Info,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Play,
  CheckCircle,
  Users,
  Activity,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface Settings {
  auto_checkout_enabled: boolean;
  auto_checkout_delay_hours: number;
  auto_checkout_require_outside_radius: boolean;
  auto_checkout_skip_if_ot: boolean;
  auto_checkout_time: string;
  reminder_enabled: boolean;
  reminder_first_minutes: number;
  reminder_second_minutes: number;
  reminder_third_minutes: number;
  notify_admin_on_auto_checkout: boolean;
}

function Toggle({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
        enabled ? "bg-[#34c759]" : "bg-[#e8e8ed]"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

interface DashboardData {
  pendingCheckouts: number;
  todayAutoCheckouts: number;
  todayReminders: number;
  pendingList: Array<{ name: string; clockIn: string }>;
}

function AutoCheckoutContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [dashboard, setDashboard] = useState<DashboardData>({
    pendingCheckouts: 0,
    todayAutoCheckouts: 0,
    todayReminders: 0,
    pendingList: [],
  });
  const [settings, setSettings] = useState<Settings>({
    auto_checkout_enabled: true,
    auto_checkout_delay_hours: 4,
    auto_checkout_require_outside_radius: true,
    auto_checkout_skip_if_ot: true,
    auto_checkout_time: "18:00",
    reminder_enabled: true,
    reminder_first_minutes: 15,
    reminder_second_minutes: 60,
    reminder_third_minutes: 180,
    notify_admin_on_auto_checkout: true,
  });

  useEffect(() => {
    fetchSettings();
    fetchDashboard();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", [
          "auto_checkout_enabled",
          "auto_checkout_delay_hours",
          "auto_checkout_require_outside_radius",
          "auto_checkout_skip_if_ot",
          "auto_checkout_time",
          "reminder_enabled",
          "reminder_first_minutes",
          "reminder_second_minutes",
          "reminder_third_minutes",
          "notify_admin_on_auto_checkout",
        ]);

      if (error) throw error;

      if (data) {
        const newSettings = { ...settings };
        data.forEach((item: any) => {
          const key = item.setting_key as keyof Settings;
          if (key in newSettings) {
            if (typeof newSettings[key] === "boolean") {
              (newSettings as any)[key] = item.setting_value === "true";
            } else if (typeof newSettings[key] === "number") {
              (newSettings as any)[key] = parseInt(item.setting_value || "0");
            } else {
              (newSettings as any)[key] = item.setting_value || "";
            }
          }
        });
        setSettings(newSettings);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดการตั้งค่าได้");
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");

      // หาพนักงานที่ยังไม่ได้เช็คเอาท์วันนี้
      const { data: pendingData } = await supabase
        .from("attendance_logs")
        .select(`
          id,
          clock_in_time,
          employee:employees!employee_id(name, role)
        `)
        .eq("work_date", today)
        .is("clock_out_time", null);

      // Filter เฉพาะที่ไม่ใช่ admin
      const pending = (pendingData || []).filter(
        (a: any) => a.employee?.role !== "admin"
      );

      // หา auto checkout วันนี้
      const { data: autoData } = await supabase
        .from("attendance_logs")
        .select("id")
        .eq("work_date", today)
        .eq("auto_checkout", true);

      // หา reminders ที่ส่งวันนี้
      const { data: reminderData } = await supabase
        .from("checkout_reminders")
        .select("id")
        .gte("sent_at", `${today}T00:00:00+07:00`)
        .lte("sent_at", `${today}T23:59:59+07:00`);

      setDashboard({
        pendingCheckouts: pending.length,
        todayAutoCheckouts: autoData?.length || 0,
        todayReminders: reminderData?.length || 0,
        pendingList: pending.map((p: any) => ({
          name: p.employee?.name || "ไม่ระบุ",
          clockIn: p.clock_in_time
            ? format(new Date(p.clock_in_time), "HH:mm")
            : "-",
        })),
      });
    } catch (error) {
      console.error("Error fetching dashboard:", error);
    }
  };

  const testAutoCheckout = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/auto-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      setTestResult(data);

      if (data.success) {
        toast.success(
          "ทดสอบสำเร็จ",
          `Reminders: ${data.results?.reminders_sent || 0}, Auto Checkouts: ${data.results?.auto_checkouts || 0}`
        );
        fetchDashboard(); // Refresh dashboard
      } else {
        toast.error("เกิดข้อผิดพลาด", data.error || data.message);
      }
    } catch (error: any) {
      console.error("Error testing auto checkout:", error);
      toast.error("เกิดข้อผิดพลาด", error.message || "ไม่สามารถทดสอบได้");
      setTestResult({ error: error.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: String(value),
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("system_settings")
          .upsert(update, { onConflict: "setting_key" });

        if (error) throw error;
      }

      toast.success("บันทึกสำเร็จ", "การตั้งค่าถูกบันทึกเรียบร้อยแล้ว");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกการตั้งค่าได้");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="ตั้งค่า Auto Check-out">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="ตั้งค่า Auto Check-out"
      description="กำหนดเงื่อนไขการเช็คเอาท์อัตโนมัติและการแจ้งเตือน"
    >
      <div className="max-w-3xl space-y-6">
        {/* Dashboard Status */}
        <Card elevated className="border-l-4 border-l-[#34c759]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#34c759]/10 rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-[#34c759]" />
              </div>
              <div>
                <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
                  สถานะระบบวันนี้
                </h2>
                <p className="text-[13px] text-[#86868b]">
                  {format(new Date(), "d MMMM yyyy", { locale: th })}
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchDashboard}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              รีเฟรช
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-[#ff9500]/10 rounded-xl text-center">
              <Users className="w-6 h-6 text-[#ff9500] mx-auto mb-2" />
              <p className="text-[24px] font-bold text-[#ff9500]">
                {dashboard.pendingCheckouts}
              </p>
              <p className="text-[12px] text-[#86868b]">รอเช็คเอาท์</p>
            </div>
            <div className="p-4 bg-[#0071e3]/10 rounded-xl text-center">
              <Clock className="w-6 h-6 text-[#0071e3] mx-auto mb-2" />
              <p className="text-[24px] font-bold text-[#0071e3]">
                {dashboard.todayAutoCheckouts}
              </p>
              <p className="text-[12px] text-[#86868b]">Auto Checkout</p>
            </div>
            <div className="p-4 bg-[#34c759]/10 rounded-xl text-center">
              <Bell className="w-6 h-6 text-[#34c759] mx-auto mb-2" />
              <p className="text-[24px] font-bold text-[#34c759]">
                {dashboard.todayReminders}
              </p>
              <p className="text-[12px] text-[#86868b]">Reminders</p>
            </div>
          </div>

          {/* Pending List */}
          {dashboard.pendingList.length > 0 && (
            <div className="mb-4">
              <p className="text-[13px] font-medium text-[#86868b] mb-2">
                พนักงานที่ยังไม่ได้เช็คเอาท์:
              </p>
              <div className="flex flex-wrap gap-2">
                {dashboard.pendingList.map((p, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-[#f5f5f7] text-[13px] text-[#1d1d1f] rounded-full"
                  >
                    {p.name} ({p.clockIn})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Test Button */}
          <div className="flex items-center gap-3 pt-4 border-t border-[#e8e8ed]">
            <Button
              onClick={testAutoCheckout}
              loading={testing}
              variant={settings.auto_checkout_enabled ? "primary" : "secondary"}
              icon={!testing ? <Play className="w-4 h-4" /> : undefined}
            >
              {testing ? "กำลังทดสอบ..." : "ทดสอบ Auto Checkout"}
            </Button>
            {testResult && (
              <div className="flex items-center gap-2 text-[13px]">
                {testResult.success ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-[#34c759]" />
                    <span className="text-[#34c759]">
                      สำเร็จ - Reminders: {testResult.results?.reminders_sent || 0}, 
                      Auto: {testResult.results?.auto_checkouts || 0}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-[#ff9500]" />
                    <span className="text-[#ff9500]">
                      {testResult.message || testResult.error || "ไม่มีการดำเนินการ"}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Info Card */}
        <Card elevated className="border-l-4 border-l-[#0071e3]">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-[#0071e3] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-1">
                ระบบ Auto Check-out ทำงานอย่างไร?
              </h3>
              <div className="text-[13px] text-[#86868b] space-y-1">
                <p>1. เมื่อพนักงานลืมเช็คเอาท์ ระบบจะส่งการแจ้งเตือนตามเวลาที่กำหนด</p>
                <p>2. ถ้ายังไม่เช็คเอาท์ ระบบจะเช็คเอาท์อัตโนมัติตามเงื่อนไขที่ตั้งไว้</p>
                <p>3. เวลาเช็คเอาท์จะเป็นเวลาเลิกงานปกติ (ไม่ใช่เวลาปัจจุบัน)</p>
                <p>4. ระบบจะแจ้งเตือน Admin เพื่อตรวจสอบความถูกต้อง</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Auto Check-out Settings */}
        <Card elevated>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#0071e3]/10 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#0071e3]" />
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
                Auto Check-out
              </h2>
              <p className="text-[13px] text-[#86868b]">
                ระบบเช็คเอาท์อัตโนมัติเมื่อพนักงานลืมเช็คเอาท์
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Enable Auto Checkout */}
            <div className="flex items-center justify-between py-3 border-b border-[#e8e8ed]">
              <div>
                <p className="text-[15px] font-medium text-[#1d1d1f]">
                  เปิดใช้งาน Auto Check-out
                </p>
                <p className="text-[13px] text-[#86868b]">
                  เช็คเอาท์อัตโนมัติเมื่อพนักงานลืมเช็คเอาท์
                </p>
              </div>
              <Toggle
                enabled={settings.auto_checkout_enabled}
                onChange={(value) =>
                  setSettings((prev) => ({ ...prev, auto_checkout_enabled: value }))
                }
              />
            </div>

            {/* Delay Hours */}
            <div className="py-3 border-b border-[#e8e8ed]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[15px] font-medium text-[#1d1d1f]">
                    รอก่อน Auto Check-out
                  </p>
                  <p className="text-[13px] text-[#86868b]">
                    จำนวนชั่วโมงหลังเวลาเลิกงานก่อนที่ระบบจะ Auto Check-out
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={settings.auto_checkout_delay_hours}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      auto_checkout_delay_hours: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-24"
                  min={1}
                  max={12}
                  disabled={!settings.auto_checkout_enabled}
                />
                <span className="text-[15px] text-[#86868b]">ชั่วโมง</span>
              </div>
            </div>

            {/* Auto Checkout Time */}
            <div className="py-3 border-b border-[#e8e8ed]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[15px] font-medium text-[#1d1d1f]">
                    เวลาเช็คเอาท์เมื่อ Auto Check-out
                  </p>
                  <p className="text-[13px] text-[#86868b]">
                    ระบบจะบันทึกเวลาเช็คเอาท์เป็นเวลานี้ (แทนที่จะเป็นเวลาปัจจุบัน)
                  </p>
                </div>
              </div>
              <TimeInput
                value={settings.auto_checkout_time}
                onChange={(val) =>
                  setSettings((prev) => ({
                    ...prev,
                    auto_checkout_time: val,
                  }))
                }
                className="w-32"
                disabled={!settings.auto_checkout_enabled}
              />
            </div>

            {/* Require Outside Radius */}
            <div className="flex items-center justify-between py-3 border-b border-[#e8e8ed]">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#86868b] mt-0.5" />
                <div>
                  <p className="text-[15px] font-medium text-[#1d1d1f]">
                    ต้องอยู่นอกรัศมีก่อน Auto Check-out
                  </p>
                  <p className="text-[13px] text-[#86868b]">
                    ถ้าพนักงานยังอยู่ในรัศมีสาขา ระบบจะไม่ Auto Check-out
                  </p>
                </div>
              </div>
              <Toggle
                enabled={settings.auto_checkout_require_outside_radius}
                onChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    auto_checkout_require_outside_radius: value,
                  }))
                }
                disabled={!settings.auto_checkout_enabled}
              />
            </div>

            {/* Skip if OT */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-[#86868b] mt-0.5" />
                <div>
                  <p className="text-[15px] font-medium text-[#1d1d1f]">
                    ไม่ Auto Check-out ถ้ามี OT ที่อนุมัติแล้ว
                  </p>
                  <p className="text-[13px] text-[#86868b]">
                    ป้องกันไม่ให้ระบบ Auto Check-out ในขณะที่พนักงานกำลังทำ OT
                  </p>
                </div>
              </div>
              <Toggle
                enabled={settings.auto_checkout_skip_if_ot}
                onChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    auto_checkout_skip_if_ot: value,
                  }))
                }
                disabled={!settings.auto_checkout_enabled}
              />
            </div>
          </div>
        </Card>

        {/* Reminder Settings */}
        <Card elevated>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-[#ff9500]" />
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
                การแจ้งเตือน
              </h2>
              <p className="text-[13px] text-[#86868b]">
                ส่งการแจ้งเตือนไปยัง LINE เมื่อพนักงานลืมเช็คเอาท์
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Enable Reminders */}
            <div className="flex items-center justify-between py-3 border-b border-[#e8e8ed]">
              <div>
                <p className="text-[15px] font-medium text-[#1d1d1f]">
                  เปิดใช้งานการแจ้งเตือน
                </p>
                <p className="text-[13px] text-[#86868b]">
                  ส่งการแจ้งเตือนผ่าน LINE เมื่อพนักงานลืมเช็คเอาท์
                </p>
              </div>
              <Toggle
                enabled={settings.reminder_enabled}
                onChange={(value) =>
                  setSettings((prev) => ({ ...prev, reminder_enabled: value }))
                }
              />
            </div>

            {/* Reminder Times */}
            <div className="space-y-4">
              <p className="text-[15px] font-medium text-[#1d1d1f]">
                เวลาส่งการแจ้งเตือน (หลังเวลาเลิกงาน)
              </p>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[13px] text-[#86868b] mb-2">
                    ครั้งที่ 1
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={settings.reminder_first_minutes}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          reminder_first_minutes: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-20"
                      min={5}
                      max={60}
                      disabled={!settings.reminder_enabled}
                    />
                    <span className="text-[13px] text-[#86868b]">นาที</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] text-[#86868b] mb-2">
                    ครั้งที่ 2
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={settings.reminder_second_minutes}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          reminder_second_minutes: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-20"
                      min={30}
                      max={120}
                      disabled={!settings.reminder_enabled}
                    />
                    <span className="text-[13px] text-[#86868b]">นาที</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] text-[#86868b] mb-2">
                    ครั้งที่ 3
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={settings.reminder_third_minutes}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          reminder_third_minutes: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-20"
                      min={60}
                      max={360}
                      disabled={!settings.reminder_enabled}
                    />
                    <span className="text-[13px] text-[#86868b]">นาที</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notify Admin */}
            <div className="flex items-center justify-between py-3 border-t border-[#e8e8ed]">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#86868b] mt-0.5" />
                <div>
                  <p className="text-[15px] font-medium text-[#1d1d1f]">
                    แจ้งเตือน Admin เมื่อมี Auto Check-out
                  </p>
                  <p className="text-[13px] text-[#86868b]">
                    ส่งการแจ้งเตือนไปยังกลุ่ม LINE ของ Admin
                  </p>
                </div>
              </div>
              <Toggle
                enabled={settings.notify_admin_on_auto_checkout}
                onChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    notify_admin_on_auto_checkout: value,
                  }))
                }
              />
            </div>
          </div>
        </Card>

        {/* Flow Diagram */}
        <Card elevated>
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">
            📋 ลำดับการทำงานของระบบ
          </h3>
          <div className="space-y-3 text-[14px]">
            <div className="flex items-center gap-3 p-3 bg-[#f5f5f7] rounded-lg">
              <div className="w-8 h-8 bg-[#ff9500] text-white rounded-full flex items-center justify-center font-bold text-[12px]">
                1
              </div>
              <div>
                <p className="font-medium text-[#1d1d1f]">
                  หลังเวลาเลิกงาน {settings.reminder_first_minutes} นาที
                </p>
                <p className="text-[13px] text-[#86868b]">
                  ส่งการแจ้งเตือนครั้งที่ 1 ผ่าน LINE
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-[#f5f5f7] rounded-lg">
              <div className="w-8 h-8 bg-[#ff9500] text-white rounded-full flex items-center justify-center font-bold text-[12px]">
                2
              </div>
              <div>
                <p className="font-medium text-[#1d1d1f]">
                  หลังเวลาเลิกงาน {settings.reminder_second_minutes} นาที
                </p>
                <p className="text-[13px] text-[#86868b]">
                  ส่งการแจ้งเตือนครั้งที่ 2 ผ่าน LINE
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-[#f5f5f7] rounded-lg">
              <div className="w-8 h-8 bg-[#ff9500] text-white rounded-full flex items-center justify-center font-bold text-[12px]">
                3
              </div>
              <div>
                <p className="font-medium text-[#1d1d1f]">
                  หลังเวลาเลิกงาน {settings.reminder_third_minutes} นาที
                </p>
                <p className="text-[13px] text-[#86868b]">
                  ส่งการแจ้งเตือนครั้งที่ 3 (ครั้งสุดท้าย)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-[#ff3b30]/5 rounded-lg border border-[#ff3b30]/20">
              <div className="w-8 h-8 bg-[#ff3b30] text-white rounded-full flex items-center justify-center font-bold text-[12px]">
                4
              </div>
              <div>
                <p className="font-medium text-[#1d1d1f]">
                  หลังเวลาเลิกงาน {settings.auto_checkout_delay_hours} ชั่วโมง
                </p>
                <p className="text-[13px] text-[#86868b]">
                  Auto Check-out (บันทึกเวลา {settings.auto_checkout_time} น.)
                  {settings.auto_checkout_require_outside_radius &&
                    " - ต้องอยู่นอกรัศมี"}
                  {settings.auto_checkout_skip_if_ot && " - ไม่ทำงานถ้ามี OT"}
                </p>
              </div>
            </div>
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

export default function AutoCheckoutSettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AutoCheckoutContent />
    </ProtectedRoute>
  );
}

