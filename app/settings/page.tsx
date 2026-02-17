"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmDialog } from "@/components/ui/Modal";
import { BottomNav } from "@/components/BottomNav";
import { InstallButton } from "@/components/InstallButton";
import {
  Bell,
  LogOut,
  ChevronRight,
  Shield,
  Info,
  Lock,
  Globe,
  FileText,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";

function SettingsContent() {
  const router = useRouter();
  const { employee, user, signOut } = useAuth();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const menuItems = [
    {
      title: "การแจ้งเตือน",
      description: "ตั้งค่าการแจ้งเตือนเช็คอิน/เช็คเอาท์",
      icon: Bell,
      href: "/notifications",
      color: "#0071e3",
    },
    {
      title: "ความเป็นส่วนตัว",
      description: "จัดการข้อมูลส่วนตัวและความปลอดภัย",
      icon: Lock,
      href: "/settings/privacy",
      color: "#5856d6",
    },
    {
      title: "เกี่ยวกับแอป",
      description: "ข้อมูลและเวอร์ชันของแอปพลิเคชัน",
      icon: Info,
      href: "/settings/about",
      color: "#86868b",
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
            <div className="flex items-center gap-4 p-5">
              <Avatar name={employee?.name || "User"} size="xl" />
              <div className="flex-1">
                <h2 className="text-[20px] font-bold text-[#1d1d1f]">
                  {employee?.name}
                </h2>
                <p className="text-[15px] text-[#86868b] mt-1">
                  {employee?.email}
                </p>
                {employee?.role && (
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0071e3]/10 text-[#0071e3] text-[13px] font-semibold rounded-lg">
                      <Shield className="w-4 h-4" />
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
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className="w-full"
                >
                  <Card
                    elevated
                    className="cursor-pointer hover:shadow-lg transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-4 p-5 min-h-[80px]">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${item.color}15` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: item.color }} />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-[18px] font-semibold text-[#1d1d1f]">
                        {item.title}
                      </h3>
                      <p className="text-[14px] text-[#86868b] mt-1">
                        {item.description}
                      </p>
                    </div>
                    <ChevronRight className="w-6 h-6 text-[#c7c7cc]" />
                  </div>
                  </Card>
                </button>
              );
            })}
          </div>

          {/* App Info */}
          <div className="flex items-center justify-center gap-2 mb-6 py-4">
            <Info className="w-4 h-4 text-[#c7c7cc]" />
            <p className="text-[13px] text-[#c7c7cc]">
              Anajak HR v1.0.0
            </p>
          </div>

          {/* Install App Button */}
          <InstallButton />

          {/* Sign Out Button */}
          <Button
            fullWidth
            variant="danger"
            onClick={() => setShowSignOutConfirm(true)}
            size="lg"
          >
            <LogOut className="w-5 h-5" />
            ออกจากระบบ
          </Button>
        </main>

        <ConfirmDialog
          isOpen={showSignOutConfirm}
          onClose={() => setShowSignOutConfirm(false)}
          onConfirm={handleSignOut}
          title="ออกจากระบบ"
          message="ต้องการออกจากระบบหรือไม่?"
          type="warning"
          confirmText="ออกจากระบบ"
          cancelText="ยกเลิก"
        />

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}

export default function SettingsPage() {
  return <SettingsContent />;
}

