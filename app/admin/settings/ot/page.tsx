"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { NumberInput } from "@/components/ui/NumberInput";
import { useToast } from "@/components/ui/Toast";
import { Toggle } from "@/components/ui/Toggle";
import {
  Clock,
  Save,
  Timer,
  Camera,
  AlertTriangle,
  Bell,
  ArrowLeft,
  Info,
} from "lucide-react";
import Link from "next/link";

function OTSettingsContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    // OT Rules
    otRequireApproval: true,
    otAutoApprove: false,
    otMinHours: 1,
    otMaxHours: 8,
    otStartAfterWorkEnd: true,
    otEarlyStartBuffer: 15,
    
    // OT Photo Requirements
    otRequireBeforePhoto: true,
    otRequireAfterPhoto: true,
    
    // OT Notifications
    otNotifyOnRequest: true,
    otNotifyOnApproval: true,
    otNotifyOnStart: true,
    otNotifyOnEnd: true,
    
    // Limits
    maxOtPerDay: 4,
    maxOtPerWeek: 20,
    maxOtPerMonth: 60,
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
        const settingsMap: Record<string, string> = {};
        data.forEach((item: any) => {
          settingsMap[item.setting_key] = item.setting_value;
        });

        setSettings({
          otRequireApproval: settingsMap.ot_require_approval !== "false",
          otAutoApprove: settingsMap.ot_auto_approve === "true",
          otMinHours: parseFloat(settingsMap.ot_min_hours) || 1,
          otMaxHours: parseFloat(settingsMap.ot_max_hours) || 8,
          otStartAfterWorkEnd: settingsMap.ot_start_after_work_end !== "false",
          otEarlyStartBuffer: parseInt(settingsMap.ot_early_start_buffer) || 15,
          
          otRequireBeforePhoto: settingsMap.ot_require_before_photo !== "false",
          otRequireAfterPhoto: settingsMap.ot_require_after_photo !== "false",
          
          otNotifyOnRequest: settingsMap.ot_notify_on_request !== "false",
          otNotifyOnApproval: settingsMap.ot_notify_on_approval !== "false",
          otNotifyOnStart: settingsMap.ot_notify_on_start !== "false",
          otNotifyOnEnd: settingsMap.ot_notify_on_end !== "false",
          
          maxOtPerDay: parseInt(settingsMap.max_ot_per_day) || 4,
          maxOtPerWeek: parseInt(settingsMap.max_ot_per_week) || 20,
          maxOtPerMonth: parseInt(settingsMap.max_ot_per_month) || 60,
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
        { setting_key: "ot_require_approval", setting_value: settings.otRequireApproval.toString() },
        { setting_key: "ot_auto_approve", setting_value: settings.otAutoApprove.toString() },
        { setting_key: "ot_min_hours", setting_value: settings.otMinHours.toString() },
        { setting_key: "ot_max_hours", setting_value: settings.otMaxHours.toString() },
        { setting_key: "ot_start_after_work_end", setting_value: settings.otStartAfterWorkEnd.toString() },
        { setting_key: "ot_early_start_buffer", setting_value: settings.otEarlyStartBuffer.toString() },
        
        { setting_key: "ot_require_before_photo", setting_value: settings.otRequireBeforePhoto.toString() },
        { setting_key: "ot_require_after_photo", setting_value: settings.otRequireAfterPhoto.toString() },
        
        { setting_key: "ot_notify_on_request", setting_value: settings.otNotifyOnRequest.toString() },
        { setting_key: "ot_notify_on_approval", setting_value: settings.otNotifyOnApproval.toString() },
        { setting_key: "ot_notify_on_start", setting_value: settings.otNotifyOnStart.toString() },
        { setting_key: "ot_notify_on_end", setting_value: settings.otNotifyOnEnd.toString() },
        
        { setting_key: "max_ot_per_day", setting_value: settings.maxOtPerDay.toString() },
        { setting_key: "max_ot_per_week", setting_value: settings.maxOtPerWeek.toString() },
        { setting_key: "max_ot_per_month", setting_value: settings.maxOtPerMonth.toString() },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("system_settings")
          .upsert(update, { onConflict: "setting_key" });

        if (error) throw error;
      }

      toast.success("บันทึกสำเร็จ", "บันทึกการตั้งค่า OT เรียบร้อยแล้ว");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกการตั้งค่าได้");
    } finally {
      setSaving(false);
    }
  };

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
            <h1 className="text-[28px] font-semibold text-[#1d1d1f]">กฎและข้อจำกัด OT</h1>
            <p className="text-[15px] text-[#86868b]">กำหนดเงื่อนไขและข้อจำกัดการทำ OT</p>
          </div>
        </div>
        <Button onClick={handleSave} loading={saving}>
          <Save className="w-4 h-4" />
          บันทึก
        </Button>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-[#0071e3]/10 border border-[#0071e3]/20 rounded-xl">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#0071e3] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[14px] text-[#0071e3] font-medium">ตั้งค่า OT Rate ตามประเภทวัน</p>
            <p className="text-[13px] text-[#0071e3]/80 mt-1">
              อัตรา OT สำหรับวันทำงาน/วันหยุดสุดสัปดาห์/วันหยุดนักขัตฤกษ์ ไปตั้งค่าที่หน้า{" "}
              <Link href="/admin/settings/working-days" className="underline font-medium">
                วันทำงานและ OT Rate
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* OT Rules */}
      <Card elevated>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
            <Timer className="w-5 h-5 text-[#ff9500]" />
          </div>
          <div>
            <h3 className="text-[17px] font-semibold text-[#1d1d1f]">กฎการขอ OT</h3>
            <p className="text-[13px] text-[#86868b]">กำหนดเงื่อนไขการทำงานล่วงเวลา</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-xl">
            <div>
              <span className="text-[15px] text-[#1d1d1f] block">ต้องได้รับการอนุมัติก่อน</span>
              <span className="text-[13px] text-[#86868b]">พนักงานต้องได้รับอนุมัติก่อนจึงจะเริ่ม OT ได้</span>
            </div>
            <Toggle
              checked={settings.otRequireApproval}
              onChange={(v) => setSettings({ ...settings, otRequireApproval: v })}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-xl">
            <div>
              <span className="text-[15px] text-[#1d1d1f] block">อนุมัติอัตโนมัติ</span>
              <span className="text-[13px] text-[#86868b]">อนุมัติทุกคำขอ OT โดยอัตโนมัติ</span>
            </div>
            <Toggle
              checked={settings.otAutoApprove}
              onChange={(v) => setSettings({ ...settings, otAutoApprove: v })}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-xl">
            <div>
              <span className="text-[15px] text-[#1d1d1f] block">OT เริ่มหลังเลิกงานเท่านั้น</span>
              <span className="text-[13px] text-[#86868b]">บังคับให้เริ่ม OT หลังเวลาเลิกงานปกติ</span>
            </div>
            <Toggle
              checked={settings.otStartAfterWorkEnd}
              onChange={(v) => setSettings({ ...settings, otStartAfterWorkEnd: v })}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">OT ขั้นต่ำ (ชม.)</label>
              <NumberInput
                value={settings.otMinHours}
                onChange={(v) => setSettings({ ...settings, otMinHours: v })}
                min={0.5}
                max={12}
                step={0.5}
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">OT สูงสุด (ชม.)</label>
              <NumberInput
                value={settings.otMaxHours}
                onChange={(v) => setSettings({ ...settings, otMaxHours: v })}
                min={1}
                max={24}
                step={0.5}
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เริ่มก่อนได้ (นาที)</label>
              <NumberInput
                value={settings.otEarlyStartBuffer}
                onChange={(v) => setSettings({ ...settings, otEarlyStartBuffer: v })}
                min={0}
                max={60}
                step={5}
              />
              <p className="text-[12px] text-[#86868b] mt-1">
                อนุญาตให้เริ่ม OT ก่อนเวลาที่อนุมัติ
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Photo Requirements */}
      <Card elevated>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#af52de]/10 rounded-xl flex items-center justify-center">
            <Camera className="w-5 h-5 text-[#af52de]" />
          </div>
          <div>
            <h3 className="text-[17px] font-semibold text-[#1d1d1f]">ถ่ายรูป OT</h3>
            <p className="text-[13px] text-[#86868b]">บังคับถ่ายรูปก่อน/หลังทำ OT</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-xl">
            <div>
              <span className="text-[15px] text-[#1d1d1f] block">บังคับถ่ายรูปก่อนเริ่ม OT</span>
              <span className="text-[13px] text-[#86868b]">ต้องถ่ายรูปเซลฟี่ก่อนเริ่มทำ OT</span>
            </div>
            <Toggle
              checked={settings.otRequireBeforePhoto}
              onChange={(v) => setSettings({ ...settings, otRequireBeforePhoto: v })}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-xl">
            <div>
              <span className="text-[15px] text-[#1d1d1f] block">บังคับถ่ายรูปหลังจบ OT</span>
              <span className="text-[13px] text-[#86868b]">ต้องถ่ายรูปเซลฟี่หลังจบทำ OT</span>
            </div>
            <Toggle
              checked={settings.otRequireAfterPhoto}
              onChange={(v) => setSettings({ ...settings, otRequireAfterPhoto: v })}
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
            <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">ต่อวัน (ชม.)</label>
            <NumberInput
              value={settings.maxOtPerDay}
              onChange={(v) => setSettings({ ...settings, maxOtPerDay: v })}
              min={1}
              max={24}
            />
          </div>
          <div>
            <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">ต่อสัปดาห์ (ชม.)</label>
            <NumberInput
              value={settings.maxOtPerWeek}
              onChange={(v) => setSettings({ ...settings, maxOtPerWeek: v })}
              min={1}
              max={168}
            />
          </div>
          <div>
            <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">ต่อเดือน (ชม.)</label>
            <NumberInput
              value={settings.maxOtPerMonth}
              onChange={(v) => setSettings({ ...settings, maxOtPerMonth: v })}
              min={1}
              max={744}
            />
          </div>
        </div>

        <p className="text-[13px] text-[#86868b] mt-3">
          ⚠️ ถ้าพนักงานมี OT เกินกำหนด ระบบจะแจ้งเตือนแต่ยังอนุญาตให้ขอได้
        </p>
      </Card>

      {/* OT Notifications */}
      <Card elevated>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#0071e3]/10 rounded-xl flex items-center justify-center">
            <Bell className="w-5 h-5 text-[#0071e3]" />
          </div>
          <div>
            <h3 className="text-[17px] font-semibold text-[#1d1d1f]">แจ้งเตือน OT</h3>
            <p className="text-[13px] text-[#86868b]">แจ้งเตือนผ่าน LINE</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-xl">
            <div>
              <span className="text-[15px] text-[#1d1d1f] block">แจ้งเตือนเมื่อมีคำขอ OT</span>
              <span className="text-[13px] text-[#86868b]">แจ้ง Admin เมื่อพนักงานขอ OT</span>
            </div>
            <Toggle
              checked={settings.otNotifyOnRequest}
              onChange={(v) => setSettings({ ...settings, otNotifyOnRequest: v })}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-xl">
            <div>
              <span className="text-[15px] text-[#1d1d1f] block">แจ้งเตือนเมื่ออนุมัติ/ปฏิเสธ</span>
              <span className="text-[13px] text-[#86868b]">แจ้งเมื่อ OT ได้รับการอนุมัติหรือปฏิเสธ</span>
            </div>
            <Toggle
              checked={settings.otNotifyOnApproval}
              onChange={(v) => setSettings({ ...settings, otNotifyOnApproval: v })}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-xl">
            <div>
              <span className="text-[15px] text-[#1d1d1f] block">แจ้งเตือนเมื่อเริ่ม OT</span>
              <span className="text-[13px] text-[#86868b]">แจ้งเมื่อพนักงานเริ่มทำ OT</span>
            </div>
            <Toggle
              checked={settings.otNotifyOnStart}
              onChange={(v) => setSettings({ ...settings, otNotifyOnStart: v })}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-xl">
            <div>
              <span className="text-[15px] text-[#1d1d1f] block">แจ้งเตือนเมื่อจบ OT</span>
              <span className="text-[13px] text-[#86868b]">แจ้งเมื่อพนักงานจบทำ OT พร้อมสรุปชั่วโมง</span>
            </div>
            <Toggle
              checked={settings.otNotifyOnEnd}
              onChange={(v) => setSettings({ ...settings, otNotifyOnEnd: v })}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function OTSettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminLayout>
        <OTSettingsContent />
      </AdminLayout>
    </ProtectedRoute>
  );
}
