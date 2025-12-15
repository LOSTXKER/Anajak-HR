"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { Calendar, Save, Info, ArrowRight, Users } from "lucide-react";
import Link from "next/link";

function LeaveQuotaSettingsContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    defaultAnnual: 10,
    defaultSick: 30,
    defaultPersonal: 3,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("system_settings")
        .select("*")
        .in("setting_key", ["default_annual_leave", "default_sick_leave", "default_personal_leave"]);

      if (data) {
        const settingsMap: any = {};
        data.forEach((item: any) => {
          settingsMap[item.setting_key] = item.setting_value;
        });

        setSettings({
          defaultAnnual: parseInt(settingsMap.default_annual_leave) || 10,
          defaultSick: parseInt(settingsMap.default_sick_leave) || 30,
          defaultPersonal: parseInt(settingsMap.default_personal_leave) || 3,
        });
      }
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: "default_annual_leave", value: settings.defaultAnnual.toString() },
        { key: "default_sick_leave", value: settings.defaultSick.toString() },
        { key: "default_personal_leave", value: settings.defaultPersonal.toString() },
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

      toast.success("บันทึกสำเร็จ", "อัพเดทค่าเริ่มต้นโควต้าวันลาเรียบร้อย");
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="ตั้งค่าโควต้าวันลา">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="ตั้งค่าโควต้าวันลา" description="กำหนดค่าเริ่มต้นสำหรับพนักงานใหม่">
      {/* Info Banner */}
      <Card elevated className="mb-6 bg-[#0071e3]/5 border border-[#0071e3]/20">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#0071e3] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">
              หน้านี้สำหรับตั้งค่าเริ่มต้นเท่านั้น
            </h3>
            <p className="text-[13px] text-[#86868b] mb-3">
              ค่าเหล่านี้จะใช้กับพนักงานใหม่ที่สมัครเข้ามา หากต้องการแก้ไขโควต้าของพนักงานแต่ละคน
            </p>
            <Link href="/admin/employees">
              <Button variant="primary" size="sm">
                <Users className="w-4 h-4" />
                ไปที่หน้าจัดการพนักงาน
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      <div className="max-w-2xl">
        {/* Default Quota Settings */}
        <Card elevated>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#0071e3]/10 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#0071e3]" />
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">โควต้าเริ่มต้น</h3>
              <p className="text-[13px] text-[#86868b]">สำหรับพนักงานใหม่</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Annual Leave */}
            <div>
              <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                วันลาพักร้อนต่อปี
              </label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min="0"
                  max="365"
                  value={settings.defaultAnnual}
                  onChange={(e) => setSettings({ ...settings, defaultAnnual: parseInt(e.target.value) || 0 })}
                  className="flex-1"
                />
                <div className="px-4 py-3 bg-[#34c759]/10 rounded-xl min-w-[80px] text-center">
                  <p className="text-2xl font-bold text-[#34c759]">{settings.defaultAnnual}</p>
                  <p className="text-xs text-[#86868b]">วัน</p>
                </div>
              </div>
              <p className="text-xs text-[#86868b] mt-2 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                โดยทั่วไปมักกำหนดไว้ที่ 6-10 วันต่อปี
              </p>
            </div>

            {/* Sick Leave */}
            <div>
              <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                วันลาป่วยต่อปี
              </label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min="0"
                  max="365"
                  value={settings.defaultSick}
                  onChange={(e) => setSettings({ ...settings, defaultSick: parseInt(e.target.value) || 0 })}
                  className="flex-1"
                />
                <div className="px-4 py-3 bg-[#ff3b30]/10 rounded-xl min-w-[80px] text-center">
                  <p className="text-2xl font-bold text-[#ff3b30]">{settings.defaultSick}</p>
                  <p className="text-xs text-[#86868b]">วัน</p>
                </div>
              </div>
              <p className="text-xs text-[#86868b] mt-2 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                โดยทั่วไปมักกำหนดไว้ที่ 30 วันต่อปี
              </p>
            </div>

            {/* Personal Leave */}
            <div>
              <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                วันลากิจส่วนตัวต่อปี
              </label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min="0"
                  max="365"
                  value={settings.defaultPersonal}
                  onChange={(e) => setSettings({ ...settings, defaultPersonal: parseInt(e.target.value) || 0 })}
                  className="flex-1"
                />
                <div className="px-4 py-3 bg-[#ff9500]/10 rounded-xl min-w-[80px] text-center">
                  <p className="text-2xl font-bold text-[#ff9500]">{settings.defaultPersonal}</p>
                  <p className="text-xs text-[#86868b]">วัน</p>
                </div>
              </div>
              <p className="text-xs text-[#86868b] mt-2 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                โดยทั่วไปมักกำหนดไว้ที่ 3 วันต่อปี
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-[#e8e8ed]">
            <Button 
              onClick={handleSave} 
              size="lg" 
              loading={saving}
              fullWidth
              icon={!saving ? <Save className="w-5 h-5" /> : undefined}
            >
              {saving ? "กำลังบันทึก..." : "บันทึกค่าเริ่มต้น"}
            </Button>
          </div>
        </Card>

        {/* Summary Card */}
        <Card elevated className="mt-6 bg-[#f9f9fb]">
          <h4 className="text-sm font-semibold text-[#1d1d1f] mb-3">📌 สรุป</h4>
          <div className="space-y-2 text-[13px] text-[#86868b]">
            <p>• พนักงานใหม่จะได้รับ <strong className="text-[#34c759]">{settings.defaultAnnual} วันพักร้อน</strong></p>
            <p>• พนักงานใหม่จะได้รับ <strong className="text-[#ff3b30]">{settings.defaultSick} วันลาป่วย</strong></p>
            <p>• พนักงานใหม่จะได้รับ <strong className="text-[#ff9500]">{settings.defaultPersonal} วันลากิจ</strong></p>
            <p className="pt-2 border-t border-[#e8e8ed] mt-3 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              หากต้องการแก้ไขโควต้าของพนักงานปัจจุบัน ให้ไปที่หน้า{" "}
              <Link href="/admin/employees" className="text-[#0071e3] hover:underline">
                จัดการพนักงาน
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}

export default function LeaveQuotaSettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <LeaveQuotaSettingsContent />
    </ProtectedRoute>
  );
}
