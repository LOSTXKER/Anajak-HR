"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { MessageCircle, Save, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";

function LineSettingsContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  
  const [settings, setSettings] = useState({
    lineChannelToken: "",
    lineRecipientId: "",
    lineRecipientType: "group",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("system_settings").select("*");

      if (data) {
        const settingsMap: any = {};
        data.forEach((item: any) => {
          settingsMap[item.setting_key] = item.setting_value;
        });

        setSettings({
          lineChannelToken: settingsMap.line_channel_access_token || "",
          lineRecipientId: settingsMap.line_recipient_id || "",
          lineRecipientType: settingsMap.line_recipient_type || "group",
        });
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดการตั้งค่าได้");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: "line_channel_access_token", value: settings.lineChannelToken },
        { key: "line_recipient_id", value: settings.lineRecipientId },
        { key: "line_recipient_type", value: settings.lineRecipientType },
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

      toast.success("บันทึกสำเร็จ", "บันทึกการตั้งค่า LINE เรียบร้อยแล้ว");
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกการตั้งค่าได้");
    } finally {
      setSaving(false);
    }
  };

  const handleTestLine = async () => {
    if (!settings.lineChannelToken || !settings.lineRecipientId) {
      toast.error("กรุณากรอกข้อมูล LINE", "ต้องกรอก Channel Token และ Recipient ID");
      return;
    }

    setTesting(true);
    try {
      const response = await fetch("/api/line/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: settings.lineChannelToken,
          to: settings.lineRecipientId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("ส่งข้อความสำเร็จ", "ตรวจสอบใน LINE ของคุณ");
      } else {
        toast.error("ส่งข้อความไม่สำเร็จ", result.error || "กรุณาตรวจสอบ Token และ ID");
      }
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error.message);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="ตั้งค่า LINE API">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#06C755] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="ตั้งค่า LINE API" 
      description="เชื่อมต่อ LINE Messaging API สำหรับส่งการแจ้งเตือน"
    >
      <div className="mb-6">
        <Link href="/admin/settings">
          <Button variant="secondary" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
            กลับไปหน้าตั้งค่า
          </Button>
        </Link>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card elevated>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#06C755]/10 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-[#06C755]" />
            </div>
            <div>
              <h3 className="text-[19px] font-semibold text-[#1d1d1f]">LINE Messaging API</h3>
              <p className="text-[14px] text-[#86868b]">สำหรับส่งการแจ้งเตือนไปยัง LINE</p>
            </div>
          </div>

          <div className="space-y-5">
            <Input
              label="Channel Access Token"
              type="password"
              value={settings.lineChannelToken}
              onChange={(e) => setSettings({ ...settings, lineChannelToken: e.target.value })}
              placeholder="ใส่ Channel Access Token จาก LINE Developers"
            />

            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                ประเภทผู้รับ
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, lineRecipientType: "user" })}
                  className={`
                    flex-1 px-4 py-3 rounded-xl text-[15px] font-medium transition-all
                    ${settings.lineRecipientType === "user"
                      ? "bg-[#06C755] text-white ring-4 ring-[#06C755]/20"
                      : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]"
                    }
                  `}
                >
                  User ID (1-on-1)
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, lineRecipientType: "group" })}
                  className={`
                    flex-1 px-4 py-3 rounded-xl text-[15px] font-medium transition-all
                    ${settings.lineRecipientType === "group"
                      ? "bg-[#06C755] text-white ring-4 ring-[#06C755]/20"
                      : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]"
                    }
                  `}
                >
                  Group ID (กลุ่ม)
                </button>
              </div>
            </div>

            <Input
              label={settings.lineRecipientType === "user" ? "LINE User ID" : "LINE Group ID"}
              value={settings.lineRecipientId}
              onChange={(e) => setSettings({ ...settings, lineRecipientId: e.target.value })}
              placeholder={settings.lineRecipientType === "user" ? "U1234567890abcdef..." : "C1234567890abcdef..."}
            />

            <div className="bg-[#06C755]/10 rounded-xl p-4">
              <p className="text-[13px] text-[#06C755] leading-relaxed mb-3">
                💡 <strong>วิธีหา User ID / Group ID:</strong>
              </p>
              <ol className="text-[13px] text-[#06C755]/90 space-y-2 ml-4 list-decimal">
                <li>เพิ่มบอทเป็นเพื่อนหรือเชิญเข้ากลุ่ม</li>
                <li>ส่งข้อความหาบอท</li>
                <li>ดู webhook events เพื่อหา ID</li>
              </ol>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={handleTestLine}
                loading={testing}
                icon={!testing ? <CheckCircle className="w-5 h-5" /> : undefined}
              >
                {testing ? "กำลังทดสอบ..." : "ทดสอบส่งข้อความ"}
              </Button>
              <Button
                onClick={handleSave}
                loading={saving}
                icon={!saving ? <Save className="w-5 h-5" /> : undefined}
              >
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}

export default function LineSettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <LineSettingsContent />
    </ProtectedRoute>
  );
}

