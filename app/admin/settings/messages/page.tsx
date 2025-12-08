"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  MessageCircle,
  Save,
  RotateCcw,
  CheckCircle,
  XCircle,
  Home,
  Calendar,
  FileText,
  RefreshCw,
  Send,
} from "lucide-react";

interface MessageTemplate {
  key: string;
  label: string;
  icon: any;
  color: string;
  variables: string[];
  defaultMessage: string;
}

const templates: MessageTemplate[] = [
  {
    key: "line_msg_ot_approved",
    label: "OT อนุมัติ",
    icon: CheckCircle,
    color: "text-[#34c759]",
    variables: ["{employeeName}", "{date}", "{startTime}", "{endTime}"],
    defaultMessage: `🎉 คำขอ OT ได้รับอนุมัติแล้ว

👤 พนักงาน: {employeeName}
📅 วันที่: {date}
⏰ เวลา: {startTime} - {endTime}
✅ สถานะ: อนุมัติแล้ว

สามารถทำงาน OT ได้ตามเวลาที่ขออนุมัติ`,
  },
  {
    key: "line_msg_ot_rejected",
    label: "OT ปฏิเสธ",
    icon: XCircle,
    color: "text-[#ff3b30]",
    variables: ["{employeeName}", "{date}", "{startTime}", "{endTime}"],
    defaultMessage: `❌ คำขอ OT ถูกปฏิเสธ

👤 พนักงาน: {employeeName}
📅 วันที่: {date}
⏰ เวลา: {startTime} - {endTime}
❌ สถานะ: ปฏิเสธ

กรุณาติดต่อหัวหน้างานเพื่อสอบถามเหตุผล`,
  },
  {
    key: "line_msg_leave_approved",
    label: "ลาอนุมัติ",
    icon: CheckCircle,
    color: "text-[#34c759]",
    variables: ["{employeeName}", "{leaveType}", "{dateRange}"],
    defaultMessage: `🎉 คำขอลาได้รับอนุมัติแล้ว

👤 พนักงาน: {employeeName}
📝 ประเภท: {leaveType}
📅 วันที่: {dateRange}
✅ สถานะ: อนุมัติแล้ว

ขอให้พักผ่อนให้เต็มที่`,
  },
  {
    key: "line_msg_leave_rejected",
    label: "ลาปฏิเสธ",
    icon: XCircle,
    color: "text-[#ff3b30]",
    variables: ["{employeeName}", "{leaveType}", "{dateRange}"],
    defaultMessage: `❌ คำขอลาถูกปฏิเสธ

👤 พนักงาน: {employeeName}
📝 ประเภท: {leaveType}
📅 วันที่: {dateRange}
❌ สถานะ: ปฏิเสธ

กรุณาติดต่อหัวหน้างานเพื่อสอบถามเหตุผล`,
  },
  {
    key: "line_msg_wfh_approved",
    label: "WFH อนุมัติ",
    icon: CheckCircle,
    color: "text-[#34c759]",
    variables: ["{employeeName}", "{date}"],
    defaultMessage: `🏠 คำขอ WFH ได้รับอนุมัติแล้ว

👤 พนักงาน: {employeeName}
📅 วันที่: {date}
✅ สถานะ: อนุมัติแล้ว

อย่าลืมเช็คอิน-เช็คเอาท์ตามปกติ (ไม่ต้องเปิด GPS)`,
  },
  {
    key: "line_msg_wfh_rejected",
    label: "WFH ปฏิเสธ",
    icon: XCircle,
    color: "text-[#ff3b30]",
    variables: ["{employeeName}", "{date}"],
    defaultMessage: `❌ คำขอ WFH ถูกปฏิเสธ

👤 พนักงาน: {employeeName}
📅 วันที่: {date}
❌ สถานะ: ปฏิเสธ

กรุณาติดต่อหัวหน้างานเพื่อสอบถามเหตุผล`,
  },
];

function MessagesContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [originalMessages, setOriginalMessages] = useState<Record<string, string>>({});
  const [testingKey, setTestingKey] = useState<string | null>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const keys = templates.map((t) => t.key);
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", keys);

      if (error) throw error;

      if (data) {
        const messagesMap: Record<string, string> = {};
        data.forEach((item) => {
          messagesMap[item.setting_key] = item.setting_value || "";
        });
        setMessages(messagesMap);
        setOriginalMessages(messagesMap);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อความได้");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(messages)) {
        const { error } = await supabase
          .from("system_settings")
          .upsert(
            {
              setting_key: key,
              setting_value: value,
            },
            { onConflict: "setting_key" }
          );

        if (error) throw error;
      }

      setOriginalMessages(messages);
      toast.success("บันทึกสำเร็จ", "บันทึกการตั้งค่าข้อความเรียบร้อยแล้ว");
    } catch (error) {
      console.error("Error saving messages:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกการตั้งค่าได้");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = (key: string) => {
    setMessages((prev) => ({
      ...prev,
      [key]: originalMessages[key] || "",
    }));
  };

  const handleResetToDefault = (key: string) => {
    const template = templates.find((t) => t.key === key);
    if (template) {
      setMessages((prev) => ({
        ...prev,
        [key]: template.defaultMessage,
      }));
      toast.success("รีเซ็ตสำเร็จ", "ได้ตั้งค่ากลับเป็นข้อความเริ่มต้นแล้ว");
    }
  };

  const handleResetAll = () => {
    setMessages(originalMessages);
    toast.success("กู้คืนสำเร็จ", "กู้คืนข้อความทั้งหมดแล้ว");
  };

  const handleResetAllToDefault = () => {
    const defaultMessages: Record<string, string> = {};
    templates.forEach((template) => {
      defaultMessages[template.key] = template.defaultMessage;
    });
    setMessages(defaultMessages);
    toast.success("รีเซ็ตสำเร็จ", "ได้ตั้งค่าข้อความทั้งหมดกลับเป็นค่าเริ่มต้นแล้ว");
  };

  const handleTestMessage = async (key: string) => {
    setTestingKey(key);
    try {
      // Mock data for testing
      const mockData: Record<string, any> = {
        employeeName: "สมชาย ใจดี",
        date: "15 มกราคม 2568",
        startTime: "18:00",
        endTime: "20:00",
        leaveType: "ลาป่วย",
        dateRange: "15 มกราคม 2568",
      };

      let testMessage = messages[key] || "";
      
      // Replace variables with mock data
      Object.keys(mockData).forEach((varKey) => {
        const regex = new RegExp(`\\{${varKey}\\}`, "g");
        testMessage = testMessage.replace(regex, mockData[varKey]);
      });

      // Add header to indicate it's a test message
      const finalMessage = `🧪 ข้อความทดสอบ
━━━━━━━━━━━━━━━

${testMessage}

━━━━━━━━━━━━━━━
⚠️ นี่คือข้อความทดสอบจากระบบตั้งค่า`;

      // Send test message
      const response = await fetch("/api/line/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: finalMessage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send test message");
      }

      toast.success(
        "✅ ส่งข้อความทดสอบสำเร็จ",
        "กรุณาตรวจสอบ LINE ของคุณ (ใช้ข้อมูล: สมชาย ใจดี, 15 ม.ค. 2568)"
      );
    } catch (error: any) {
      console.error("Error sending test message:", error);
      toast.error(
        "❌ ไม่สามารถส่งข้อความทดสอบได้",
        error.message || "กรุณาตรวจสอบการตั้งค่า LINE API ที่หน้าตั้งค่าหลัก"
      );
    } finally {
      setTestingKey(null);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="ตั้งค่าข้อความ LINE">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="ตั้งค่าข้อความ LINE"
      description="ปรับแต่งข้อความที่ส่งไปใน LINE ตามที่ต้องการ"
    >
      <div className="max-w-4xl space-y-6">
        {/* Info Card */}
        <Card elevated>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#06C755]/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-[#06C755]" />
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-2">
                💡 วิธีใช้งาน
              </h3>
              <div className="text-[13px] text-[#86868b] space-y-1">
                <p>• ใช้ตัวแปร (Variables) เพื่อแสดงข้อมูลแบบไดนามิก</p>
                <p>
                  • เช่น <code className="px-1 py-0.5 bg-[#f5f5f7] rounded">{'{ employeeName }'}</code>{" "}
                  จะถูกแทนที่ด้วยชื่อพนักงาน
                </p>
                <p>• สามารถใช้ Emoji และขึ้นบรรทัดใหม่ได้</p>
                <p>• <span className="text-[#06C755] font-medium">ทดสอบส่ง</span> = ส่งข้อความไปยัง LINE เพื่อดูผลลัพธ์จริง</p>
                <p>• <span className="text-[#0071e3] font-medium">กู้คืน</span> = กลับไปใช้ค่าที่บันทึกไว้ล่าสุด</p>
                <p>• <span className="text-[#ff9500] font-medium">ค่าเริ่มต้น</span> = รีเซ็ตเป็นข้อความพื้นฐาน</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Message Templates */}
        <div className="space-y-4">
          {templates.map((template) => {
            const Icon = template.icon;
            return (
              <Card key={template.key} elevated>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 bg-${template.color}/10 rounded-xl flex items-center justify-center`}
                  >
                    <Icon className={`w-5 h-5 ${template.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[15px] font-semibold text-[#1d1d1f]">
                      {template.label}
                    </h3>
                    <p className="text-[12px] text-[#86868b]">
                      ตัวแปรที่ใช้ได้:{" "}
                      {template.variables.map((v, i) => (
                        <code
                          key={i}
                          className="px-1 py-0.5 bg-[#f5f5f7] rounded mx-0.5"
                        >
                          {v}
                        </code>
                      ))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReset(template.key)}
                      className="px-3 py-2 text-[13px] text-[#0071e3] hover:bg-[#0071e3]/10 rounded-lg transition-colors flex items-center gap-2"
                      title="กู้คืนค่าที่บันทึกไว้ล่าสุด"
                    >
                      <RotateCcw className="w-4 h-4" />
                      กู้คืน
                    </button>
                    <button
                      onClick={() => handleResetToDefault(template.key)}
                      className="px-3 py-2 text-[13px] text-[#ff9500] hover:bg-[#ff9500]/10 rounded-lg transition-colors flex items-center gap-2"
                      title="รีเซ็ตเป็นข้อความเริ่มต้น"
                    >
                      <RefreshCw className="w-4 h-4" />
                      ค่าเริ่มต้น
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    value={messages[template.key] || ""}
                    onChange={(e) =>
                      setMessages((prev) => ({
                        ...prev,
                        [template.key]: e.target.value,
                      }))
                    }
                    rows={6}
                    className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[14px] leading-relaxed focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all resize-none font-mono"
                    placeholder="กรอกข้อความที่ต้องการส่ง..."
                  />
                  <button
                    onClick={() => handleTestMessage(template.key)}
                    disabled={testingKey === template.key || !messages[template.key]}
                    className="absolute top-3 right-3 px-3 py-1.5 text-[12px] font-medium text-white bg-[#06C755] hover:bg-[#06C755]/90 disabled:bg-[#86868b] disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                  >
                    {testingKey === template.key ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        กำลังส่ง...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        ทดสอบส่ง
                      </>
                    )}
                  </button>
                </div>

                {/* Preview */}
                <div className="mt-3 space-y-2">
                  <div className="p-3 bg-[#06C755]/5 rounded-lg border border-[#06C755]/20">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-medium text-[#06C755]">
                        📱 ตัวอย่างข้อความที่จะส่ง
                      </p>
                      <p className="text-[10px] text-[#86868b]">
                        ข้อมูลทดสอบ: สมชาย ใจดี, 15 ม.ค. 2568
                      </p>
                    </div>
                    <pre className="text-[12px] text-[#1d1d1f] whitespace-pre-wrap font-sans leading-relaxed">
                      {messages[template.key] || "ยังไม่มีข้อความ"}
                    </pre>
                  </div>
                  
                  {/* Default Message */}
                  <details className="group">
                    <summary className="text-[11px] font-medium text-[#86868b] cursor-pointer hover:text-[#1d1d1f] transition-colors list-none flex items-center gap-2">
                      <span className="inline-block transform group-open:rotate-90 transition-transform">▶</span>
                      📄 ดูข้อความพื้นฐาน
                    </summary>
                    <div className="mt-2 p-3 bg-[#f5f5f7] rounded-lg border border-[#e8e8ed]">
                      <pre className="text-[12px] text-[#86868b] whitespace-pre-wrap font-sans leading-relaxed">
                        {template.defaultMessage}
                      </pre>
                    </div>
                  </details>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-4 sticky bottom-6 bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-lg border border-[#e8e8ed]">
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={handleResetAll} size="lg">
              <RotateCcw className="w-5 h-5" />
              กู้คืนทั้งหมด
            </Button>
            <button
              onClick={handleResetAllToDefault}
              className="px-4 py-2.5 text-[14px] font-semibold text-[#ff9500] hover:bg-[#ff9500]/10 rounded-xl transition-colors flex items-center gap-2 border border-[#ff9500]/20"
            >
              <RefreshCw className="w-5 h-5" />
              รีเซ็ตทั้งหมด
            </button>
          </div>
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

export default function MessagesPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <MessagesContent />
    </ProtectedRoute>
  );
}

