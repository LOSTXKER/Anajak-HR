"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  UserCheck,
  ChartBar,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Fingerprint,
  MapPin,
  Shield,
  FileText,
  Home,
  LogOut,
  User,
  ChevronDown,
  Settings,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";

export default function HomePage() {
  const { user, employee, isConfigured, loading, signOut } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in - Landing Page
  if (!user) {
    return (
      <div className="min-h-screen bg-[#fbfbfd]">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 apple-glass border-b border-[#d2d2d7]/30">
          <div className="max-w-[980px] mx-auto px-6 h-12 flex items-center justify-between">
            <Link href="/" className="text-[#1d1d1f] font-semibold">
              Anajak HR
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm text-[#1d1d1f] hover:text-[#0071e3] transition-colors"
              >
                เข้าสู่ระบบ
              </Link>
              <Link
                href="/register"
                className="text-sm bg-[#0071e3] text-white px-4 py-1.5 rounded-full hover:bg-[#0077ed] transition-colors"
              >
                สมัครสมาชิก
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-6">
          <div className="max-w-[980px] mx-auto text-center">
            <Badge variant="info" className="mb-6">
              ระบบบันทึกเวลาทำงาน
            </Badge>
            <h1 className="text-[56px] md:text-[80px] font-semibold text-[#1d1d1f] leading-[1.05] tracking-[-0.015em] mb-6">
              Anajak HR
            </h1>
            <p className="text-[21px] md:text-[28px] text-[#86868b] leading-[1.19] max-w-[600px] mx-auto mb-10">
              บันทึกเวลาเข้า-ออกงาน จัดการ OT<br />
              ผ่านมือถือ ง่าย รวดเร็ว ปลอดภัย
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => router.push("/register")}
              >
                เริ่มต้นใช้งาน
                <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => router.push("/login")}
              >
                เข้าสู่ระบบ
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-6 bg-white">
          <div className="max-w-[980px] mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-[40px] md:text-[48px] font-semibold text-[#1d1d1f] tracking-tight mb-4">
                ฟีเจอร์ครบครัน
              </h2>
              <p className="text-[19px] text-[#86868b]">
                ออกแบบมาเพื่อการทำงานที่มีประสิทธิภาพ
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: Fingerprint,
                  title: "ยืนยันตัวตน",
                  desc: "ถ่ายรูปเซลฟี่ทุกครั้งที่เข้า-ออกงาน เพื่อความปลอดภัย",
                },
                {
                  icon: MapPin,
                  title: "ตรวจสอบตำแหน่ง",
                  desc: "ระบบ GPS ตรวจสอบว่าคุณอยู่ในพื้นที่ทำงาน",
                },
                {
                  icon: Shield,
                  title: "ปลอดภัย",
                  desc: "ข้อมูลถูกเก็บอย่างปลอดภัยบนระบบคลาวด์",
                },
              ].map((feature, i) => (
                <div key={i} className="text-center p-8">
                  <div className="w-16 h-16 bg-[#f5f5f7] rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <feature.icon className="w-8 h-8 text-[#1d1d1f]" />
                  </div>
                  <h3 className="text-[21px] font-semibold text-[#1d1d1f] mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-[17px] text-[#86868b] leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6">
          <div className="max-w-[680px] mx-auto text-center">
            <h2 className="text-[40px] font-semibold text-[#1d1d1f] tracking-tight mb-4">
              พร้อมเริ่มต้นแล้วหรือยัง?
            </h2>
            <p className="text-[19px] text-[#86868b] mb-8">
              สมัครสมาชิกฟรี ใช้งานได้ทันที
            </p>
            <Button
              size="lg"
              onClick={() => router.push("/register")}
            >
              สมัครสมาชิกเลย
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-6 border-t border-[#d2d2d7]">
          <div className="max-w-[980px] mx-auto text-center">
            <p className="text-[12px] text-[#86868b]">
              © 2024 Anajak HR System. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    );
  }

  // Logged in - Dashboard
  return (
    <div className="min-h-screen bg-[#fbfbfd]">
      {/* Header */}
      <header className="sticky top-0 z-50 apple-glass border-b border-[#d2d2d7]/30">
        <div className="max-w-[980px] mx-auto px-6 h-12 flex items-center justify-between">
          <Link href="/" className="text-[#1d1d1f] font-semibold">
            Anajak HR
          </Link>
          <div className="flex items-center gap-4">
            {(employee?.role === "admin" || employee?.role === "supervisor") && (
              <Link
                href="/admin"
                className="text-sm text-[#86868b] hover:text-[#1d1d1f] transition-colors"
              >
                Admin
              </Link>
            )}
            <Link
              href="/history"
              className="text-sm text-[#86868b] hover:text-[#1d1d1f] transition-colors"
            >
              ประวัติ
            </Link>
            
            {/* User Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[#f5f5f7] transition-colors"
              >
                <Avatar name={employee?.name || "User"} size="sm" />
                <ChevronDown className={`w-4 h-4 text-[#86868b] transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-[#e8e8ed] py-2 animate-scale-in">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-[#e8e8ed]">
                    <p className="text-[15px] font-semibold text-[#1d1d1f] truncate">
                      {employee?.name}
                    </p>
                    <p className="text-[13px] text-[#86868b] truncate">
                      {employee?.email}
                    </p>
                    <Badge variant="info" className="mt-2">
                      {employee?.role === "admin" ? "ผู้ดูแลระบบ" : 
                       employee?.role === "supervisor" ? "หัวหน้างาน" : "พนักงาน"}
                    </Badge>
                  </div>
                  
                  {/* Menu Items */}
                  <div className="py-1">
                    <Link
                      href="/history"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2 text-[15px] text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
                    >
                      <ChartBar className="w-4 h-4 text-[#86868b]" />
                      ประวัติการทำงาน
                    </Link>
                    {(employee?.role === "admin" || employee?.role === "supervisor") && (
                      <Link
                        href="/admin"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2 text-[15px] text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
                      >
                        <Settings className="w-4 h-4 text-[#86868b]" />
                        จัดการระบบ
                      </Link>
                    )}
                  </div>
                  
                  {/* Logout */}
                  <div className="border-t border-[#e8e8ed] pt-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2 text-[15px] text-[#ff3b30] hover:bg-[#ff3b30]/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      ออกจากระบบ
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[980px] mx-auto px-6 py-12">
        {/* Welcome */}
        <div className="mb-12">
          <h1 className="text-[32px] font-semibold text-[#1d1d1f] mb-2">
            สวัสดี, {employee?.name}
          </h1>
          <p className="text-[17px] text-[#86868b]">
            {new Date().toLocaleDateString("th-TH", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
          {[
            {
              href: "/checkin",
              icon: UserCheck,
              title: "เข้างาน",
              color: "bg-[#34c759]",
            },
            {
              href: "/checkout",
              icon: Clock,
              title: "ออกงาน",
              color: "bg-[#ff3b30]",
            },
            {
              href: "/ot/request",
              icon: Calendar,
              title: "ขอ OT",
              color: "bg-[#ff9500]",
            },
            {
              href: "/leave/request",
              icon: FileText,
              title: "ขอลา",
              color: "bg-[#af52de]",
            },
            {
              href: "/wfh/request",
              icon: Home,
              title: "ขอ WFH",
              color: "bg-[#0071e3]",
            },
            {
              href: "/history",
              icon: ChartBar,
              title: "ประวัติ",
              color: "bg-[#5856d6]",
            },
          ].map((action, i) => (
            <Link key={i} href={action.href}>
              <Card
                elevated
                className="h-full hover:scale-[1.02] transition-transform cursor-pointer"
              >
                <div className="text-center py-6">
                  <div
                    className={`w-14 h-14 ${action.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}
                  >
                    <action.icon className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
                    {action.title}
                  </h2>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* Tips */}
        <Card elevated padding="lg">
          <h3 className="text-[21px] font-semibold text-[#1d1d1f] mb-4">
            เคล็ดลับการใช้งาน
          </h3>
          <div className="space-y-3">
            {[
              "เช็กอินและเช็กเอาท์ทุกวันเพื่อบันทึกเวลาทำงาน",
              "ขออนุมัติ OT ล่วงหน้าก่อนทำงานนอกเวลา",
              "ตรวจสอบประวัติการทำงานได้ตลอดเวลา",
              "อนุญาตการใช้กล้องและ GPS เพื่อความถูกต้อง",
            ].map((tip, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#34c759] flex-shrink-0" />
                <span className="text-[15px] text-[#6e6e73]">{tip}</span>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}
