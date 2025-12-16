"use client";

import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { BottomNav } from "@/components/BottomNav";
import {
  Bell,
  User,
  LogOut,
  ChevronRight,
  Shield,
  Info,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";

function SettingsContent() {
  const router = useRouter();
  const { employee, user, signOut } = useAuth();

  const handleSignOut = async () => {
    if (confirm("ต้องการออกจากระบบหรือไม่?")) {
      await signOut();
      router.push("/login");
    }
  };

  const menuItems = [
    {
      title: "การแจ้งเตือน",
      description: "ตั้งค่าการแจ้งเตือนเช็คอิน/เช็คเอาท์",
      icon: Bell,
      href: "/my-profile/notifications",
      color: "#0071e3",
    },
    {
      title: "ข้อมูลส่วนตัว",
      description: "ดูและแก้ไขข้อมูลส่วนตัว",
      icon: User,
      href: "/my-profile",
      color: "#34c759",
    },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#fbfbfd] pb-20 pt-safe">
        <main className="max-w-[600px] mx-auto px-4 pt-6 pb-4">
          {/* Page Title */}
          <h1 className="text-[32px] font-bold text-[#1d1d1f] mb-6">ตั้งค่า</h1>
          {/* Profile Card */}
          <Card elevated className="mb-6">
            <div className="flex items-center gap-4">
              <Avatar name={employee?.name || "User"} size="xl" />
              <div className="flex-1">
                <h2 className="text-[19px] font-semibold text-[#1d1d1f]">
                  {employee?.name}
                </h2>
                <p className="text-[14px] text-[#86868b] mt-0.5">
                  {employee?.email}
                </p>
                {employee?.role && (
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#0071e3]/10 text-[#0071e3] text-[12px] font-medium rounded-lg">
                      <Shield className="w-3 h-3" />
                      {employee.role === "supervisor" ? "หัวหน้างาน" : "พนักงาน"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Settings Menu */}
          <div className="space-y-3 mb-6">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.href}
                  elevated
                  className="cursor-pointer hover:shadow-lg transition-shadow active:scale-[0.98]"
                  onClick={() => router.push(item.href)}
                >
                  <div className="flex items-center gap-4 p-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${item.color}15` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: item.color }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                        {item.title}
                      </h3>
                      <p className="text-[14px] text-[#86868b] mt-0.5">
                        {item.description}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#c7c7cc]" />
                  </div>
                </Card>
              );
            })}
          </div>

          {/* App Info */}
          <Card className="mb-6">
            <div className="flex items-center gap-3 p-4">
              <Info className="w-5 h-5 text-[#86868b]" />
              <div>
                <p className="text-[14px] text-[#86868b]">
                  Anajak HR v1.0.0
                </p>
                <p className="text-[12px] text-[#c7c7cc] mt-0.5">
                  ระบบบันทึกเวลาและจัดการ OT
                </p>
              </div>
            </div>
          </Card>

          {/* Sign Out Button */}
          <Button
            fullWidth
            variant="danger"
            onClick={handleSignOut}
            size="lg"
          >
            <LogOut className="w-5 h-5" />
            ออกจากระบบ
          </Button>
        </main>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}

export default function SettingsPage() {
  return <SettingsContent />;
}

