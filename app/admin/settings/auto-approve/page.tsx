"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SettingsLayout } from "@/components/admin/SettingsLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { 
  Zap, 
  Clock, 
  Calendar, 
  Home, 
  AlertTriangle, 
  MapPin,
  CheckCircle2,
  Info,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface AutoApproveSettings {
  auto_approve_ot: boolean;
  auto_approve_leave: boolean;
  auto_approve_wfh: boolean;
  auto_approve_late: boolean;
  auto_approve_field_work: boolean;
}

const settingsConfig = [
  {
    key: "auto_approve_ot" as keyof AutoApproveSettings,
    icon: Clock,
    label: "OT (Overtime)",
    description: "อนุมัติคำขอทำงานล่วงเวลาอัตโนมัติทันที",
    color: "#ff9500",
  },
  {
    key: "auto_approve_leave" as keyof AutoApproveSettings,
    icon: Calendar,
    label: "ลางาน",
    description: "อนุมัติคำขอลางานอัตโนมัติทันที (ทุกประเภท)",
    color: "#0071e3",
  },
  {
    key: "auto_approve_wfh" as keyof AutoApproveSettings,
    icon: Home,
    label: "WFH (Work From Home)",
    description: "อนุมัติคำขอทำงานที่บ้านอัตโนมัติทันที",
    color: "#af52de",
  },
  {
    key: "auto_approve_field_work" as keyof AutoApproveSettings,
    icon: MapPin,
    label: "งานนอกสถานที่",
    description: "อนุมัติคำขอทำงานนอกสถานที่อัตโนมัติทันที",
    color: "#34c759",
  },
  {
    key: "auto_approve_late" as keyof AutoApproveSettings,
    icon: AlertTriangle,
    label: "ขออนุมัติมาสาย",
    description: "อนุมัติคำขอมาสายอัตโนมัติทันที",
    color: "#ff3b30",
  },
];

function AutoApproveContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AutoApproveSettings>({
    auto_approve_ot: false,
    auto_approve_leave: false,
    auto_approve_wfh: false,
    auto_approve_late: false,
    auto_approve_field_work: false,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", [
          "auto_approve_ot",
          "auto_approve_leave",
          "auto_approve_wfh",
          "auto_approve_late",
          "auto_approve_field_work",
        ]);

      if (data) {
        const settingsMap: any = { ...settings };
        data.forEach((item: any) => {
          settingsMap[item.setting_key] = item.setting_value === "true";
        });
        setSettings(settingsMap);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดการตั้งค่าได้");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof AutoApproveSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: value ? "true" : "false",
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("system_settings")
          .upsert(
            { setting_key: update.setting_key, setting_value: update.setting_value },
            { onConflict: "setting_key" }
          );

        if (error) throw error;
      }

      toast.success("บันทึกสำเร็จ", "การตั้งค่าอนุมัติอัตโนมัติถูกอัปเดตแล้ว");
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message || "ไม่สามารถบันทึกการตั้งค่าได้");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SettingsLayout title="อนุมัติอัตโนมัติ">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout title="อนุมัติอัตโนมัติ" description="เปิด/ปิดการอนุมัติอัตโนมัติสำหรับคำขอต่างๆ">
      {/* Info Card */}
      <Card className="mb-6 !bg-[#0071e3]/5 border-[#0071e3]/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0071e3]/10 flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-[#0071e3]" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-1">
              เกี่ยวกับการอนุมัติอัตโนมัติ
            </h3>
            <p className="text-[14px] text-[#86868b] leading-relaxed">
              เมื่อเปิดใช้งาน คำขอจากพนักงานจะได้รับการอนุมัติทันทีโดยไม่ต้องรอ Admin 
              เหมาะสำหรับองค์กรที่ต้องการลดขั้นตอนและเพิ่มความรวดเร็ว
            </p>
          </div>
        </div>
      </Card>

      {/* Settings List */}
      <div className="space-y-3">
        {settingsConfig.map((config) => {
          const Icon = config.icon;
          const isEnabled = settings[config.key];

          return (
            <Card key={config.key} elevated>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${config.color}15` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: config.color }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-0.5">
                      {config.label}
                    </h3>
                    <p className="text-[13px] text-[#86868b]">
                      {config.description}
                    </p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={() => handleToggle(config.key)}
                  className={`relative w-14 h-8 rounded-full transition-all ${
                    isEnabled ? "bg-[#34c759]" : "bg-[#e8e8ed]"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-all ${
                      isEnabled ? "right-1" : "left-1"
                    }`}
                  />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end gap-3">
        <Button
          variant="text"
          onClick={fetchSettings}
          disabled={saving}
        >
          รีเซ็ต
        </Button>
        <Button
          onClick={handleSave}
          loading={saving}
          icon={<CheckCircle2 className="w-5 h-5" />}
        >
          บันทึกการตั้งค่า
        </Button>
      </div>

      {/* Warning Card */}
      {Object.values(settings).some(v => v) && (
        <Card className="mt-6 !bg-[#ff9500]/5 border-[#ff9500]/20">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-[#ff9500] flex-shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-4 h-4 text-[#ff9500]" />
                <h3 className="text-[14px] font-semibold text-[#1d1d1f]">คำเตือน</h3>
              </div>
              <p className="text-[13px] text-[#86868b] leading-relaxed">
                คำขอที่อนุมัติอัตโนมัติจะไม่สามารถปฏิเสธได้ในภายหลัง 
                Admin สามารถดูประวัติได้ในหน้าการเข้างานและรายงาน
              </p>
            </div>
          </div>
        </Card>
      )}
    </SettingsLayout>
  );
}

export default function AutoApprovePage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AutoApproveContent />
    </ProtectedRoute>
  );
}

