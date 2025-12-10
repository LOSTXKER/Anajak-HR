"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  ArrowLeft,
  Save,
  DollarSign,
  Clock,
  Calculator,
  Camera,
  Timer,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

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

function OTPayrollSettingsContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState({
    // Payroll
    workHoursPerDay: "8",
    daysPerMonth: "26",
    latePenaltyPerMinute: "0",
    
    // OT Rates
    otRateWorkday: "1.5",
    otRateWeekend: "1.5",
    otRateHoliday: "2.0",
    
    // OT Rules
    otRequireApproval: true,
    otAutoApprove: false,
    otMinHours: "1",
    otMaxHours: "8",
    otEarlyStartBuffer: "15",
    
    // OT Photo
    otRequireBeforePhoto: true,
    otRequireAfterPhoto: true,
    
    // OT Limits
    maxOtPerDay: "4",
    maxOtPerWeek: "20",
    maxOtPerMonth: "60",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value");

      if (error) throw error;

      if (data) {
        const map: Record<string, string> = {};
        data.forEach((item: any) => {
          map[item.setting_key] = item.setting_value;
        });

        setSettings({
          workHoursPerDay: map.work_hours_per_day || "8",
          daysPerMonth: map.days_per_month || "26",
          latePenaltyPerMinute: map.late_penalty_per_minute || "0",
          
          otRateWorkday: map.ot_rate_workday || "1.5",
          otRateWeekend: map.ot_rate_weekend || "1.5",
          otRateHoliday: map.ot_rate_holiday || "2.0",
          
          otRequireApproval: map.ot_require_approval !== "false",
          otAutoApprove: map.ot_auto_approve === "true",
          otMinHours: map.ot_min_hours || "1",
          otMaxHours: map.ot_max_hours || "8",
          otEarlyStartBuffer: map.ot_early_start_buffer || "15",
          
          otRequireBeforePhoto: map.ot_require_before_photo !== "false",
          otRequireAfterPhoto: map.ot_require_after_photo !== "false",
          
          maxOtPerDay: map.max_ot_per_day || "4",
          maxOtPerWeek: map.max_ot_per_week || "20",
          maxOtPerMonth: map.max_ot_per_month || "60",
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
        { key: "work_hours_per_day", value: settings.workHoursPerDay },
        { key: "days_per_month", value: settings.daysPerMonth },
        { key: "late_penalty_per_minute", value: settings.latePenaltyPerMinute },
        
        { key: "ot_rate_workday", value: settings.otRateWorkday },
        { key: "ot_rate_weekend", value: settings.otRateWeekend },
        { key: "ot_rate_holiday", value: settings.otRateHoliday },
        
        { key: "ot_require_approval", value: settings.otRequireApproval.toString() },
        { key: "ot_auto_approve", value: settings.otAutoApprove.toString() },
        { key: "ot_min_hours", value: settings.otMinHours },
        { key: "ot_max_hours", value: settings.otMaxHours },
        { key: "ot_early_start_buffer", value: settings.otEarlyStartBuffer },
        
        { key: "ot_require_before_photo", value: settings.otRequireBeforePhoto.toString() },
        { key: "ot_require_after_photo", value: settings.otRequireAfterPhoto.toString() },
        
        { key: "max_ot_per_day", value: settings.maxOtPerDay },
        { key: "max_ot_per_week", value: settings.maxOtPerWeek },
        { key: "max_ot_per_month", value: settings.maxOtPerMonth },
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

  // Calculate hourly rate preview
  const previewHourlyRate = () => {
    const hours = parseFloat(settings.workHoursPerDay) || 8;
    const days = parseFloat(settings.daysPerMonth) || 26;
    const baseSalary = 15000; // Example salary
    return (baseSalary / days / hours).toFixed(2);
  };

  if (loading) {
    return (
      <AdminLayout title="ตั้งค่า OT & เงินเดือน">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="ตั้งค่า OT & เงินเดือน" description="กำหนดอัตรา OT และการคำนวณเงินเดือน">
      {/* Back Button */}
      <Link href="/admin/settings" className="inline-flex items-center gap-2 text-[#0071e3] hover:underline mb-6">
        <ArrowLeft className="w-4 h-4" />
        กลับไปหน้าตั้งค่า
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Payroll Settings */}
          <Card elevated>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#34c759]/10 rounded-xl flex items-center justify-center">
                <Calculator className="w-5 h-5 text-[#34c759]" />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">การคำนวณเงินเดือน</h3>
                <p className="text-[13px] text-[#86868b]">ใช้คำนวณค่าแรงรายชั่วโมง</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                    ชั่วโมงทำงาน/วัน
                  </label>
                  <input
                    type="number"
                    value={settings.workHoursPerDay}
                    onChange={(e) => setSettings({ ...settings, workHoursPerDay: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                    วันทำงาน/เดือน
                  </label>
                  <input
                    type="number"
                    value={settings.daysPerMonth}
                    onChange={(e) => setSettings({ ...settings, daysPerMonth: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                  หักเงินมาสาย (฿/นาที)
                </label>
                <input
                  type="number"
                  value={settings.latePenaltyPerMinute}
                  onChange={(e) => setSettings({ ...settings, latePenaltyPerMinute: e.target.value })}
                  className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                />
                <p className="text-xs text-[#86868b] mt-1">
                  ตั้ง 0 = ไม่หักเงินมาสาย
                </p>
              </div>

              {/* Preview */}
              <div className="p-4 bg-[#f9f9fb] rounded-xl">
                <p className="text-xs text-[#86868b] mb-1">ตัวอย่าง: เงินเดือน ฿15,000</p>
                <p className="text-lg font-semibold text-[#34c759]">
                  ค่าแรง/ชั่วโมง = ฿{previewHourlyRate()}
                </p>
                <p className="text-xs text-[#86868b] mt-1">
                  สูตร: เงินเดือน ÷ {settings.daysPerMonth} วัน ÷ {settings.workHoursPerDay} ชม.
                </p>
              </div>
            </div>
          </Card>

          {/* OT Rates */}
          <Card elevated>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#0071e3]/10 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#0071e3]" />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">อัตรา OT</h3>
                <p className="text-[13px] text-[#86868b]">ตัวคูณค่าแรงตามประเภทวัน</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                  OT วันทำงานปกติ (เท่า)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step="0.1"
                    value={settings.otRateWorkday}
                    onChange={(e) => setSettings({ ...settings, otRateWorkday: e.target.value })}
                    className="flex-1 px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                  />
                  <span className="text-2xl font-bold text-[#0071e3] min-w-[60px] text-right">{settings.otRateWorkday}x</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                  OT วันหยุดสัปดาห์ (เท่า)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step="0.1"
                    value={settings.otRateWeekend}
                    onChange={(e) => setSettings({ ...settings, otRateWeekend: e.target.value })}
                    className="flex-1 px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                  />
                  <span className="text-2xl font-bold text-[#ff9500] min-w-[60px] text-right">{settings.otRateWeekend}x</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                  OT วันหยุดนักขัตฤกษ์ (เท่า)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step="0.1"
                    value={settings.otRateHoliday}
                    onChange={(e) => setSettings({ ...settings, otRateHoliday: e.target.value })}
                    className="flex-1 px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                  />
                  <span className="text-2xl font-bold text-[#ff3b30] min-w-[60px] text-right">{settings.otRateHoliday}x</span>
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 bg-[#f9f9fb] rounded-xl">
                <p className="text-xs text-[#86868b] mb-2">ตัวอย่าง: ค่าแรง ฿{previewHourlyRate()}/ชม.</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-[#0071e3]">
                      ฿{(parseFloat(previewHourlyRate()) * parseFloat(settings.otRateWorkday)).toFixed(0)}
                    </p>
                    <p className="text-xs text-[#86868b]">วันปกติ</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-[#ff9500]">
                      ฿{(parseFloat(previewHourlyRate()) * parseFloat(settings.otRateWeekend)).toFixed(0)}
                    </p>
                    <p className="text-xs text-[#86868b]">วันหยุด</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-[#ff3b30]">
                      ฿{(parseFloat(previewHourlyRate()) * parseFloat(settings.otRateHoliday)).toFixed(0)}
                    </p>
                    <p className="text-xs text-[#86868b]">นักขัตฤกษ์</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* OT Rules */}
          <Card elevated>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#ff9500]" />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">กฎ OT</h3>
                <p className="text-[13px] text-[#86868b]">การอนุมัติและข้อจำกัด</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
                <div>
                  <span className="text-[14px] text-[#1d1d1f] block">ต้องอนุมัติก่อนทำ OT</span>
                  <span className="text-[12px] text-[#86868b]">พนักงานต้องขออนุมัติก่อน</span>
                </div>
                <ToggleSwitch 
                  enabled={settings.otRequireApproval} 
                  onChange={() => setSettings({ ...settings, otRequireApproval: !settings.otRequireApproval })}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
                <div>
                  <span className="text-[14px] text-[#1d1d1f] block">อนุมัติอัตโนมัติ</span>
                  <span className="text-[12px] text-[#86868b]">OT อนุมัติทันทีที่ส่งคำขอ</span>
                </div>
                <ToggleSwitch 
                  enabled={settings.otAutoApprove} 
                  onChange={() => setSettings({ ...settings, otAutoApprove: !settings.otAutoApprove })}
                  disabled={!settings.otRequireApproval}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                    ขั้นต่ำ OT (ชม.)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={settings.otMinHours}
                    onChange={(e) => setSettings({ ...settings, otMinHours: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                    สูงสุด OT/ครั้ง (ชม.)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={settings.otMaxHours}
                    onChange={(e) => setSettings({ ...settings, otMaxHours: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                  เริ่ม OT ก่อนเวลาได้ (นาที)
                </label>
                <input
                  type="number"
                  value={settings.otEarlyStartBuffer}
                  onChange={(e) => setSettings({ ...settings, otEarlyStartBuffer: e.target.value })}
                  className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                />
                <p className="text-xs text-[#86868b] mt-1">
                  เช่น OT 18:00 แต่กดเริ่มได้ตั้งแต่ 17:45
                </p>
              </div>
            </div>
          </Card>

          {/* OT Photo */}
          <Card elevated>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#af52de]/10 rounded-xl flex items-center justify-center">
                <Camera className="w-5 h-5 text-[#af52de]" />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">ถ่ายรูป OT</h3>
                <p className="text-[13px] text-[#86868b]">หลักฐานการทำ OT</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
                <span className="text-[14px] text-[#1d1d1f]">ถ่ายรูปตอนเริ่ม OT</span>
                <ToggleSwitch 
                  enabled={settings.otRequireBeforePhoto} 
                  onChange={() => setSettings({ ...settings, otRequireBeforePhoto: !settings.otRequireBeforePhoto })}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
                <span className="text-[14px] text-[#1d1d1f]">ถ่ายรูปตอนจบ OT</span>
                <ToggleSwitch 
                  enabled={settings.otRequireAfterPhoto} 
                  onChange={() => setSettings({ ...settings, otRequireAfterPhoto: !settings.otRequireAfterPhoto })}
                />
              </div>
            </div>
          </Card>

          {/* OT Limits */}
          <Card elevated>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#ff3b30]/10 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#ff3b30]" />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">จำกัดชั่วโมง OT</h3>
                <p className="text-[13px] text-[#86868b]">ป้องกันการทำ OT มากเกินไป</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                  ต่อวัน (ชม.)
                </label>
                <input
                  type="number"
                  value={settings.maxOtPerDay}
                  onChange={(e) => setSettings({ ...settings, maxOtPerDay: e.target.value })}
                  className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                  ต่อสัปดาห์ (ชม.)
                </label>
                <input
                  type="number"
                  value={settings.maxOtPerWeek}
                  onChange={(e) => setSettings({ ...settings, maxOtPerWeek: e.target.value })}
                  className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                  ต่อเดือน (ชม.)
                </label>
                <input
                  type="number"
                  value={settings.maxOtPerMonth}
                  onChange={(e) => setSettings({ ...settings, maxOtPerMonth: e.target.value })}
                  className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                />
              </div>
            </div>
            <p className="text-xs text-[#86868b] mt-3">
              ⚠️ ระบบจะเตือนเมื่อพนักงาน OT ใกล้ถึงขีดจำกัด
            </p>
          </Card>

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            size="lg" 
            loading={saving}
            fullWidth
            icon={!saving ? <Save className="w-5 h-5" /> : undefined}
          >
            {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า OT & เงินเดือน"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}

export default function OTPayrollSettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <OTPayrollSettingsContent />
    </ProtectedRoute>
  );
}

