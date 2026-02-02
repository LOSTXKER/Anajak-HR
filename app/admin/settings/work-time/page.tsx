"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SettingsLayout } from "@/components/admin/SettingsLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  Clock,
  Save,
  Shield,
  Calendar,
} from "lucide-react";
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
    <div className="flex gap-2 flex-wrap">
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

function WorkTimeSettingsContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
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
        const settingsMap: Record<string, string> = {};
        data.forEach((item: { setting_key: string; setting_value: string }) => {
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
      <SettingsLayout title="เวลาทำงาน">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout title="เวลาทำงาน" description="กำหนดเวลาเข้า-ออกงาน วันทำงาน และความปลอดภัย">
      <div className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Work Time Settings */}
          <Card elevated>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#0071e3]/10 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#0071e3]" />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">เวลาทำงานปกติ</h3>
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

          {/* Working Days */}
          <Card elevated>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#34c759]/10 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#34c759]" />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">วันทำงาน</h3>
                <p className="text-[13px] text-[#86868b]">เลือกวันทำงานในสัปดาห์</p>
              </div>
            </div>

            <div>
              <DaySelector
                selectedDays={settings.workingDays}
                onChange={(days) => setSettings({ ...settings, workingDays: days })}
              />
              <p className="text-xs text-[#86868b] mt-3">
                {settings.workingDays.length} วัน/สัปดาห์ • วันที่ไม่เลือกถือเป็นวันหยุด
              </p>
            </div>
          </Card>

          {/* Checkin Time Window */}
          <Card elevated>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#ff9500]" />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">ช่วงเวลาเช็คอิน/เช็คเอาท์</h3>
                <p className="text-[13px] text-[#86868b]">จำกัดเวลาที่สามารถลงเวลาได้</p>
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
                <p className="text-[13px] text-[#86868b]">การยืนยันตัวตนเมื่อลงเวลา</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
                <span className="text-[14px] text-[#1d1d1f]">บังคับถ่ายรูปเมื่อเช็คอิน</span>
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
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          size="lg" 
          loading={saving}
          fullWidth
          icon={!saving ? <Save className="w-5 h-5" /> : undefined}
        >
          {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
        </Button>
      </div>
    </SettingsLayout>
  );
}

export default function WorkTimeSettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <WorkTimeSettingsContent />
    </ProtectedRoute>
  );
}
