"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SettingsLayout } from "@/components/admin/SettingsLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useSystemSettings } from "@/lib/hooks/use-system-settings";
import {
  Save,
  DollarSign,
  Clock,
  Calculator,
  Camera,
  AlertTriangle,
} from "lucide-react";
import { Toggle } from "@/components/ui/Toggle";

const OT_PAYROLL_KEYS = [
  "work_hours_per_day",
  "days_per_month",
  "late_penalty_per_minute",
  "ot_rate_workday",
  "ot_rate_weekend",
  "ot_rate_holiday",
  "ot_require_approval",
  "ot_auto_approve",
  "ot_min_hours",
  "ot_max_hours",
  "ot_early_start_buffer",
  "ot_require_before_photo",
  "ot_require_after_photo",
  "max_ot_per_day",
  "max_ot_per_week",
  "max_ot_per_month",
];

interface OTPayrollSettings {
  workHoursPerDay: string;
  daysPerMonth: string;
  latePenaltyPerMinute: string;
  otRateWorkday: string;
  otRateWeekend: string;
  otRateHoliday: string;
  otRequireApproval: boolean;
  otAutoApprove: boolean;
  otMinHours: string;
  otMaxHours: string;
  otEarlyStartBuffer: string;
  otRequireBeforePhoto: boolean;
  otRequireAfterPhoto: boolean;
  maxOtPerDay: string;
  maxOtPerWeek: string;
  maxOtPerMonth: string;
}

const DEFAULTS: OTPayrollSettings = {
  workHoursPerDay: "8",
  daysPerMonth: "26",
  latePenaltyPerMinute: "0",
  otRateWorkday: "1.5",
  otRateWeekend: "1.5",
  otRateHoliday: "2.0",
  otRequireApproval: true,
  otAutoApprove: false,
  otMinHours: "1",
  otMaxHours: "8",
  otEarlyStartBuffer: "15",
  otRequireBeforePhoto: true,
  otRequireAfterPhoto: true,
  maxOtPerDay: "4",
  maxOtPerWeek: "20",
  maxOtPerMonth: "60",
};

