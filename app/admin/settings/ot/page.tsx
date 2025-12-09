"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { TimeInput } from "@/components/ui/TimeInput";
import {
  Clock,
  DollarSign,
  Save,
  Timer,
  Sun,
  CheckCircle,
  XCircle,
  Camera,
  AlertTriangle,
} from "lucide-react";

function OTSettingsContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    // OT Rules
    otRequireApproval: true,
    otAutoApprove: false,
    otMinHours: "1",
    otMaxHours: "8",
    otStartAfterWorkEnd: true,
    otBufferMinutes: "30",
    
    // OT Rates
    otRate1x: "1.0",
    otRate1_5x: "1.5",
    otRate2x: "2.0",
    otRate3x: "3.0",
    
    // OT Photo Requirements
    otRequireBeforePhoto: true,
    otRequireAfterPhoto: true,
    
    // OT Notifications
    otNotifyOnRequest: true,
    otNotifyOnApproval: true,
    otNotifyOnStart: true,
    otNotifyOnEnd: true,
    
    // Holiday OT
    holidayOtRate: "2.0",
    holidayOtRequireCheckin: false,
    
    // Weekend OT
    weekendOtRate: "1.5",
    
    // Limits
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
        .select("*");

      if (error) throw error;

      if (data) {
        const settingsMap: any = {};
        data.forEach((item: any) => {
          settingsMap[item.setting_key] = item.setting_value;
        });

        setSettings({
          otRequireApproval: settingsMap.ot_require_approval !== "false",
          otAutoApprove: settingsMap.ot_auto_approve === "true",
          otMinHours: settingsMap.ot_min_hours || "1",
          otMaxHours: settingsMap.ot_max_hours || "8",
          otStartAfterWorkEnd: settingsMap.ot_start_after_work_end !== "false",
          otBufferMinutes: settingsMap.ot_buffer_minutes || "30",
          
          otRate1x: settingsMap.ot_rate_1x || "1.0",
          otRate1_5x: settingsMap.ot_rate_1_5x || "1.5",
          otRate2x: settingsMap.ot_rate_2x || "2.0",
          otRate3x: settingsMap.ot_rate_3x || "3.0",
          
          otRequireBeforePhoto: settingsMap.ot_require_before_photo !== "false",
          otRequireAfterPhoto: settingsMap.ot_require_after_photo !== "false",
          
          otNotifyOnRequest: settingsMap.ot_notify_on_request !== "false",
          otNotifyOnApproval: settingsMap.ot_notify_on_approval !== "false",
          otNotifyOnStart: settingsMap.ot_notify_on_start !== "false",
          otNotifyOnEnd: settingsMap.ot_notify_on_end !== "false",
          
          holidayOtRate: settingsMap.holiday_ot_rate || "2.0",
          holidayOtRequireCheckin: settingsMap.holiday_ot_require_checkin === "true",
          
          weekendOtRate: settingsMap.weekend_ot_rate || "1.5",
          
          maxOtPerDay: settingsMap.max_ot_per_day || "4",
          maxOtPerWeek: settingsMap.max_ot_per_week || "20",
          maxOtPerMonth: settingsMap.max_ot_per_month || "60",
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
        { key: "ot_require_approval", value: settings.otRequireApproval.toString() },
        { key: "ot_auto_approve", value: settings.otAutoApprove.toString() },
        { key: "ot_min_hours", value: settings.otMinHours },
        { key: "ot_max_hours", value: settings.otMaxHours },
        { key: "ot_start_after_work_end", value: settings.otStartAfterWorkEnd.toString() },
        { key: "ot_buffer_minutes", value: settings.otBufferMinutes },
        
        { key: "ot_rate_1x", value: settings.otRate1x },
        { key: "ot_rate_1_5x", value: settings.otRate1_5x },
        { key: "ot_rate_2x", value: settings.otRate2x },
        { key: "ot_rate_3x", value: settings.otRate3x },
        
        { key: "ot_require_before_photo", value: settings.otRequireBeforePhoto.toString() },
        { key: "ot_require_after_photo", value: settings.otRequireAfterPhoto.toString() },
        
        { key: "ot_notify_on_request", value: settings.otNotifyOnRequest.toString() },
        { key: "ot_notify_on_approval", value: settings.otNotifyOnApproval.toString() },
        { key: "ot_notify_on_start", value: settings.otNotifyOnStart.toString() },
        { key: "ot_notify_on_end", value: settings.otNotifyOnEnd.toString() },
        
        { key: "holiday_ot_rate", value: settings.holidayOtRate },
        { key: "holiday_ot_require_checkin", value: settings.holidayOtRequireCheckin.toString() },
        
        { key: "weekend_ot_rate", value: settings.weekendOtRate },
        
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

      toast.success("บันทึกสำเร็จ", "บันทึกการตั้งค่า OT เรียบร้อยแล้ว");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกการตั้งค่าได้");
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ checked, onChange, label, description }: any) => (
    <label className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-xl cursor-pointer hover:bg-[#e8e8ed] transition-colors">
      <div>
        <span className="text-[15px] text-[#1d1d1f] block">{label}</span>
        {description && <span className="text-[13px] text-[#86868b]">{description}</span>}
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ml-4 ${
          checked ? "bg-[#34c759]" : "bg-[#d2d2d7]"
        }`}
      >
        <span
          className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
            checked ? "right-1" : "left-1"
          }`}
        />
      </button>
    </label>
  );

  if (loading) {
    return (
      <AdminLayout title="ตั้งค่า OT">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="ตั้งค่า OT" description="จัดการการตั้งค่าการทำงานล่วงเวลา">
      <div className="max-w-2xl space-y-6">
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
            <Toggle
              checked={settings.otRequireApproval}
              onChange={() => setSettings({ ...settings, otRequireApproval: !settings.otRequireApproval })}
              label="ต้องได้รับการอนุมัติก่อน"
              description="พนักงานต้องได้รับอนุมัติก่อนจึงจะเริ่ม OT ได้"
            />

            <Toggle
              checked={settings.otAutoApprove}
              onChange={() => setSettings({ ...settings, otAutoApprove: !settings.otAutoApprove })}
              label="อนุมัติอัตโนมัติ"
              description="อนุมัติทุกคำขอ OT โดยอัตโนมัติ"
            />

            <Toggle
              checked={settings.otStartAfterWorkEnd}
              onChange={() => setSettings({ ...settings, otStartAfterWorkEnd: !settings.otStartAfterWorkEnd })}
              label="OT เริ่มหลังเลิกงานเท่านั้น"
              description="บังคับให้เริ่ม OT หลังเวลาเลิกงานปกติ"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">OT ขั้นต่ำ (ชม.)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={settings.otMinHours}
                  onChange={(e) => setSettings({ ...settings, otMinHours: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">OT สูงสุด (ชม.)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={settings.otMaxHours}
                  onChange={(e) => setSettings({ ...settings, otMaxHours: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                Buffer เวลา (นาที)
              </label>
              <Input
                type="number"
                value={settings.otBufferMinutes}
                onChange={(e) => setSettings({ ...settings, otBufferMinutes: e.target.value })}
              />
              <p className="text-[13px] text-[#86868b] mt-1">
                เวลาที่อนุญาตให้เริ่ม OT ก่อน/หลังเวลาที่ขอไว้
              </p>
            </div>
          </div>
        </Card>

        {/* OT Rates */}
        <Card elevated>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#34c759]/10 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#34c759]" />
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">อัตราค่า OT</h3>
              <p className="text-[13px] text-[#86868b]">ตัวคูณสำหรับคำนวณค่าล่วงเวลา</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">OT ปกติ (x)</label>
              <Input
                type="number"
                step="0.1"
                value={settings.otRate1x}
                onChange={(e) => setSettings({ ...settings, otRate1x: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">OT 1.5x</label>
              <Input
                type="number"
                step="0.1"
                value={settings.otRate1_5x}
                onChange={(e) => setSettings({ ...settings, otRate1_5x: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">OT วันหยุด (x)</label>
              <Input
                type="number"
                step="0.1"
                value={settings.holidayOtRate}
                onChange={(e) => setSettings({ ...settings, holidayOtRate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">OT วันหยุดสุดสัปดาห์ (x)</label>
              <Input
                type="number"
                step="0.1"
                value={settings.weekendOtRate}
                onChange={(e) => setSettings({ ...settings, weekendOtRate: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-4 p-4 bg-[#34c759]/10 rounded-xl">
            <p className="text-[13px] text-[#34c759]">
              💡 <strong>ตัวอย่าง:</strong> ถ้าเงินเดือน 30,000 บาท/เดือน, ค่าแรงต่อชม. = 30,000 ÷ 30 ÷ 8 = 125 บาท/ชม.
              <br />OT 1.5x = 125 × 1.5 = 187.5 บาท/ชม.
            </p>
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
            <Toggle
              checked={settings.otRequireBeforePhoto}
              onChange={() => setSettings({ ...settings, otRequireBeforePhoto: !settings.otRequireBeforePhoto })}
              label="บังคับถ่ายรูปก่อนเริ่ม OT"
              description="ต้องถ่ายรูปเซลฟี่ก่อนเริ่มทำ OT"
            />

            <Toggle
              checked={settings.otRequireAfterPhoto}
              onChange={() => setSettings({ ...settings, otRequireAfterPhoto: !settings.otRequireAfterPhoto })}
              label="บังคับถ่ายรูปหลังจบ OT"
              description="ต้องถ่ายรูปเซลฟี่หลังจบทำ OT"
            />
          </div>
        </Card>

        {/* Holiday OT */}
        <Card elevated>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#ff3b30]/10 rounded-xl flex items-center justify-center">
              <Sun className="w-5 h-5 text-[#ff3b30]" />
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">OT วันหยุด</h3>
              <p className="text-[13px] text-[#86868b]">การทำงานล่วงเวลาในวันหยุด</p>
            </div>
          </div>

          <div className="space-y-4">
            <Toggle
              checked={settings.holidayOtRequireCheckin}
              onChange={() => setSettings({ ...settings, holidayOtRequireCheckin: !settings.holidayOtRequireCheckin })}
              label="ต้องเช็คอินก่อนทำ OT วันหยุด"
              description="บังคับให้พนักงานเช็คอินก่อนเริ่ม OT ในวันหยุด"
            />

            <div className="p-4 bg-[#ff3b30]/10 rounded-xl">
              <p className="text-[13px] text-[#ff3b30]">
                ⚠️ <strong>หมายเหตุ:</strong> ถ้าปิดตัวเลือกนี้ ระบบจะสร้างรายการเข้างานให้อัตโนมัติเมื่อพนักงานเริ่ม OT ในวันหยุด
              </p>
            </div>
          </div>
        </Card>

        {/* OT Limits */}
        <Card elevated>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-[#ff9500]" />
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">จำกัดชั่วโมง OT</h3>
              <p className="text-[13px] text-[#86868b]">ป้องกันการทำ OT มากเกินไป</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">ต่อวัน (ชม.)</label>
              <Input
                type="number"
                value={settings.maxOtPerDay}
                onChange={(e) => setSettings({ ...settings, maxOtPerDay: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">ต่อสัปดาห์ (ชม.)</label>
              <Input
                type="number"
                value={settings.maxOtPerWeek}
                onChange={(e) => setSettings({ ...settings, maxOtPerWeek: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">ต่อเดือน (ชม.)</label>
              <Input
                type="number"
                value={settings.maxOtPerMonth}
                onChange={(e) => setSettings({ ...settings, maxOtPerMonth: e.target.value })}
              />
            </div>
          </div>

          <p className="text-[13px] text-[#86868b] mt-3">
            ถ้าพนักงานมี OT เกินกำหนด ระบบจะแจ้งเตือนแต่ยังอนุญาตให้ขอได้
          </p>
        </Card>

        {/* OT Notifications */}
        <Card elevated>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#0071e3]/10 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-[#0071e3]" />
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">แจ้งเตือน OT</h3>
              <p className="text-[13px] text-[#86868b]">แจ้งเตือนผ่าน LINE</p>
            </div>
          </div>

          <div className="space-y-4">
            <Toggle
              checked={settings.otNotifyOnRequest}
              onChange={() => setSettings({ ...settings, otNotifyOnRequest: !settings.otNotifyOnRequest })}
              label="แจ้งเตือนเมื่อมีคำขอ OT"
              description="แจ้ง Admin เมื่อพนักงานขอ OT"
            />

            <Toggle
              checked={settings.otNotifyOnApproval}
              onChange={() => setSettings({ ...settings, otNotifyOnApproval: !settings.otNotifyOnApproval })}
              label="แจ้งเตือนเมื่ออนุมัติ/ปฏิเสธ"
              description="แจ้งเตือนในกลุ่มเมื่อ OT ได้รับการอนุมัติหรือปฏิเสธ"
            />

            <Toggle
              checked={settings.otNotifyOnStart}
              onChange={() => setSettings({ ...settings, otNotifyOnStart: !settings.otNotifyOnStart })}
              label="แจ้งเตือนเมื่อเริ่ม OT"
              description="แจ้งเตือนเมื่อพนักงานเริ่มทำ OT"
            />

            <Toggle
              checked={settings.otNotifyOnEnd}
              onChange={() => setSettings({ ...settings, otNotifyOnEnd: !settings.otNotifyOnEnd })}
              label="แจ้งเตือนเมื่อจบ OT"
              description="แจ้งเตือนเมื่อพนักงานจบทำ OT พร้อมสรุปชั่วโมง"
            />
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} loading={saving} size="lg">
            <Save className="w-5 h-5" />
            บันทึกการตั้งค่า
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}

export default function OTSettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <OTSettingsContent />
    </ProtectedRoute>
  );
}

