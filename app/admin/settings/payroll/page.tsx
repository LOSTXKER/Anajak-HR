"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
  AlertTriangle,
  Calculator,
  Info,
} from "lucide-react";

function PayrollSettingsContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    work_hours_per_day: "8",
    days_per_month: "26",
    late_penalty_per_minute: "0",
    default_ot_rate_1x: "1.0",
    default_ot_rate_1_5x: "1.5",
    default_ot_rate_2x: "2.0",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .in("setting_key", [
          "work_hours_per_day",
          "days_per_month",
          "late_penalty_per_minute",
          "default_ot_rate_1x",
          "default_ot_rate_1_5x",
          "default_ot_rate_2x",
        ]);

      if (error) throw error;

      if (data) {
        const settingsMap: any = {};
        data.forEach((item: any) => {
          settingsMap[item.setting_key] = item.setting_value;
        });

        setSettings({
          work_hours_per_day: settingsMap.work_hours_per_day || "8",
          days_per_month: settingsMap.days_per_month || "26",
          late_penalty_per_minute: settingsMap.late_penalty_per_minute || "0",
          default_ot_rate_1x: settingsMap.default_ot_rate_1x || "1.0",
          default_ot_rate_1_5x: settingsMap.default_ot_rate_1_5x || "1.5",
          default_ot_rate_2x: settingsMap.default_ot_rate_2x || "2.0",
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
        { key: "work_hours_per_day", value: settings.work_hours_per_day },
        { key: "days_per_month", value: settings.days_per_month },
        { key: "late_penalty_per_minute", value: settings.late_penalty_per_minute },
        { key: "default_ot_rate_1x", value: settings.default_ot_rate_1x },
        { key: "default_ot_rate_1_5x", value: settings.default_ot_rate_1_5x },
        { key: "default_ot_rate_2x", value: settings.default_ot_rate_2x },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("system_settings")
          .upsert(
            {
              setting_key: update.key,
              setting_value: update.value,
            },
            { onConflict: "setting_key" }
          );

        if (error) throw error;
      }

      toast.success("บันทึกสำเร็จ", "บันทึกการตั้งค่าเงินเดือนเรียบร้อยแล้ว");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกการตั้งค่าได้");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="ตั้งค่าเงินเดือน">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="ตั้งค่าเงินเดือน (Payroll)" 
      description="กำหนดอัตราและกติกาสำหรับคำนวณเงินเดือน"
    >
      {/* Back Button */}
      <Link
        href="/admin/settings"
        className="inline-flex items-center gap-2 text-[#0071e3] hover:underline mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-[15px]">กลับ</span>
      </Link>

      <div className="max-w-2xl space-y-6">
        {/* Work Time Settings */}
        <Card elevated>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#0071e3]/10 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#0071e3]" />
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                เวลาทำงาน
              </h3>
              <p className="text-[13px] text-[#86868b]">กำหนดชั่วโมงและวันทำงาน</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                ชั่วโมงทำงาน/วัน
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={settings.work_hours_per_day}
                onChange={(e) =>
                  setSettings({ ...settings, work_hours_per_day: e.target.value })
                }
                className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                วันทำงาน/เดือน
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={settings.days_per_month}
                onChange={(e) =>
                  setSettings({ ...settings, days_per_month: e.target.value })
                }
                className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-[#0071e3]/10 rounded-xl">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-[#0071e3] mt-0.5" />
              <p className="text-[13px] text-[#0071e3]">
                <strong>อัตรารายวัน</strong> = เงินเดือนพื้นฐาน ÷ {settings.days_per_month} วัน
              </p>
            </div>
          </div>
        </Card>

        {/* Late Penalty Settings */}
        <Card elevated>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#ff3b30]/10 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-[#ff3b30]" />
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                การหักเงินมาสาย
              </h3>
              <p className="text-[13px] text-[#86868b]">กำหนดอัตราหักเงินเมื่อมาสาย</p>
            </div>
          </div>

          <div>
            <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
              หักเงินต่อนาที (บาท)
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={settings.late_penalty_per_minute}
              onChange={(e) =>
                setSettings({ ...settings, late_penalty_per_minute: e.target.value })
              }
              className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#ff3b30]/20 transition-all"
            />
            <p className="text-[13px] text-[#86868b] mt-2">
              ตั้ง 0 = ไม่หักเงินเมื่อมาสาย
            </p>
          </div>

          {parseFloat(settings.late_penalty_per_minute) > 0 && (
            <div className="mt-4 p-3 bg-[#ff3b30]/10 rounded-xl">
              <div className="flex items-start gap-2">
                <Calculator className="w-4 h-4 text-[#ff3b30] mt-0.5" />
                <div className="text-[13px] text-[#ff3b30]">
                  <p><strong>ตัวอย่าง:</strong></p>
                  <p>มาสาย 15 นาที = หัก {(parseFloat(settings.late_penalty_per_minute) * 15).toFixed(0)} บาท</p>
                  <p>มาสาย 30 นาที = หัก {(parseFloat(settings.late_penalty_per_minute) * 30).toFixed(0)} บาท</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* OT Rate Settings */}
        <Card elevated>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#ff9500]" />
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                อัตรา OT
              </h3>
              <p className="text-[13px] text-[#86868b]">กำหนดอัตราคูณสำหรับค่า OT</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                OT ปกติ (1x)
              </label>
              <input
                type="number"
                min="1"
                step="0.1"
                value={settings.default_ot_rate_1x}
                onChange={(e) =>
                  setSettings({ ...settings, default_ot_rate_1x: e.target.value })
                }
                className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#ff9500]/20 transition-all"
              />
              <p className="text-[13px] text-[#86868b] mt-1">
                OT ก่อนเวลาเข้างาน (Pre-shift)
              </p>
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                OT ปกติ (1.5x)
              </label>
              <input
                type="number"
                min="1"
                step="0.1"
                value={settings.default_ot_rate_1_5x}
                onChange={(e) =>
                  setSettings({ ...settings, default_ot_rate_1_5x: e.target.value })
                }
                className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#ff9500]/20 transition-all"
              />
              <p className="text-[13px] text-[#86868b] mt-1">
                OT หลังเวลาเลิกงาน (วันทำงานปกติ)
              </p>
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                OT วันหยุด (2x)
              </label>
              <input
                type="number"
                min="1"
                step="0.1"
                value={settings.default_ot_rate_2x}
                onChange={(e) =>
                  setSettings({ ...settings, default_ot_rate_2x: e.target.value })
                }
                className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#ff9500]/20 transition-all"
              />
              <p className="text-[13px] text-[#86868b] mt-1">
                OT ในวันหยุดนักขัตฤกษ์/วันหยุดบริษัท
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-[#ff9500]/10 rounded-xl">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-[#ff9500] mt-0.5" />
              <div className="text-[13px] text-[#ff9500]">
                <p className="font-medium mb-1">สูตรคำนวณ:</p>
                <p>เงิน OT = ชั่วโมง OT × (เงินเดือน ÷ {settings.days_per_month} ÷ {settings.work_hours_per_day}) × อัตรา</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Info Box */}
        <div className="p-4 bg-[#f5f5f7] rounded-xl">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-[#86868b] mt-0.5" />
            <div className="text-[13px] text-[#86868b]">
              <p className="font-medium text-[#1d1d1f] mb-1">หมายเหตุ:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>อัตรา OT เหล่านี้เป็นค่าเริ่มต้น สามารถกำหนดแยกรายพนักงานได้ที่หน้าจัดการพนักงาน</li>
                <li>การเปลี่ยนแปลงจะมีผลกับการคำนวณเงินเดือนครั้งถัดไป</li>
                <li>กรุณาตรวจสอบความถูกต้องก่อนบันทึก</li>
              </ul>
            </div>
          </div>
        </div>

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

export default function PayrollSettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <PayrollSettingsContent />
    </ProtectedRoute>
  );
}

