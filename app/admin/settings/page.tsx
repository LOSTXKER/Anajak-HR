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
  Shield,
  Save,
  MessageCircle,
  ChevronRight,
  Bell,
  UserCheck,
  DollarSign,
  Calendar,
  Building2,
  Settings2,
  AlertCircle,
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
    <div className={`flex items-center justify-between p-4 bg-[#f5f5f7] rounded-xl hover:bg-[#e8e8ed] transition-colors cursor-pointer`}>
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

function SettingsContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Basic Settings (shown directly)
  const [settings, setSettings] = useState({
    workStartTime: "09:00",
    workEndTime: "18:00",
    checkinTimeStart: "06:00",
    checkinTimeEnd: "12:00",
    checkoutTimeStart: "15:00",
    checkoutTimeEnd: "22:00",
    lateThreshold: "15",
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
        {/* Left Column - Basic Settings */}
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
            
            <div className="mt-6 p-4 bg-[#ff9500]/10 border border-[#ff9500]/30 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-[#ff9500]" />
                <h4 className="text-[15px] font-semibold text-[#ff9500]">
                  ช่วงเวลาที่อนุญาตให้เช็คอิน/เอาท์
                </h4>
              </div>
              <p className="text-[13px] text-[#86868b] mb-4">
                กำหนดช่วงเวลาที่พนักงานสามารถเช็คอิน/เอาท์ได้ (ป้องกันการทำงานนอกเวลา)
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-3">
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

            <div className="mt-4">
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                เกณฑ์มาสาย (นาที)
              </label>
              <input
                type="number"
                value={settings.lateThreshold}
                onChange={(e) => setSettings({ ...settings, lateThreshold: e.target.value })}
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
                  <span className="text-[14px] text-[#1d1d1f] block">เปิดการแจ้งเตือน</span>
                  <span className="text-[12px] text-[#86868b]">เปิด/ปิดการแจ้งเตือนทั้งหมด</span>
                </div>
                <ToggleSwitch 
                  enabled={settings.enableNotifications} 
                  onChange={() => setSettings({ ...settings, enableNotifications: !settings.enableNotifications })}
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
          {/* Notifications Section */}
          <Card elevated>
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-5 h-5 text-[#0071e3]" />
              <h3 className="text-[15px] font-semibold text-[#1d1d1f]">การแจ้งเตือน</h3>
            </div>
            <div className="space-y-3">
              <SettingLink
                href="/admin/settings/notifications"
                icon={Bell}
                color="text-[#5ac8fa]"
                title="แจ้งเตือนเข้า-ออกงาน"
                description="ตั้งค่าการแจ้งเตือนเมื่อมีการบันทึกเวลา"
              />
              <SettingLink
                href="/admin/settings/auto-checkout"
                icon={Clock}
                color="text-[#ff9500]"
                title="Auto Check-out & เตือนความจำ"
                description="ระบบเช็คเอาท์อัตโนมัติและการแจ้งเตือน"
              />
            </div>
          </Card>

          {/* HR & Payroll Section */}
          <Card elevated>
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="w-5 h-5 text-[#34c759]" />
              <h3 className="text-[15px] font-semibold text-[#1d1d1f]">HR & เงินเดือน</h3>
            </div>
            <div className="space-y-3">
              <SettingLink
                href="/admin/settings/payroll"
                icon={DollarSign}
                color="text-[#34c759]"
                title="ตั้งค่าเงินเดือน (Payroll)"
                description="กำหนดอัตราหัก/เพิ่ม สำหรับคำนวณเงินเดือน"
              />
              <SettingLink
                href="/admin/settings/ot"
                icon={Clock}
                color="text-[#ff9500]"
                title="ตั้งค่า OT"
                description="กำหนดกฎ, อัตราค่าตอบแทน, และข้อจำกัดการทำ OT"
              />
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
            </div>
          </Card>

          {/* LINE Integration Section */}
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
                title="ตั้งค่า LINE API"
                description="เชื่อมต่อ LINE Messaging API"
              />
              <SettingLink
                href="/admin/settings/messages"
                icon={MessageCircle}
                color="text-[#06C755]"
                title="ข้อความแจ้งเตือน"
                description="ปรับแต่งข้อความที่ส่งไปใน LINE"
              />
            </div>
          </Card>

          {/* System Section */}
          <Card elevated>
            <div className="flex items-center gap-3 mb-4">
              <Settings2 className="w-5 h-5 text-[#86868b]" />
              <h3 className="text-[15px] font-semibold text-[#1d1d1f]">ระบบ</h3>
            </div>
            <div className="space-y-3">
              <SettingLink
                href="/admin/approvals"
                icon={UserCheck}
                color="text-[#af52de]"
                title="อนุมัติบัญชีพนักงาน"
                description="อนุมัติพนักงานใหม่ที่รอการอนุมัติ"
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
