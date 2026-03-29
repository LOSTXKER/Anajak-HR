"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Bell, ArrowLeft, Send, Users, CheckCircle } from "lucide-react";
import { authFetch } from "@/lib/utils/auth-fetch";
import Link from "next/link";

interface Employee {
  id: string;
  name: string;
  email: string;
}

interface PushSubscription {
  employee_id: string;
  created_at: string;
}

function PushTestContent() {
  const toast = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [subscriptions, setSubscriptions] = useState<PushSubscription[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [title, setTitle] = useState("🔔 ทดสอบการแจ้งเตือน");
  const [message, setMessage] = useState("นี่คือข้อความทดสอบจาก Admin");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, subRes] = await Promise.all([
        supabase
          .from("employees")
          .select("id, name, email")
          .is("deleted_at", null)
          .eq("role", "staff")
          .order("name"),
        supabase
          .from("push_subscriptions")
          .select("employee_id, created_at"),
      ]);

      if (empRes.data) setEmployees(empRes.data);
      if (subRes.data) setSubscriptions(subRes.data);
    } catch {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSendTest = async () => {
    if (!selectedEmployee) {
      toast.error("กรุณาเลือกพนักงาน", "เลือกพนักงานที่ต้องการทดสอบส่ง");
      return;
    }

    if (!title || !message) {
      toast.error("กรุณากรอกข้อมูล", "กรอกหัวข้อและข้อความให้ครบถ้วน");
      return;
    }

    setSending(true);
    try {
      const response = await authFetch("/api/push/send", {
        method: "POST",
        body: JSON.stringify({
          employeeId: selectedEmployee,
          title,
          body: message,
          tag: "test-notification",
          requireInteraction: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("ส่งสำเร็จ!", "ส่ง Push Notification เรียบร้อยแล้ว");
      } else {
        toast.error("ไม่สามารถส่งได้", data.message || "พนักงานอาจยังไม่ได้ subscribe");
      }
    } catch (error) {
      console.error("Error sending push:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถส่ง Push Notification ได้");
    } finally {
      setSending(false);
    }
  };

  const subscribedEmployeeIds = new Set(subscriptions.map(s => s.employee_id));

  return (
    <AdminLayout title="ทดสอบ Push Notifications" description="ส่งการแจ้งเตือนทดสอบให้พนักงาน">
      <Link href="/admin/settings/notifications" className="inline-flex items-center gap-2 text-[#0071e3] hover:underline mb-6">
        <ArrowLeft className="w-4 h-4" />
        กลับไปหน้าตั้งค่าการแจ้งเตือน
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#0071e3]/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-[#0071e3]" />
              </div>
              <div>
                <p className="text-[13px] text-[#86868b]">พนักงานทั้งหมด</p>
                <p className="text-[24px] font-bold text-[#1d1d1f]">{employees.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#34c759]/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-[#34c759]" />
              </div>
              <div>
                <p className="text-[13px] text-[#86868b]">Subscribe แล้ว</p>
                <p className="text-[24px] font-bold text-[#34c759]">{subscriptions.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#ff9500]/10 flex items-center justify-center">
                <Bell className="w-6 h-6 text-[#ff9500]" />
              </div>
              <div>
                <p className="text-[13px] text-[#86868b]">อัตราการ Subscribe</p>
                <p className="text-[24px] font-bold text-[#ff9500]">
                  {employees.length > 0 ? Math.round((subscriptions.length / employees.length) * 100) : 0}%
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Send Test Form */}
        <div className="lg:col-span-2">
          <Card elevated className="p-6">
            <h3 className="text-[18px] font-bold text-[#1d1d1f] mb-4">ส่งการแจ้งเตือนทดสอบ</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                  เลือกพนักงาน
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f5f5f7] border border-[#e8e8ed] rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20"
                >
                  <option value="">-- เลือกพนักงาน --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} {subscribedEmployeeIds.has(emp.id) ? "✅" : "❌"}
                    </option>
                  ))}
                </select>
                <p className="text-[12px] text-[#86868b] mt-1">
                  ✅ = Subscribe แล้ว, ❌ = ยังไม่ได้ Subscribe
                </p>
              </div>

              <div>
                <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                  หัวข้อ
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="หัวข้อการแจ้งเตือน"
                  className="w-full px-4 py-3 bg-[#f5f5f7] border border-[#e8e8ed] rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20"
                />
              </div>

              <div>
                <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                  ข้อความ
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="ข้อความที่ต้องการส่ง"
                  rows={4}
                  className="w-full px-4 py-3 bg-[#f5f5f7] border border-[#e8e8ed] rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 resize-none"
                />
              </div>

              <Button
                fullWidth
                onClick={handleSendTest}
                loading={sending}
                size="lg"
                icon={!sending ? <Send className="w-5 h-5" /> : undefined}
              >
                {sending ? "กำลังส่ง..." : "ส่งการแจ้งเตือนทดสอบ"}
              </Button>
            </div>
          </Card>
        </div>

        {/* Employee List */}
        <div>
          <Card elevated className="p-6">
            <h3 className="text-[18px] font-bold text-[#1d1d1f] mb-4">รายชื่อพนักงาน</h3>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {loading ? (
                <p className="text-[14px] text-[#86868b] text-center py-4">กำลังโหลด...</p>
              ) : employees.length === 0 ? (
                <p className="text-[14px] text-[#86868b] text-center py-4">ไม่มีพนักงาน</p>
              ) : (
                employees.map((emp) => {
                  const isSubscribed = subscribedEmployeeIds.has(emp.id);
                  return (
                    <div
                      key={emp.id}
                      className={`p-3 rounded-lg border ${
                        isSubscribed
                          ? "bg-[#34c759]/5 border-[#34c759]/20"
                          : "bg-[#f5f5f7] border-[#e8e8ed]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-[14px] font-medium text-[#1d1d1f]">{emp.name}</p>
                          <p className="text-[12px] text-[#86868b]">{emp.email}</p>
                        </div>
                        {isSubscribed ? (
                          <CheckCircle className="w-5 h-5 text-[#34c759]" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-[#d2d2d7]" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

export default function PushTestPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <PushTestContent />
    </ProtectedRoute>
  );
}

