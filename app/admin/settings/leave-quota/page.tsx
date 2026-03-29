"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SettingsLayout } from "@/components/admin/SettingsLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useSystemSettings } from "@/lib/hooks/use-system-settings";
import { Calendar, Save, Info, ArrowRight, Users } from "lucide-react";
import Link from "next/link";

const LEAVE_QUOTA_KEYS = [
  "default_annual_leave",
  "default_sick_leave",
  "default_personal_leave",
];

interface LeaveQuotaSettings {
  defaultAnnual: number;
  defaultSick: number;
  defaultPersonal: number;
}

const DEFAULTS: LeaveQuotaSettings = {
  defaultAnnual: 10,
  defaultSick: 30,
  defaultPersonal: 3,
};

function LeaveQuotaSettingsContent() {
  const toast = useToast();

  const { settings, setSettings, loading, saving, save, reload } =
    useSystemSettings<LeaveQuotaSettings>({
      keys: LEAVE_QUOTA_KEYS,
      defaults: DEFAULTS,
      deserialize: (raw) => ({
        defaultAnnual: parseInt(raw.default_annual_leave) || DEFAULTS.defaultAnnual,
        defaultSick: parseInt(raw.default_sick_leave) || DEFAULTS.defaultSick,
        defaultPersonal: parseInt(raw.default_personal_leave) || DEFAULTS.defaultPersonal,
      }),
      serialize: (s) => ({
        default_annual_leave: s.defaultAnnual.toString(),
        default_sick_leave: s.defaultSick.toString(),
        default_personal_leave: s.defaultPersonal.toString(),
      }),
    });

  const handleSave = async () => {
    const ok = await save();
    if (ok) {
      toast.success("บันทึกสำเร็จ", "อัพเดทค่าเริ่มต้นโควต้าวันลาเรียบร้อย");
    } else {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกการตั้งค่าได้");
    }
  };

  if (loading) {
    return (
      <SettingsLayout title="โควต้าวันลา">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout title="โควต้าวันลา" description="กำหนดค่าเริ่มต้นสำหรับพนักงานใหม่">
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
            {[
              { label: "วันลาพักร้อนต่อปี", key: "defaultAnnual" as const, color: "#34c759", hint: "โดยทั่วไปมักกำหนดไว้ที่ 6-10 วันต่อปี" },
              { label: "วันลาป่วยต่อปี", key: "defaultSick" as const, color: "#ff3b30", hint: "โดยทั่วไปมักกำหนดไว้ที่ 30 วันต่อปี" },
              { label: "วันลากิจส่วนตัวต่อปี", key: "defaultPersonal" as const, color: "#ff9500", hint: "โดยทั่วไปมักกำหนดไว้ที่ 3 วันต่อปี" },
            ].map(({ label, key, color, hint }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">{label}</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="0"
                    max="365"
                    value={settings[key]}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))
                    }
                    className="flex-1"
                  />
                  <div className="px-4 py-3 rounded-xl min-w-[80px] text-center" style={{ backgroundColor: `${color}1a` }}>
                    <p className="text-2xl font-bold" style={{ color }}>{settings[key]}</p>
                    <p className="text-xs text-[#86868b]">วัน</p>
                  </div>
                </div>
                <p className="text-xs text-[#86868b] mt-2 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  {hint}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-[#e8e8ed] flex gap-3">
            <Button variant="text" onClick={reload} disabled={saving}>
              รีเซ็ต
            </Button>
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
    </SettingsLayout>
  );
}

export default function LeaveQuotaSettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <LeaveQuotaSettingsContent />
    </ProtectedRoute>
  );
}
