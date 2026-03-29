"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SettingsLayout } from "@/components/admin/SettingsLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useSystemSettings } from "@/lib/hooks/use-system-settings";
import {
  Clock,
  Save,
  Shield,
  Calendar,
  Timer,
  Info,
} from "lucide-react";
import { TimeInput } from "@/components/ui/TimeInput";
import { Toggle } from "@/components/ui/Toggle";

const WORK_TIME_KEYS = [
  "work_start_time",
  "work_end_time",
  "checkin_time_start",
  "checkin_time_end",
  "checkout_time_start",
  "checkout_time_end",
  "late_threshold_minutes",
  "working_days",
  "require_photo",
  "require_gps",
  "require_account_approval",
  "auto_checkout_enabled",
  "auto_checkout_time",
  "auto_checkout_skip_if_ot",
];

interface WorkTimeSettings {
  workStartTime: string;
  workEndTime: string;
  checkinTimeStart: string;
  checkinTimeEnd: string;
  checkoutTimeStart: string;
  checkoutTimeEnd: string;
  lateThreshold: string;
  workingDays: number[];
  requirePhoto: boolean;
  requireGPS: boolean;
  requireAccountApproval: boolean;
  autoCheckoutEnabled: boolean;
  autoCheckoutTime: string;
  autoCheckoutSkipIfOt: boolean;
}

