"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  Clock,
  Save,
  ChevronRight,
  Bell,
  DollarSign,
  Calendar,
  Building2,
  MessageCircle,
  Settings2,
  UserCheck,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { TimeInput } from "@/components/ui/TimeInput";

// Toggle Switch Component
const ToggleSwitch = ({ 
  enabled, 
  onChange 
}: { 
  enabled: boolean; 
  onChange: () => void;
}) => (
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

// Setting Link Card Component
const SettingLink = ({ 
  href, 
  icon: Icon, 
  color, 
  title, 
  description 
}: { 
  href: string; 
  icon: any; 
  color: string; 
  title: string; 
  description: string;
}) => (
  <Link href={href}>
    <div className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-xl hover:bg-[#e8e8ed] transition-colors cursor-pointer">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${color}/10 rounded-xl flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <h4 className="text-[15px] font-medium text-[#1d1d1f]">{title}</h4>
          <p className="text-[13px] text-[#86868b]">{description}</p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-[#86868b]" />
    </div>
  </Link>
);

// Day Selector Component
const DaySelector = ({
  selectedDays,
  onChange,
}: {
  selectedDays: number[];
  onChange: (days: number[]) => void;
}) => {
  const DAYS = [
    { value: 1, label: "จ" },
    { value: 2, label: "อ" },
    { value: 3, label: "พ" },
    { value: 4, label: "พฤ" },
    { value: 5, label: "ศ" },
    { value: 6, label: "ส" },
    { value: 7, label: "อา" },
  ];

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      onChange(selectedDays.filter((d) => d !== day));
    } else {
      onChange([...selectedDays, day].sort((a, b) => a - b));
    }
  };

  return (
    <div className="flex gap-2">
      {DAYS.map((day) => (
        <button
          key={day.value}
          type="button"
          onClick={() => toggleDay(day.value)}
          className={`
            w-10 h-10 rounded-xl text-sm font-medium transition-all
            ${selectedDays.includes(day.value)
              ? "bg-[#0071e3] text-white"
              : day.value >= 6
                ? "bg-[#ff9500]/10 text-[#ff9500] hover:bg-[#ff9500]/20"
                : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]"
            }
          `}
        >
          {day.label}
        </button>
      ))}
    </div>
  );
};

function SettingsContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Work Time Settings
  const [settings, setSettings] = useState({
    workStartTime: "09:00",
    workEndTime: "18:00",
    checkinTimeStart: "06:00",
    checkinTimeEnd: "12:00",
    checkoutTimeStart: "15:00",
    checkoutTimeEnd: "22:00",
    lateThreshold: "15",
    workingDays: [1, 2, 3, 4, 5],
    requirePhoto: true,
    requireGPS: true,
    requireAccountApproval: true,
    enableNotifications: true,
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
          checkinTimeStart: settingsMap.checkin_time_start || "06:00",
          checkinTimeEnd: settingsMap.checkin_time_end || "12:00",
          checkoutTimeStart: settingsMap.checkout_time_start || "15:00",
          checkoutTimeEnd: settingsMap.checkout_time_end || "22:00",
          lateThreshold: settingsMap.late_threshold_minutes || "15",
          workingDays: settingsMap.working_days 
            ? settingsMap.working_days.split(",").map(Number).filter(Boolean)
            : [1, 2, 3, 4, 5],
          requirePhoto: settingsMap.require_photo === "true",
          requireGPS: settingsMap.require_gps === "true",
          requireAccountApproval: settingsMap.require_account_approval !== "false",
          enableNotifications: settingsMap.enable_notifications === "true",
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
        { key: "checkin_time_start", value: settings.checkinTimeStart },
        { key: "checkin_time_end", value: settings.checkinTimeEnd },
        { key: "checkout_time_start", value: settings.checkoutTimeStart },
        { key: "checkout_time_end", value: settings.checkoutTimeEnd },
        { key: "late_threshold_minutes", value: settings.lateThreshold },
        { key: "working_days", value: settings.workingDays.join(",") },
        { key: "require_photo", value: settings.requirePhoto.toString() },
        { key: "require_gps", value: settings.requireGPS.toString() },
        { key: "require_account_approval", value: settings.requireAccountApproval.toString() },
        { key: "enable_notifications", value: settings.enableNotifications.toString() },
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
      <AdminLayout title="ตั้งค่าระบบ">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="ตั้งค่าระบบ" description="จัดการการตั้งค่าต่างๆ ของระบบ">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Time & Work Settings */}
        <div className="space-y-6">
          {/* Work Time Settings */}
          <Card elevated>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#0071e3]/10 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#0071e3]" />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">เวลาทำงาน</h3>
                <p className="text-[13px] text-[#86868b]">กำหนดเวลาเข้า-ออกงาน</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <TimeInput
                  label="เวลาเข้างาน"
                  value={settings.workStartTime}
                  onChange={(val) => setSettings({ ...settings, workStartTime: val })}
                />
                <TimeInput
                  label="เวลาเลิกงาน"
                  value={settings.workEndTime}
                  onChange={(val) => setSettings({ ...settings, workEndTime: val })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                  วันทำงาน
                </label>
                <DaySelector
                  selectedDays={settings.workingDays}
                  onChange={(days) => setSettings({ ...settings, workingDays: days })}
                />
                <p className="text-xs text-[#86868b] mt-2">
                  {settings.workingDays.length} วัน/สัปดาห์ • วันที่ไม่เลือกถือเป็นวันหยุด
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                  เกณฑ์มาสาย (นาที)
                </label>
                <input
                  type="number"
                  value={settings.lateThreshold}
                  onChange={(e) => setSettings({ ...settings, lateThreshold: e.target.value })}
                  className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                />
                <p className="text-xs text-[#86868b] mt-1">
                  มาหลังเวลา {settings.workStartTime} เกิน {settings.lateThreshold} นาที = มาสาย
                </p>
              </div>
            </div>
          </Card>
          
          {/* Checkin Time Window */}
          <Card elevated>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#ff9500]" />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">ช่วงเวลาเช็คอิน</h3>
                <p className="text-[13px] text-[#86868b]">ป้องกันการทำงานนอกเวลา</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <TimeInput
                  label="เช็คอินได้ตั้งแต่"
                  value={settings.checkinTimeStart}
                  onChange={(val) => setSettings({ ...settings, checkinTimeStart: val })}
                />
                <TimeInput
                  label="เช็คอินได้ถึง"
                  value={settings.checkinTimeEnd}
                  onChange={(val) => setSettings({ ...settings, checkinTimeEnd: val })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <TimeInput
                  label="เช็คเอาท์ได้ตั้งแต่"
                  value={settings.checkoutTimeStart}
                  onChange={(val) => setSettings({ ...settings, checkoutTimeStart: val })}
                />
                <TimeInput
                  label="เช็คเอาท์ได้ถึง"
                  value={settings.checkoutTimeEnd}
                  onChange={(val) => setSettings({ ...settings, checkoutTimeEnd: val })}
                />
              </div>
            </div>
          </Card>

          {/* Security Settings */}
          <Card elevated>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#af52de]/10 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#af52de]" />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">ความปลอดภัย</h3>
                <p className="text-[13px] text-[#86868b]">การยืนยันตัวตน</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
                <span className="text-[14px] text-[#1d1d1f]">บังคับถ่ายรูปเมื่อเช็กอิน</span>
                <ToggleSwitch 
                  enabled={settings.requirePhoto} 
                  onChange={() => setSettings({ ...settings, requirePhoto: !settings.requirePhoto })}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
                <span className="text-[14px] text-[#1d1d1f]">บังคับเปิด GPS</span>
                <ToggleSwitch 
                  enabled={settings.requireGPS} 
                  onChange={() => setSettings({ ...settings, requireGPS: !settings.requireGPS })}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
                <div>
                  <span className="text-[14px] text-[#1d1d1f] block">บังคับอนุมัติบัญชี</span>
                  <span className="text-[12px] text-[#86868b]">พนักงานใหม่ต้องรอ Admin อนุมัติ</span>
                </div>
                <ToggleSwitch 
                  enabled={settings.requireAccountApproval} 
                  onChange={() => setSettings({ ...settings, requireAccountApproval: !settings.requireAccountApproval })}
                />
              </div>
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
            {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่าพื้นฐาน"}
          </Button>
        </div>

        {/* Right Column - Setting Links */}
        <div className="space-y-6">
          {/* OT & Payroll */}
          <Card elevated>
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="w-5 h-5 text-[#34c759]" />
              <h3 className="text-[15px] font-semibold text-[#1d1d1f]">OT & เงินเดือน</h3>
            </div>
            <div className="space-y-3">
              <SettingLink
                href="/admin/settings/ot-payroll"
                icon={DollarSign}
                color="text-[#34c759]"
                title="ตั้งค่า OT & เงินเดือน"
                description="อัตรา OT, ชั่วโมงทำงาน, กฎ OT, จำกัดชั่วโมง"
              />
              <SettingLink
                href="/admin/settings/leave-quota"
                icon={Calendar}
                color="text-[#5ac8fa]"
                title="โควต้าวันลาเริ่มต้น"
                description="กำหนดวันลาพักร้อน, ป่วย, กิจสำหรับพนักงานใหม่"
              />
            </div>
          </Card>

          {/* Notifications */}
          <Card elevated>
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-5 h-5 text-[#ff9500]" />
              <h3 className="text-[15px] font-semibold text-[#1d1d1f]">การแจ้งเตือน</h3>
            </div>
            <div className="space-y-3">
              <SettingLink
                href="/admin/settings/notifications"
                icon={Bell}
                color="text-[#ff9500]"
                title="ตั้งค่าการแจ้งเตือน"
                description="แจ้งเตือนเข้า-ออก, OT, Auto-checkout"
              />
            </div>
          </Card>

          {/* LINE Integration */}
          <Card elevated>
            <div className="flex items-center gap-3 mb-4">
              <MessageCircle className="w-5 h-5 text-[#06C755]" />
              <h3 className="text-[15px] font-semibold text-[#1d1d1f]">LINE Integration</h3>
            </div>
            <div className="space-y-3">
              <SettingLink
                href="/admin/settings/line"
                icon={MessageCircle}
                color="text-[#06C755]"
                title="ตั้งค่า LINE"
                description="เชื่อมต่อ LINE API และปรับแต่งข้อความ"
              />
            </div>
          </Card>

          {/* Data Management */}
          <Card elevated>
            <div className="flex items-center gap-3 mb-4">
              <Settings2 className="w-5 h-5 text-[#86868b]" />
              <h3 className="text-[15px] font-semibold text-[#1d1d1f]">จัดการข้อมูล</h3>
            </div>
            <div className="space-y-3">
              <SettingLink
                href="/admin/holidays"
                icon={Calendar}
                color="text-[#ff3b30]"
                title="จัดการวันหยุด"
                description="เพิ่ม/แก้ไข วันหยุดประจำปี"
              />
              <SettingLink
                href="/admin/branches"
                icon={Building2}
                color="text-[#af52de]"
                title="จัดการสาขา"
                description="เพิ่ม/แก้ไข สาขาและตำแหน่ง GPS"
              />
              <SettingLink
                href="/admin/employees?filter=pending"
                icon={UserCheck}
                color="text-[#0071e3]"
                title="จัดการพนักงาน"
                description="ดูรายชื่อพนักงาน, อนุมัติบัญชีใหม่"
              />
            </div>
          </Card>
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