function OTPayrollSettingsContent() {
  const toast = useToast();

  const { settings, setSettings, loading, saving, save, reload } =
    useSystemSettings<OTPayrollSettings>({
      keys: OT_PAYROLL_KEYS,
      defaults: DEFAULTS,
      deserialize: (raw) => ({
        workHoursPerDay: raw.work_hours_per_day || DEFAULTS.workHoursPerDay,
        daysPerMonth: raw.days_per_month || DEFAULTS.daysPerMonth,
        latePenaltyPerMinute: raw.late_penalty_per_minute || DEFAULTS.latePenaltyPerMinute,
        otRateWorkday: raw.ot_rate_workday || DEFAULTS.otRateWorkday,
        otRateWeekend: raw.ot_rate_weekend || DEFAULTS.otRateWeekend,
        otRateHoliday: raw.ot_rate_holiday || DEFAULTS.otRateHoliday,
        otRequireApproval: raw.ot_require_approval !== "false",
        otAutoApprove: raw.ot_auto_approve === "true",
        otMinHours: raw.ot_min_hours || DEFAULTS.otMinHours,
        otMaxHours: raw.ot_max_hours || DEFAULTS.otMaxHours,
        otEarlyStartBuffer: raw.ot_early_start_buffer || DEFAULTS.otEarlyStartBuffer,
        otRequireBeforePhoto: raw.ot_require_before_photo !== "false",
        otRequireAfterPhoto: raw.ot_require_after_photo !== "false",
        maxOtPerDay: raw.max_ot_per_day || DEFAULTS.maxOtPerDay,
        maxOtPerWeek: raw.max_ot_per_week || DEFAULTS.maxOtPerWeek,
        maxOtPerMonth: raw.max_ot_per_month || DEFAULTS.maxOtPerMonth,
      }),
      serialize: (s) => ({
        work_hours_per_day: s.workHoursPerDay,
        days_per_month: s.daysPerMonth,
        late_penalty_per_minute: s.latePenaltyPerMinute,
        ot_rate_workday: s.otRateWorkday,
        ot_rate_weekend: s.otRateWeekend,
        ot_rate_holiday: s.otRateHoliday,
        ot_require_approval: s.otRequireApproval.toString(),
        ot_auto_approve: s.otAutoApprove.toString(),
        ot_min_hours: s.otMinHours,
        ot_max_hours: s.otMaxHours,
        ot_early_start_buffer: s.otEarlyStartBuffer,
        ot_require_before_photo: s.otRequireBeforePhoto.toString(),
        ot_require_after_photo: s.otRequireAfterPhoto.toString(),
        max_ot_per_day: s.maxOtPerDay,
        max_ot_per_week: s.maxOtPerWeek,
        max_ot_per_month: s.maxOtPerMonth,
      }),
    });

  const handleSave = async () => {
    const ok = await save();
    if (ok) {
      toast.success("บันทึกสำเร็จ", "บันทึกการตั้งค่าเรียบร้อยแล้ว");
    } else {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกการตั้งค่าได้");
    }
  };

  const set = <K extends keyof OTPayrollSettings>(key: K, value: OTPayrollSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const previewHourlyRate = () => {
    const hours = parseFloat(settings.workHoursPerDay) || 8;
    const days = parseFloat(settings.daysPerMonth) || 26;
    return (15000 / days / hours).toFixed(2);
  };

  if (loading) {
    return (
      <SettingsLayout title="OT & เงินเดือน">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout title="OT & เงินเดือน" description="กำหนดอัตรา OT และการคำนวณเงินเดือน">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-2">ชั่วโมงทำงาน/วัน</label>
                  <input
                    type="number"
                    value={settings.workHoursPerDay}
                    onChange={(e) => set("workHoursPerDay", e.target.value)}
                    className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-2">วันทำงาน/เดือน</label>
                  <input
                    type="number"
                    value={settings.daysPerMonth}
                    onChange={(e) => set("daysPerMonth", e.target.value)}
                    className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">หักเงินมาสาย (฿/นาที)</label>
                <input
                  type="number"
                  value={settings.latePenaltyPerMinute}
                  onChange={(e) => set("latePenaltyPerMinute", e.target.value)}
                  className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                />
                <p className="text-xs text-[#86868b] mt-1">ตั้ง 0 = ไม่หักเงินมาสาย</p>
              </div>

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
              {[
                { label: "OT วันทำงานปกติ (เท่า)", key: "otRateWorkday" as const, color: "#0071e3" },
                { label: "OT วันหยุดสัปดาห์ (เท่า)", key: "otRateWeekend" as const, color: "#ff9500" },
                { label: "OT วันหยุดนักขัตฤกษ์ (เท่า)", key: "otRateHoliday" as const, color: "#ff3b30" },
              ].map(({ label, key, color }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-2">{label}</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      step="0.1"
                      value={settings[key]}
                      onChange={(e) => set(key, e.target.value)}
                      className="flex-1 px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                    />
                    <span className="text-2xl font-bold min-w-[60px] text-right" style={{ color }}>
                      {settings[key]}x
                    </span>
                  </div>
                </div>
              ))}

              <div className="p-4 bg-[#f9f9fb] rounded-xl">
                <p className="text-xs text-[#86868b] mb-2">ตัวอย่าง: ค่าแรง ฿{previewHourlyRate()}/ชม.</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "วันปกติ", key: "otRateWorkday" as const, color: "#0071e3" },
                    { label: "วันหยุด", key: "otRateWeekend" as const, color: "#ff9500" },
                    { label: "นักขัตฤกษ์", key: "otRateHoliday" as const, color: "#ff3b30" },
                  ].map(({ label, key, color }) => (
                    <div key={key} className="text-center">
                      <p className="text-lg font-semibold" style={{ color }}>
                        ฿{(parseFloat(previewHourlyRate()) * parseFloat(settings[key])).toFixed(0)}
                      </p>
                      <p className="text-xs text-[#86868b]">{label}</p>
                    </div>
                  ))}
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
                <Toggle
                  checked={settings.otRequireApproval}
                  color="green"
                  size="lg"
                  onChange={() => set("otRequireApproval", !settings.otRequireApproval)}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
                <div>
                  <span className="text-[14px] text-[#1d1d1f] block">อนุมัติอัตโนมัติ</span>
                  <span className="text-[12px] text-[#86868b]">OT อนุมัติทันทีที่ส่งคำขอ</span>
                </div>
                <Toggle
                  checked={settings.otAutoApprove}
                  color="green"
                  size="lg"
                  disabled={!settings.otRequireApproval}
                  onChange={() => set("otAutoApprove", !settings.otAutoApprove)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-2">ขั้นต่ำ OT (ชม.)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={settings.otMinHours}
                    onChange={(e) => set("otMinHours", e.target.value)}
                    className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-2">สูงสุด OT/ครั้ง (ชม.)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={settings.otMaxHours}
                    onChange={(e) => set("otMaxHours", e.target.value)}
                    className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">เริ่ม OT ก่อนเวลาได้ (นาที)</label>
                <input
                  type="number"
                  value={settings.otEarlyStartBuffer}
                  onChange={(e) => set("otEarlyStartBuffer", e.target.value)}
                  className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                />
                <p className="text-xs text-[#86868b] mt-1">เช่น OT 18:00 แต่กดเริ่มได้ตั้งแต่ 17:45</p>
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
                <Toggle
                  checked={settings.otRequireBeforePhoto}
                  color="green"
                  size="lg"
                  onChange={() => set("otRequireBeforePhoto", !settings.otRequireBeforePhoto)}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
                <span className="text-[14px] text-[#1d1d1f]">ถ่ายรูปตอนจบ OT</span>
                <Toggle
                  checked={settings.otRequireAfterPhoto}
                  color="green"
                  size="lg"
                  onChange={() => set("otRequireAfterPhoto", !settings.otRequireAfterPhoto)}
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
              {[
                { label: "ต่อวัน (ชม.)", key: "maxOtPerDay" as const },
                { label: "ต่อสัปดาห์ (ชม.)", key: "maxOtPerWeek" as const },
                { label: "ต่อเดือน (ชม.)", key: "maxOtPerMonth" as const },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-2">{label}</label>
                  <input
                    type="number"
                    value={settings[key]}
                    onChange={(e) => set(key, e.target.value)}
                    className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-[#86868b] mt-3 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              ระบบจะเตือนเมื่อพนักงาน OT ใกล้ถึงขีดจำกัด
            </p>
          </Card>

          {/* Save / Reset Buttons */}
          <div className="flex gap-3">
            <Button variant="text" onClick={reload} disabled={saving} fullWidth>
              รีเซ็ต
            </Button>
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
      </div>
    </SettingsLayout>
  );
}

export default function OTPayrollSettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <OTPayrollSettingsContent />
    </ProtectedRoute>
  );
}
