"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { 
  MessageSquare, 
  Save, 
  ArrowLeft, 
  Clock, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Briefcase,
  Home,
  RotateCcw,
  HelpCircle
} from "lucide-react";
import Link from "next/link";

interface MessageTemplate {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  defaultValue: string;
  variables: string[];
}

const MESSAGE_TEMPLATES: MessageTemplate[] = [
  // Check-in/out
  {
    key: "line_msg_checkin",
    label: "เช็คอินเข้างาน",
    description: "ข้อความเมื่อพนักงานเช็คอินสำเร็จ",
    icon: <Clock className="w-5 h-5" />,
    color: "#34c759",
    defaultValue: `✅ เช็คอินเข้างาน

👤 พนักงาน: {employeeName}
⏰ เวลา: {time}
📍 สถานที่: {location}
{lateStatus}`,
    variables: ["employeeName", "time", "location", "lateStatus"],
  },
  {
    key: "line_msg_checkout",
    label: "เช็คเอาท์ออกงาน",
    description: "ข้อความเมื่อพนักงานเช็คเอาท์สำเร็จ",
    icon: <Clock className="w-5 h-5" />,
    color: "#ff3b30",
    defaultValue: `✅ เช็คเอาท์ออกงาน

👤 พนักงาน: {employeeName}
⏰ เวลา: {time}
⏱️ ทำงาน: {totalHours} ชั่วโมง
📍 สถานที่: {location}`,
    variables: ["employeeName", "time", "totalHours", "location"],
  },
  {
    key: "line_msg_early_checkout",
    label: "⚠️ เช็คเอาท์ก่อนเวลา",
    description: "แจ้งเตือนแอดมินเมื่อพนักงานเช็คเอาท์ก่อนเวลาปกติ",
    icon: <AlertTriangle className="w-5 h-5" />,
    color: "#ff9500",
    defaultValue: `⚠️ แจ้งเตือน: เช็คเอาท์ก่อนเวลา

👤 พนักงาน: {employeeName}
⏰ เช็คเอาท์เมื่อ: {time}
⏱️ ทำงาน: {totalHours} ชั่วโมง
📍 สถานที่: {location}
⚠️ เวลาเช็คเอาท์ปกติ: {expectedTime} เป็นต้นไป

กรุณาติดตามหรือสอบถามเหตุผล`,
    variables: ["employeeName", "time", "totalHours", "location", "expectedTime"],
  },
  // OT
  {
    key: "line_msg_ot_approved",
    label: "OT อนุมัติ",
    description: "ข้อความเมื่อคำขอ OT ได้รับอนุมัติ",
    icon: <CheckCircle className="w-5 h-5" />,
    color: "#34c759",
    defaultValue: `✅ คำขอ OT อนุมัติแล้ว

👤 พนักงาน: {employeeName}
📅 วันที่: {date}
⏰ เวลา: {startTime} - {endTime}

สามารถทำงาน OT ได้ตามเวลาที่ขออนุมัติ`,
    variables: ["employeeName", "date", "startTime", "endTime"],
  },
  {
    key: "line_msg_ot_rejected",
    label: "OT ปฏิเสธ",
    description: "ข้อความเมื่อคำขอ OT ถูกปฏิเสธ",
    icon: <XCircle className="w-5 h-5" />,
    color: "#ff3b30",
    defaultValue: `❌ คำขอ OT ถูกปฏิเสธ

👤 พนักงาน: {employeeName}
📅 วันที่: {date}
⏰ เวลา: {startTime} - {endTime}

กรุณาติดต่อหัวหน้างานเพื่อสอบถามเหตุผล`,
    variables: ["employeeName", "date", "startTime", "endTime"],
  },
  // Leave
  {
    key: "line_msg_leave_approved",
    label: "การลา อนุมัติ",
    description: "ข้อความเมื่อคำขอลาได้รับอนุมัติ",
    icon: <CheckCircle className="w-5 h-5" />,
    color: "#34c759",
    defaultValue: `✅ คำขอลาอนุมัติแล้ว

👤 พนักงาน: {employeeName}
📝 ประเภท: {leaveType}
📅 วันที่: {dateRange}

ขอให้พักผ่อนให้เต็มที่`,
    variables: ["employeeName", "leaveType", "dateRange"],
  },
  {
    key: "line_msg_leave_rejected",
    label: "การลา ปฏิเสธ",
    description: "ข้อความเมื่อคำขอลาถูกปฏิเสธ",
    icon: <XCircle className="w-5 h-5" />,
    color: "#ff3b30",
    defaultValue: `❌ คำขอลาถูกปฏิเสธ

👤 พนักงาน: {employeeName}
📝 ประเภท: {leaveType}
📅 วันที่: {dateRange}

กรุณาติดต่อหัวหน้างานเพื่อสอบถามเหตุผล`,
    variables: ["employeeName", "leaveType", "dateRange"],
  },
  // WFH
  {
    key: "line_msg_wfh_approved",
    label: "WFH อนุมัติ",
    description: "ข้อความเมื่อคำขอ WFH ได้รับอนุมัติ",
    icon: <Home className="w-5 h-5" />,
    color: "#34c759",
    defaultValue: `✅ คำขอ WFH อนุมัติแล้ว

👤 พนักงาน: {employeeName}
📅 วันที่: {date}
🏠 Work From Home

อย่าลืมเช็คอิน-เช็คเอาท์ตามปกติ`,
    variables: ["employeeName", "date"],
  },
  {
    key: "line_msg_wfh_rejected",
    label: "WFH ปฏิเสธ",
    description: "ข้อความเมื่อคำขอ WFH ถูกปฏิเสธ",
    icon: <XCircle className="w-5 h-5" />,
    color: "#ff3b30",
    defaultValue: `❌ คำขอ WFH ถูกปฏิเสธ

👤 พนักงาน: {employeeName}
📅 วันที่: {date}

กรุณาติดต่อหัวหน้างานเพื่อสอบถามเหตุผล`,
    variables: ["employeeName", "date"],
  },
  // Holiday
  {
    key: "line_msg_holiday_reminder",
    label: "แจ้งเตือนวันหยุดล่วงหน้า",
    description: "ข้อความแจ้งเตือนก่อนวันหยุด",
    icon: <Calendar className="w-5 h-5" />,
    color: "#af52de",
    defaultValue: `🎉 แจ้งเตือนวันหยุด

📅 {holidayName}
📆 วันที่: {date}
🏖️ ประเภท: {type}

{message}`,
    variables: ["holidayName", "date", "type", "message"],
  },
  {
    key: "line_msg_holiday_today",
    label: "วันนี้เป็นวันหยุด",
    description: "ข้อความเมื่อวันนี้เป็นวันหยุด",
    icon: <Calendar className="w-5 h-5" />,
    color: "#af52de",
    defaultValue: `🎊 วันนี้เป็นวันหยุด!

📅 {holidayName}
🏖️ ประเภท: {type}

ขอให้มีความสุขกับวันหยุด! 😊`,
    variables: ["holidayName", "type"],
  },
  // Late Request
  {
    key: "line_msg_late_request_approved",
    label: "ขอมาสาย อนุมัติ",
    description: "ข้อความเมื่อคำขอมาสายได้รับอนุมัติ",
    icon: <CheckCircle className="w-5 h-5" />,
    color: "#34c759",
    defaultValue: `✅ คำขอมาสายอนุมัติแล้ว

👤 พนักงาน: {employeeName}
📅 วันที่: {date}
📝 เหตุผล: {reason}

ไม่ถูกหักเงินสำหรับการมาสายวันนี้`,
    variables: ["employeeName", "date", "reason"],
  },
  {
    key: "line_msg_late_request_rejected",
    label: "ขอมาสาย ปฏิเสธ",
    description: "ข้อความเมื่อคำขอมาสายถูกปฏิเสธ",
    icon: <XCircle className="w-5 h-5" />,
    color: "#ff3b30",
    defaultValue: `❌ คำขอมาสายถูกปฏิเสธ

👤 พนักงาน: {employeeName}
📅 วันที่: {date}
📝 เหตุผล: {reason}

กรุณาติดต่อหัวหน้างานเพื่อสอบถามเพิ่มเติม`,
    variables: ["employeeName", "date", "reason"],
  },
];

function LineMessagesContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const keys = MESSAGE_TEMPLATES.map((t: any) => t.key);
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", keys);

      if (error) throw error;

      const messagesMap: Record<string, string> = {};
      MESSAGE_TEMPLATES.forEach((template: any) => {
        const found = data?.find((d: any) => d.setting_key === template.key);
        messagesMap[template.key] = found?.setting_value || template.defaultValue;
      });

      setMessages(messagesMap);
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
            { setting_key: key, setting_value: value },
            { onConflict: "setting_key" }
          );
        if (error) throw error;
      }

      toast.success("บันทึกสำเร็จ", "บันทึกข้อความแจ้งเตือนเรียบร้อยแล้ว");
    } catch (error) {
      console.error("Error saving messages:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อความได้");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = (key: string) => {
    const template = MESSAGE_TEMPLATES.find((t: any) => t.key === key);
    if (template) {
      setMessages(prev => ({ ...prev, [key]: template.defaultValue }));
      toast.success("รีเซ็ตแล้ว", "กดบันทึกเพื่อยืนยัน");
    }
  };

  const handleResetAll = () => {
    const defaultMessages: Record<string, string> = {};
    MESSAGE_TEMPLATES.forEach((template: any) => {
      defaultMessages[template.key] = template.defaultValue;
    });
    setMessages(defaultMessages);
    toast.success("รีเซ็ตทั้งหมดแล้ว", "กดบันทึกเพื่อยืนยัน");
  };

  if (loading) {
    return (
      <AdminLayout title="ตั้งค่าข้อความ LINE">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#06C755] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="ตั้งค่าข้อความ LINE" 
      description="ปรับแต่งข้อความแจ้งเตือนที่ส่งผ่าน LINE"
    >
      <div className="mb-6 flex items-center justify-between">
        <Link href="/admin/settings">
          <Button variant="secondary" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
            กลับไปหน้าตั้งค่า
          </Button>
        </Link>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleResetAll}
          icon={<RotateCcw className="w-4 h-4" />}
        >
          รีเซ็ตทั้งหมด
        </Button>
      </div>

      {/* Variable Guide */}
      <Card elevated className="mb-6 bg-[#0071e3]/5 border border-[#0071e3]/20">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-[#0071e3] mt-0.5" />
          <div>
            <h4 className="text-[15px] font-semibold text-[#0071e3] mb-1">
              วิธีใช้ตัวแปร
            </h4>
            <p className="text-[13px] text-[#0071e3]/80 leading-relaxed">
              ใช้ <code className="bg-[#0071e3]/10 px-1 py-0.5 rounded">{"{variableName}"}</code> เพื่อแทรกข้อมูลแบบไดนามิก
              เช่น <code className="bg-[#0071e3]/10 px-1 py-0.5 rounded">{"{employeeName}"}</code> จะแสดงชื่อพนักงาน
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {MESSAGE_TEMPLATES.map((template) => (
          <Card 
            key={template.key}
            elevated 
            className="overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpandedCard(expandedCard === template.key ? null : template.key)}
              className="w-full flex items-center justify-between p-0 text-left"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${template.color}20` }}
                >
                  <span style={{ color: template.color }}>{template.icon}</span>
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-[#1d1d1f]">
                    {template.label}
                  </h3>
                  <p className="text-[13px] text-[#86868b]">{template.description}</p>
                </div>
              </div>
              <div className={`transform transition-transform ${expandedCard === template.key ? "rotate-180" : ""}`}>
                <svg className="w-5 h-5 text-[#86868b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {expandedCard === template.key && (
              <div className="mt-4 space-y-4 border-t border-[#e8e8ed] pt-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[14px] font-medium text-[#1d1d1f]">
                      ข้อความ
                    </label>
                    <button
                      onClick={() => handleReset(template.key)}
                      className="text-[13px] text-[#0071e3] hover:underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      รีเซ็ต
                    </button>
                  </div>
                  <textarea
                    value={messages[template.key] || ""}
                    onChange={(e) => setMessages(prev => ({ ...prev, [template.key]: e.target.value }))}
                    rows={8}
                    className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[14px] font-mono
                      focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all
                      resize-none"
                    placeholder="ใส่ข้อความแจ้งเตือน..."
                  />
                </div>

                <div className="bg-[#f5f5f7] rounded-xl p-3">
                  <p className="text-[12px] font-medium text-[#86868b] mb-2">ตัวแปรที่ใช้ได้:</p>
                  <div className="flex flex-wrap gap-2">
                    {template.variables.map((variable: string) => (
                      <code 
                        key={variable}
                        className="px-2 py-1 bg-white rounded-lg text-[12px] text-[#1d1d1f] border border-[#e8e8ed]"
                      >
                        {`{${variable}}`}
                      </code>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Save Button */}
      <div className="sticky bottom-4 mt-6">
        <Button 
          onClick={handleSave} 
          size="lg" 
          fullWidth
          loading={saving}
          icon={!saving ? <Save className="w-5 h-5" /> : undefined}
        >
          {saving ? "กำลังบันทึก..." : "บันทึกข้อความทั้งหมด"}
        </Button>
      </div>
    </AdminLayout>
  );
}

export default function LineMessagesPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <LineMessagesContent />
    </ProtectedRoute>
  );
}

