"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SettingsLayout } from "@/components/admin/SettingsLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { 
  MessageCircle, 
  Save, 
  ArrowLeft, 
  CheckCircle,
  Key,
  MessageSquare,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  Briefcase,
  Home,
  RotateCcw,
  HelpCircle,
  Send,
} from "lucide-react";
import Link from "next/link";

// Tabs Component
const Tabs = ({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: { id: string; label: string; icon: React.ReactNode }[];
  activeTab: string;
  onTabChange: (id: string) => void;
}) => (
  <div className="flex gap-2 mb-6 border-b border-[#e8e8ed] pb-4">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
          ${activeTab === tab.id
            ? "bg-[#06C755] text-white"
            : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]"
          }
        `}
      >
        {tab.icon}
        {tab.label}
      </button>
    ))}
  </div>
);

// Message Templates Config
const MESSAGE_TEMPLATES = [
  {
    key: "line_msg_checkin",
    label: "เช็คอินเข้างาน",
    description: "ข้อความเมื่อพนักงานเช็คอินสำเร็จ",
    icon: <Clock className="w-5 h-5" />,
    color: "#34c759",
    defaultValue: `✅ เช็คอินเข้างาน\n\n👤 พนักงาน: {employeeName}\n⏰ เวลา: {time}\n📍 สถานที่: {location}\n{lateStatus}`,
    variables: ["employeeName", "time", "location", "lateStatus"],
  },
  {
    key: "line_msg_checkout",
    label: "เช็คเอาท์ออกงาน",
    description: "ข้อความเมื่อพนักงานเช็คเอาท์สำเร็จ",
    icon: <Clock className="w-5 h-5" />,
    color: "#ff3b30",
    defaultValue: `✅ เช็คเอาท์ออกงาน\n\n👤 พนักงาน: {employeeName}\n⏰ เวลา: {time}\n⏱️ ทำงาน: {totalHours} ชั่วโมง`,
    variables: ["employeeName", "time", "totalHours"],
  },
  {
    key: "line_msg_early_checkout",
    label: "เช็คเอาท์ก่อนเวลา",
    description: "แจ้งเตือนเมื่อพนักงานเช็คเอาท์ก่อนเวลา",
    icon: <AlertTriangle className="w-5 h-5" />,
    color: "#ff9500",
    defaultValue: `⚠️ เช็คเอาท์ก่อนเวลา\n\n👤 พนักงาน: {employeeName}\n⏰ เวลา: {time}\n⚠️ กรุณาตรวจสอบ`,
    variables: ["employeeName", "time"],
  },
  {
    key: "line_msg_ot_approved",
    label: "OT อนุมัติ",
    description: "ข้อความเมื่อ OT ได้รับอนุมัติ",
    icon: <CheckCircle className="w-5 h-5" />,
    color: "#34c759",
    defaultValue: `✅ OT อนุมัติแล้ว\n\n👤 พนักงาน: {employeeName}\n📅 วันที่: {date}\n⏰ เวลา: {startTime} - {endTime}`,
    variables: ["employeeName", "date", "startTime", "endTime"],
  },
  {
    key: "line_msg_ot_rejected",
    label: "OT ถูกปฏิเสธ",
    description: "ข้อความเมื่อ OT ถูกปฏิเสธ",
    icon: <XCircle className="w-5 h-5" />,
    color: "#ff3b30",
    defaultValue: `❌ OT ถูกปฏิเสธ\n\n👤 พนักงาน: {employeeName}\n📅 วันที่: {date}\n⏰ เวลา: {startTime} - {endTime}`,
    variables: ["employeeName", "date", "startTime", "endTime"],
  },
  {
    key: "line_msg_leave_approved",
    label: "ลาอนุมัติ",
    description: "ข้อความเมื่อการลาได้รับอนุมัติ",
    icon: <CheckCircle className="w-5 h-5" />,
    color: "#34c759",
    defaultValue: `✅ การลาอนุมัติแล้ว\n\n👤 พนักงาน: {employeeName}\n📅 วันที่: {startDate} - {endDate}\n📝 ประเภท: {leaveType}`,
    variables: ["employeeName", "startDate", "endDate", "leaveType"],
  },
  {
    key: "line_msg_leave_rejected",
    label: "ลาถูกปฏิเสธ",
    description: "ข้อความเมื่อการลาถูกปฏิเสธ",
    icon: <XCircle className="w-5 h-5" />,
    color: "#ff3b30",
    defaultValue: `❌ การลาถูกปฏิเสธ\n\n👤 พนักงาน: {employeeName}\n📅 วันที่: {startDate} - {endDate}`,
    variables: ["employeeName", "startDate", "endDate"],
  },
  {
    key: "line_msg_wfh_approved",
    label: "WFH อนุมัติ",
    description: "ข้อความเมื่อ WFH ได้รับอนุมัติ",
    icon: <Home className="w-5 h-5" />,
    color: "#5ac8fa",
    defaultValue: `🏠 WFH อนุมัติแล้ว\n\n👤 พนักงาน: {employeeName}\n📅 วันที่: {date}`,
    variables: ["employeeName", "date"],
  },
  {
    key: "line_msg_reminder",
    label: "เตือนลืมเช็คเอาท์",
    description: "ข้อความเตือนเมื่อลืมเช็คเอาท์",
    icon: <AlertTriangle className="w-5 h-5" />,
    color: "#ff9500",
    defaultValue: `⏰ เตือน: ลืมเช็คเอาท์\n\n👤 คุณ {employeeName} ยังไม่ได้เช็คเอาท์\nกรุณาเช็คเอาท์ก่อน {autoCheckoutTime}`,
    variables: ["employeeName", "autoCheckoutTime"],
  },
];

function LineSettingsContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState("api");
  
  // API Settings
  const [apiSettings, setApiSettings] = useState({
    lineChannelToken: "",
    lineRecipientId: "",
    lineRecipientType: "group",
  });

  // Message Templates
  const [messages, setMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("system_settings").select("*");

      if (data) {
        const map: Record<string, string> = {};
        data.forEach((item: any) => {
          map[item.setting_key] = item.setting_value;
        });

        setApiSettings({
          lineChannelToken: map.line_channel_access_token || "",
          lineRecipientId: map.line_recipient_id || "",
          lineRecipientType: map.line_recipient_type || "group",
        });

        // Load message templates
        const msgs: Record<string, string> = {};
        MESSAGE_TEMPLATES.forEach((template) => {
          msgs[template.key] = map[template.key] || template.defaultValue;
        });
        setMessages(msgs);
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดการตั้งค่าได้");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAPI = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: "line_channel_access_token", value: apiSettings.lineChannelToken },
        { key: "line_recipient_id", value: apiSettings.lineRecipientId },
        { key: "line_recipient_type", value: apiSettings.lineRecipientType },
      ];

      for (const update of updates) {
        await supabase.from("system_settings").upsert(
          { setting_key: update.key, setting_value: update.value },
          { onConflict: "setting_key" }
        );
      }

      toast.success("บันทึกสำเร็จ", "บันทึกการตั้งค่า LINE API เรียบร้อย");
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกการตั้งค่าได้");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMessages = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(messages)) {
        await supabase.from("system_settings").upsert(
          { setting_key: key, setting_value: value },
          { onConflict: "setting_key" }
        );
      }

      toast.success("บันทึกสำเร็จ", "บันทึกข้อความแจ้งเตือนเรียบร้อย");
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อความได้");
    } finally {
      setSaving(false);
    }
  };

  const handleTestLine = async () => {
    if (!apiSettings.lineChannelToken || !apiSettings.lineRecipientId) {
      toast.error("กรุณากรอกข้อมูล", "ต้องกรอก Channel Token และ Recipient ID");
      return;
    }

    setTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/line/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({
          token: apiSettings.lineChannelToken,
          to: apiSettings.lineRecipientId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("ทดสอบสำเร็จ", "ส่งข้อความทดสอบไปยัง LINE แล้ว");
      } else {
        toast.error("ทดสอบล้มเหลว", result.error || "ไม่สามารถส่งข้อความได้");
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถทดสอบการส่งได้");
    } finally {
      setTesting(false);
    }
  };

  const resetMessage = (key: string) => {
    const template = MESSAGE_TEMPLATES.find((t) => t.key === key);
    if (template) {
      setMessages({ ...messages, [key]: template.defaultValue });
    }
  };

  if (loading) {
    return (
      <SettingsLayout title="LINE Integration">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#06C755] border-t-transparent rounded-full animate-spin" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout title="LINE Integration" description="เชื่อมต่อ LINE API และปรับแต่งข้อความ">
      {/* Tabs */}
      <Tabs
        tabs={[
          { id: "api", label: "LINE API", icon: <Key className="w-4 h-4" /> },
          { id: "messages", label: "ข้อความแจ้งเตือน", icon: <MessageSquare className="w-4 h-4" /> },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* API Settings Tab */}
      {activeTab === "api" && (
        <div className="max-w-2xl space-y-6">
          <Card elevated>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#06C755]/10 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-[#06C755]" />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">LINE Messaging API</h3>
                <p className="text-[13px] text-[#86868b]">เชื่อมต่อสำหรับส่งแจ้งเตือน</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                  Channel Access Token
                </label>
                <textarea
                  value={apiSettings.lineChannelToken}
                  onChange={(e) => setApiSettings({ ...apiSettings, lineChannelToken: e.target.value })}
                  rows={3}
                  placeholder="Enter your LINE Channel Access Token"
                  className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                  Recipient ID (Group/User)
                </label>
                <input
                  type="text"
                  value={apiSettings.lineRecipientId}
                  onChange={(e) => setApiSettings({ ...apiSettings, lineRecipientId: e.target.value })}
                  placeholder="C... หรือ U..."
                  className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                  ประเภท Recipient
                </label>
                <div className="flex gap-3">
                  {["group", "user"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setApiSettings({ ...apiSettings, lineRecipientType: type })}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                        apiSettings.lineRecipientType === type
                          ? "bg-[#06C755] text-white"
                          : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]"
                      }`}
                    >
                      {type === "group" ? "📢 Group" : "👤 User"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="secondary" 
                  onClick={handleTestLine} 
                  loading={testing}
                  className="flex-1"
                >
                  <Send className="w-4 h-4" />
                  ทดสอบส่งข้อความ
                </Button>
                <Button 
                  onClick={handleSaveAPI} 
                  loading={saving}
                  className="flex-1"
                >
                  <Save className="w-4 h-4" />
                  บันทึก
                </Button>
              </div>
            </div>
          </Card>

          {/* Info Card */}
          <Card elevated className="bg-[#f9f9fb]">
            <div className="flex items-center gap-1.5 mb-3">
              <FileText className="w-4 h-4 text-[#0071e3]" />
              <h4 className="text-sm font-semibold text-[#1d1d1f]">วิธีการตั้งค่า</h4>
            </div>
            <ol className="space-y-2 text-[13px] text-[#86868b] list-decimal list-inside">
              <li>ไปที่ <a href="https://developers.line.biz/console" target="_blank" rel="noopener noreferrer" className="text-[#06C755] hover:underline">LINE Developers Console</a></li>
              <li>สร้าง Provider และ Channel (Messaging API)</li>
              <li>คัดลอก Channel Access Token มาใส่</li>
              <li>เชิญ Bot เข้า Group แล้วคัดลอก Group ID</li>
              <li>กด "ทดสอบส่งข้อความ" เพื่อตรวจสอบ</li>
            </ol>
          </Card>
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === "messages" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {MESSAGE_TEMPLATES.map((template) => (
              <Card key={template.key} elevated>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${template.color}20` }}
                    >
                      <div style={{ color: template.color }}>{template.icon}</div>
                    </div>
                    <div>
                      <h4 className="text-[15px] font-medium text-[#1d1d1f]">{template.label}</h4>
                      <p className="text-[12px] text-[#86868b]">{template.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => resetMessage(template.key)}
                    className="p-2 text-[#86868b] hover:text-[#0071e3] hover:bg-[#f5f5f7] rounded-lg transition-colors"
                    title="รีเซ็ตเป็นค่าเริ่มต้น"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                <textarea
                  value={messages[template.key] || ""}
                  onChange={(e) => setMessages({ ...messages, [template.key]: e.target.value })}
                  rows={5}
                  className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[14px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all resize-none"
                />

                <div className="mt-2">
                  <p className="text-[11px] text-[#86868b]">
                    ตัวแปร: {template.variables.map((v) => `{${v}}`).join(", ")}
                  </p>
                </div>
              </Card>
            ))}
          </div>

          <Button 
            onClick={handleSaveMessages} 
            size="lg" 
            loading={saving}
            fullWidth
            icon={!saving ? <Save className="w-5 h-5" /> : undefined}
          >
            {saving ? "กำลังบันทึก..." : "บันทึกข้อความทั้งหมด"}
          </Button>
        </div>
      )}
    </SettingsLayout>
  );
}

export default function LineSettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <LineSettingsContent />
    </ProtectedRoute>
  );
}
