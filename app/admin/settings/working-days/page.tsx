"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { NumberInput } from "@/components/ui/NumberInput";
import { useToast } from "@/components/ui/Toast";
import { ArrowLeft, Calendar, Clock, Save, Info } from "lucide-react";
import Link from "next/link";

const DAYS = [
  { value: 1, label: "จันทร์", short: "จ" },
  { value: 2, label: "อังคาร", short: "อ" },
  { value: 3, label: "พุธ", short: "พ" },
  { value: 4, label: "พฤหัส", short: "พฤ" },
  { value: 5, label: "ศุกร์", short: "ศ" },
  { value: 6, label: "เสาร์", short: "ส" },
  { value: 7, label: "อาทิตย์", short: "อา" },
];

function WorkingDaysSettingsContent() {
  const { employee } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Working days (array of day numbers)
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);

  // OT Rates
  const [otRateWorkday, setOtRateWorkday] = useState(1.5);
  const [otRateWeekend, setOtRateWeekend] = useState(1.5);
  const [otRateHoliday, setOtRateHoliday] = useState(2.0);



  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", [
          "working_days",
          "ot_rate_workday",
          "ot_rate_weekend",
          "ot_rate_holiday",
        ]);

      if (error) throw error;

      const settings: Record<string, string> = {};
      data?.forEach((item: any) => {
        settings[item.setting_key] = item.setting_value;
      });

      if (settings.working_days) {
        setWorkingDays(settings.working_days.split(",").map(Number).filter(Boolean));
      }
      if (settings.ot_rate_workday) setOtRateWorkday(parseFloat(settings.ot_rate_workday));
      if (settings.ot_rate_weekend) setOtRateWeekend(parseFloat(settings.ot_rate_weekend));
      if (settings.ot_rate_holiday) setOtRateHoliday(parseFloat(settings.ot_rate_holiday));
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดการตั้งค่าได้");
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: number) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter((d) => d !== day));
    } else {
      setWorkingDays([...workingDays, day].sort((a, b) => a - b));
    }
  };

  const handleSave = async () => {
    if (workingDays.length === 0) {
      toast.error("ข้อผิดพลาด", "กรุณาเลือกวันทำงานอย่างน้อย 1 วัน");
      return;
    }

    setSaving(true);
    try {
      const updates = [
        { setting_key: "working_days", setting_value: workingDays.join(",") },
        { setting_key: "ot_rate_workday", setting_value: otRateWorkday.toString() },
        { setting_key: "ot_rate_weekend", setting_value: otRateWeekend.toString() },
        { setting_key: "ot_rate_holiday", setting_value: otRateHoliday.toString() },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("system_settings")
          .upsert(update, { onConflict: "setting_key" });

        if (error) throw error;
      }

      toast.success("บันทึกสำเร็จ", "อัปเดตการตั้งค่าเรียบร้อยแล้ว");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกได้");
    } finally {
      setSaving(false);
    }
  };

  // Calculate weekend days
  const weekendDays = DAYS.filter((d) => !workingDays.includes(d.value));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/settings"
            className="p-2 hover:bg-[#f5f5f7] rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#86868b]" />
          </Link>
          <div>
            <h1 className="text-[28px] font-semibold text-[#1d1d1f]">วันทำงานและ OT</h1>
            <p className="text-[15px] text-[#86868b]">ตั้งค่าวันทำงานและอัตรา OT ตามประเภทวัน</p>
          </div>
        </div>
        <Button onClick={handleSave} loading={saving}>
          <Save className="w-4 h-4" />
          บันทึก
        </Button>
      </div>

      {/* Working Days Selection */}
      <Card elevated>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#0071e3]/10 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-[#0071e3]" />
          </div>
          <div>
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">วันทำงาน</h2>
            <p className="text-[13px] text-[#86868b]">เลือกวันที่บริษัทเปิดทำการ</p>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-4">
          {DAYS.map((day) => (
            <button
              key={day.value}
              onClick={() => toggleDay(day.value)}
              className={`
                p-3 rounded-xl border-2 transition-all text-center
                ${workingDays.includes(day.value)
                  ? "border-[#0071e3] bg-[#0071e3] text-white"
                  : "border-[#e8e8ed] bg-white text-[#6e6e73] hover:border-[#0071e3]/50"
                }
              `}
            >
              <span className="text-[14px] font-semibold">{day.short}</span>
              <span className="block text-[11px] mt-0.5 opacity-80">{day.label}</span>
            </button>
          ))}
        </div>

        <div className="bg-[#f5f5f7] rounded-xl p-4">
          <div className="flex items-center gap-2 text-[14px]">
            <Info className="w-4 h-4 text-[#86868b]" />
            <span className="text-[#6e6e73]">
              วันทำงาน: <span className="text-[#1d1d1f] font-medium">
                {workingDays.length > 0
                  ? DAYS.filter((d) => workingDays.includes(d.value)).map((d) => d.label).join(", ")
                  : "ไม่ได้เลือก"}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-[14px] mt-1">
            <Info className="w-4 h-4 text-[#86868b]" />
            <span className="text-[#6e6e73]">
              วันหยุดสุดสัปดาห์: <span className="text-[#ff9500] font-medium">
                {weekendDays.length > 0
                  ? weekendDays.map((d) => d.label).join(", ")
                  : "ไม่มี"}
              </span>
            </span>
          </div>
        </div>
      </Card>

      {/* OT Rates */}
      <Card elevated>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-[#ff9500]" />
          </div>
          <div>
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">อัตรา OT</h2>
            <p className="text-[13px] text-[#86868b]">กำหนดอัตราค่า OT ตามประเภทวัน</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Workday OT */}
          <div className="p-4 bg-[#0071e3]/5 rounded-xl border border-[#0071e3]/20">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-[15px] font-semibold text-[#0071e3]">📋 วันทำงานปกติ</h3>
                <p className="text-[13px] text-[#6e6e73]">OT หลังเวลาเลิกงาน ({DAYS.filter((d) => workingDays.includes(d.value)).map((d) => d.short).join(", ")})</p>
              </div>
              <div className="flex items-center gap-2">
                <NumberInput
                  value={otRateWorkday}
                  onChange={setOtRateWorkday}
                  min={1}
                  max={5}
                  step={0.5}
                  className="w-20"
                />
                <span className="text-[14px] font-semibold text-[#0071e3]">x</span>
              </div>
            </div>
            <p className="text-[12px] text-[#0071e3] mt-2 opacity-70">💡 ต้องเช็คอินก่อนทำ OT เสมอ</p>
          </div>

          {/* Weekend OT */}
          <div className="p-4 bg-[#ff9500]/5 rounded-xl border border-[#ff9500]/20">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-[15px] font-semibold text-[#ff9500]">🌅 วันหยุดสุดสัปดาห์</h3>
                <p className="text-[13px] text-[#6e6e73]">
                  {weekendDays.length > 0
                    ? `ทำงานวัน ${weekendDays.map((d) => d.label).join(", ")}`
                    : "ไม่มีวันหยุดสุดสัปดาห์"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <NumberInput
                  value={otRateWeekend}
                  onChange={setOtRateWeekend}
                  min={1}
                  max={5}
                  step={0.5}
                  className="w-20"
                />
                <span className="text-[14px] font-semibold text-[#ff9500]">x</span>
              </div>
            </div>
            <p className="text-[12px] text-[#ff9500] mt-2 opacity-70">💡 ไม่ต้องเช็คอิน - เริ่ม OT ได้เลย</p>
          </div>

          {/* Holiday OT */}
          <div className="p-4 bg-[#ff3b30]/5 rounded-xl border border-[#ff3b30]/20">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-[15px] font-semibold text-[#ff3b30]">🎉 วันหยุดนักขัตฤกษ์</h3>
                <p className="text-[13px] text-[#6e6e73]">วันหยุดที่ตั้งไว้ในระบบ (เช่น ปีใหม่, สงกรานต์)</p>
              </div>
              <div className="flex items-center gap-2">
                <NumberInput
                  value={otRateHoliday}
                  onChange={setOtRateHoliday}
                  min={1}
                  max={5}
                  step={0.5}
                  className="w-20"
                />
                <span className="text-[14px] font-semibold text-[#ff3b30]">x</span>
              </div>
            </div>
            <p className="text-[12px] text-[#ff3b30] mt-2 opacity-70">💡 ไม่ต้องเช็คอิน - เริ่ม OT ได้เลย</p>
          </div>
        </div>
      </Card>

      {/* Example Calculation */}
      <Card elevated>
        <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-3">💡 ตัวอย่างการคำนวณ OT</h3>
        <div className="bg-[#f5f5f7] rounded-xl p-4 text-[13px] text-[#6e6e73] space-y-2">
          <p>สมมติเงินเดือน 30,000 บาท / 30 วัน / 8 ชม. = <span className="font-semibold text-[#1d1d1f]">125 บาท/ชม.</span></p>
          <div className="border-t border-[#e8e8ed] pt-2 mt-2 space-y-1">
            <p>• OT วันทำงานปกติ 2 ชม. = 125 × 2 × {otRateWorkday} = <span className="font-semibold text-[#0071e3]">{(125 * 2 * otRateWorkday).toFixed(0)} บาท</span></p>
            <p>• OT วันหยุดสุดสัปดาห์ 8 ชม. = 125 × 8 × {otRateWeekend} = <span className="font-semibold text-[#ff9500]">{(125 * 8 * otRateWeekend).toFixed(0)} บาท</span></p>
            <p>• OT วันหยุดนักขัตฤกษ์ 8 ชม. = 125 × 8 × {otRateHoliday} = <span className="font-semibold text-[#ff3b30]">{(125 * 8 * otRateHoliday).toFixed(0)} บาท</span></p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function WorkingDaysSettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminLayout>
        <WorkingDaysSettingsContent />
      </AdminLayout>
    </ProtectedRoute>
  );
}

