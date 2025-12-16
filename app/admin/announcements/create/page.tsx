"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NativeSelect } from "@/components/ui/NativeSelect";
import { Textarea } from "@/components/ui/Textarea";
import { Toggle } from "@/components/ui/Toggle";
import {
  ArrowLeft,
  Save,
  Send,
  Megaphone,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { useToast } from "@/components/ui/Toast";
import { showNotification, canShowNotifications } from "@/lib/utils/notifications";
import type { AnnouncementFormData } from "@/types/announcement";

interface Branch {
  id: string;
  name: string;
}

function CreateAnnouncementContent() {
  const router = useRouter();
  const { employee } = useAuth();
  const toast = useToast();

  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: "",
    message: "",
    priority: "normal",
    category: "general",
    target_type: "all",
    send_notification: true,
  });

  const [branches, setBranches] = useState<Branch[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    const { data } = await supabase
      .from("branches")
      .select("id, name")
      .order("name");
    setBranches(data || []);
  };

  const handleSubmit = async (publish: boolean) => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error("กรุณากรอกข้อมูล", "กรุณากรอกหัวข้อและข้อความ");
      return;
    }

    if (!employee?.id) {
      toast.error("เกิดข้อผิดพลาด", "ไม่พบข้อมูลผู้ใช้");
      return;
    }

    publish ? setPublishing(true) : setSaving(true);

    try {
      const announcementData = {
        ...formData,
        published: publish,
        published_at: publish ? new Date().toISOString() : null,
        created_by: employee.id,
      };

      const { data, error } = await supabase
        .from("announcements")
        .insert([announcementData])
        .select()
        .single();

      if (error) throw error;

      // Send notifications if published and enabled
      if (publish && formData.send_notification && canShowNotifications()) {
        showNotification(`📢 ${formData.title}`, {
          body: formData.message,
          tag: `announcement-${data.id}`,
        });

        // Update notification sent timestamp
        await supabase
          .from("announcements")
          .update({ notification_sent_at: new Date().toISOString() })
          .eq("id", data.id);
      }

      toast.success(
        publish ? "เผยแพร่สำเร็จ" : "บันทึกสำเร็จ",
        publish ? "ประกาศถูกเผยแพร่แล้ว" : "บันทึกเป็นแบบร่างแล้ว"
      );

      router.push("/admin/announcements");
    } catch (error: any) {
      console.error("Error creating announcement:", error);
      toast.error("เกิดข้อผิดพลาด", error.message);
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfbfd]">
      {/* Header */}
      <header className="sticky top-0 z-50 apple-glass border-b border-[#d2d2d7]/30">
        <div className="max-w-[680px] mx-auto px-4 h-12 flex items-center justify-between">
          <Link href="/admin/announcements" className="flex items-center gap-2 text-[#0071e3]">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">กลับ</span>
          </Link>
          <h1 className="text-[17px] font-semibold text-[#1d1d1f]">สร้างประกาศ</h1>
          <div className="w-12" />
        </div>
      </header>

      <main className="max-w-[680px] mx-auto px-4 py-6">
        <Card className="p-6 space-y-6">
          {/* Icon Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-[#e8e8ed]">
            <div className="w-12 h-12 rounded-xl bg-[#0071e3]/10 flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-[#0071e3]" />
            </div>
            <div>
              <h2 className="text-[19px] font-semibold text-[#1d1d1f]">ประกาศใหม่</h2>
              <p className="text-[13px] text-[#86868b]">สร้างประกาศแจ้งพนักงาน</p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <Input
              label="หัวข้อประกาศ"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="เช่น ประกาศวันหยุดยาว"
              required
            />

            <Textarea
              label="ข้อความประกาศ"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="รายละเอียดประกาศ..."
              rows={6}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <NativeSelect
                label="ความสำคัญ"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              >
                <option value="low">💬 ทั่วไป</option>
                <option value="normal">📢 ปกติ</option>
                <option value="high">⚠️ สำคัญ</option>
                <option value="urgent">🚨 ด่วนมาก</option>
              </NativeSelect>

              <NativeSelect
                label="หมวดหมู่"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              >
                <option value="general">ทั่วไป</option>
                <option value="hr">ทรัพยากรบุคคล</option>
                <option value="payroll">เงินเดือน</option>
                <option value="holiday">วันหยุด</option>
                <option value="urgent">ด่วน</option>
              </NativeSelect>
            </div>

            <NativeSelect
              label="ส่งถึง"
              value={formData.target_type}
              onChange={(e) => {
                const target_type = e.target.value as any;
                setFormData({
                  ...formData,
                  target_type,
                  target_branch_id: undefined,
                  target_employee_ids: undefined,
                });
              }}
            >
              <option value="all">ทุกคน</option>
              <option value="branch">สาขาเฉพาะ</option>
            </NativeSelect>

            {formData.target_type === "branch" && (
              <NativeSelect
                label="เลือกสาขา"
                value={formData.target_branch_id || ""}
                onChange={(e) => setFormData({ ...formData, target_branch_id: e.target.value })}
              >
                <option value="">เลือกสาขา</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </NativeSelect>
            )}

            <Input
              label="วันหมดอายุ (ถ้ามี)"
              type="datetime-local"
              value={formData.expires_at || ""}
              onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
            />

            <div className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-xl">
              <div>
                <p className="text-[15px] font-medium text-[#1d1d1f]">ส่งการแจ้งเตือน</p>
                <p className="text-[13px] text-[#86868b]">
                  แจ้งเตือนพนักงานเมื่อเผยแพร่ประกาศ
                </p>
              </div>
              <Toggle
                checked={formData.send_notification}
                onChange={(checked) => setFormData({ ...formData, send_notification: checked })}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-[#e8e8ed]">
            <Button
              fullWidth
              variant="secondary"
              onClick={() => handleSubmit(false)}
              loading={saving}
              disabled={publishing}
            >
              <Save className="w-5 h-5" />
              บันทึกแบบร่าง
            </Button>
            <Button
              fullWidth
              onClick={() => handleSubmit(true)}
              loading={publishing}
              disabled={saving}
            >
              <Send className="w-5 h-5" />
              เผยแพร่เลย
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}

export default function CreateAnnouncementPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <CreateAnnouncementContent />
    </ProtectedRoute>
  );
}