const DEFAULTS: WorkTimeSettings = {
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
  autoCheckoutEnabled: true,
  autoCheckoutTime: "22:00",
  autoCheckoutSkipIfOt: true,
};

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

  const { settings, setSettings, loading, saving, save, reload } =
    useSystemSettings<WorkTimeSettings>({
      keys: WORK_TIME_KEYS,
      defaults: DEFAULTS,
      deserialize: (raw) => ({
        workStartTime: raw.work_start_time || DEFAULTS.workStartTime,
        workEndTime: raw.work_end_time || DEFAULTS.workEndTime,
        checkinTimeStart: raw.checkin_time_start || DEFAULTS.checkinTimeStart,
        checkinTimeEnd: raw.checkin_time_end || DEFAULTS.checkinTimeEnd,
        checkoutTimeStart: raw.checkout_time_start || DEFAULTS.checkoutTimeStart,
        checkoutTimeEnd: raw.checkout_time_end || DEFAULTS.checkoutTimeEnd,
        lateThreshold: raw.late_threshold_minutes || DEFAULTS.lateThreshold,
        workingDays: raw.working_days
          ? raw.working_days.split(",").map(Number).filter(Boolean)
          : DEFAULTS.workingDays,
        requirePhoto: raw.require_photo === "true",
        requireGPS: raw.require_gps === "true",
        requireAccountApproval: raw.require_account_approval !== "false",
        autoCheckoutEnabled: raw.auto_checkout_enabled === "true",
        autoCheckoutTime: raw.auto_checkout_time || DEFAULTS.autoCheckoutTime,
        autoCheckoutSkipIfOt: raw.auto_checkout_skip_if_ot !== "false",
      }),
      serialize: (s) => ({
        work_start_time: s.workStartTime,
        work_end_time: s.workEndTime,
        checkin_time_start: s.checkinTimeStart,
        checkin_time_end: s.checkinTimeEnd,
        checkout_time_start: s.checkoutTimeStart,
        checkout_time_end: s.checkoutTimeEnd,
        late_threshold_minutes: s.lateThreshold,
        working_days: s.workingDays.join(","),
        require_photo: s.requirePhoto.toString(),
        require_gps: s.requireGPS.toString(),
        require_account_approval: s.requireAccountApproval.toString(),
        auto_checkout_enabled: s.autoCheckoutEnabled.toString(),
        auto_checkout_time: s.autoCheckoutTime,
        auto_checkout_skip_if_ot: s.autoCheckoutSkipIfOt.toString(),
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

  const set = <K extends keyof WorkTimeSettings>(key: K, value: WorkTimeSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

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
                  onChange={(val) => set("workStartTime", val)}
                />
                <TimeInput
                  label="เวลาเลิกงาน"
                  value={settings.workEndTime}
                  onChange={(val) => set("workEndTime", val)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                  เกณฑ์มาสาย (นาที)
                </label>
                <input
                  type="number"
                  value={settings.lateThreshold}
                  onChange={(e) => set("lateThreshold", e.target.value)}
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
                onChange={(days) => set("workingDays", days)}
              />
              <p className="text-xs text-[#86868b] mt-3">
                {settings.workingDays.length} วัน/สัปดาห์ • วันที่ไม่เลือกถือเป็นวันหยุด
              </p>
            </div>
          </Card>

          {/* Checkin/Checkout Time Window */}
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
                  onChange={(val) => set("checkinTimeStart", val)}
                />
                <TimeInput
                  label="เช็คอินได้ถึง"
                  value={settings.checkinTimeEnd}
                  onChange={(val) => set("checkinTimeEnd", val)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <TimeInput
                  label="เช็คเอาท์ได้ตั้งแต่"
                  value={settings.checkoutTimeStart}
                  onChange={(val) => set("checkoutTimeStart", val)}
                />
                <TimeInput
                  label="เช็คเอาท์ได้ถึง"
                  value={settings.checkoutTimeEnd}
                  onChange={(val) => set("checkoutTimeEnd", val)}
                />
              </div>
            </div>
          </Card>

          {/* Auto Check-out */}
          <Card elevated>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#af52de]/10 rounded-xl flex items-center justify-center">
                <Timer className="w-5 h-5 text-[#af52de]" />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">Auto Check-out</h3>
                <p className="text-[13px] text-[#86868b]">เช็คเอาท์อัตโนมัติสำหรับคนลืม</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
                <div>
                  <span className="text-[14px] text-[#1d1d1f] block">เปิด Auto Check-out</span>
                  <span className="text-[11px] text-[#86868b]">ระบบจะเช็คเอาท์ให้อัตโนมัติ</span>
                </div>
                <Toggle
                  checked={settings.autoCheckoutEnabled}
                  color="green"
                  size="lg"
                  onChange={() => set("autoCheckoutEnabled", !settings.autoCheckoutEnabled)}
                />
              </div>

              {settings.autoCheckoutEnabled && (
                <div className="space-y-4">
                  <div>
                    <TimeInput
                      label="เวลาที่ระบบรัน Auto Check-out"
                      value={settings.autoCheckoutTime}
                      onChange={(val) => set("autoCheckoutTime", val)}
                    />
                    <p className="text-[11px] text-[#86868b] mt-1.5 flex items-start gap-1">
                      <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>
                        ระบบจะรันทุกวันตามเวลานี้ แต่บันทึกเวลาเช็คเอาท์เป็น
                        <strong> เวลาเลิกงาน ({settings.workEndTime} น.)</strong>
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
                    <div>
                      <span className="text-[14px] text-[#1d1d1f] block">ข้ามถ้ากำลังทำ OT</span>
                      <span className="text-[11px] text-[#86868b]">ไม่ auto checkout พนักงานที่มี OT อนุมัติแล้ว</span>
                    </div>
                    <Toggle
                      checked={settings.autoCheckoutSkipIfOt}
                      color="green"
                      size="lg"
                      onChange={() => set("autoCheckoutSkipIfOt", !settings.autoCheckoutSkipIfOt)}
                    />
                  </div>
                </div>
              )}
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
                <Toggle
                  checked={settings.requirePhoto}
                  color="green"
                  size="lg"
                  onChange={() => set("requirePhoto", !settings.requirePhoto)}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
                <span className="text-[14px] text-[#1d1d1f]">บังคับเปิด GPS</span>
                <Toggle
                  checked={settings.requireGPS}
                  color="green"
                  size="lg"
                  onChange={() => set("requireGPS", !settings.requireGPS)}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
                <div>
                  <span className="text-[14px] text-[#1d1d1f] block">บังคับอนุมัติบัญชี</span>
                  <span className="text-[12px] text-[#86868b]">พนักงานใหม่ต้องรอ Admin อนุมัติ</span>
                </div>
                <Toggle
                  checked={settings.requireAccountApproval}
                  color="green"
                  size="lg"
                  onChange={() => set("requireAccountApproval", !settings.requireAccountApproval)}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Save / Reset Buttons */}
        <div className="flex justify-end gap-3">
          <Button variant="text" onClick={reload} disabled={saving}>
            รีเซ็ต
          </Button>
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
