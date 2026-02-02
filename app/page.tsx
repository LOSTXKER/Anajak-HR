"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Fingerprint,
  MapPin,
  Shield,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { BottomNav } from "@/components/BottomNav";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { useDashboard, useUnreadAnnouncements } from "@/lib/hooks";
import {
  TodayStatusCard,
  OTTimerCard,
  PendingOTCard,
  UpcomingHolidaysCard,
  MonthlySummaryCards,
  QuickActionsGrid,
} from "@/components/dashboard";


export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Use the new dashboard hook for all data fetching
  const {
    user,
    employee,
    loading,
    signOut,
    todayAttendance,
    workDuration,
    workProgress,
    isOvertime,
    timeRemaining,
    activeOT,
    pendingOT,
    otDuration,
    monthlyOT,
    leaveBalance,
    todayHoliday,
    isRestDay,
    upcomingHolidays,
    refetchAll,
  } = useDashboard();

  // Use the unread announcements hook
  const { unreadCount: unreadAnnouncementCount } = useUnreadAnnouncements({
    employeeId: employee?.id,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Admin is system account - redirect to admin panel
  useEffect(() => {
    if (employee?.role === "admin") {
      router.replace("/admin");
    }
  }, [employee, router]);

  // Refresh when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && employee) {
        refetchAll();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [employee, refetchAll]);

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
    <div className="min-h-screen bg-[#fbfbfd] pb-20 pt-safe">
      {/* Main Content */}
      <main className="max-w-[600px] mx-auto px-4 pt-4 pb-4">
        {/* Welcome & Date */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[14px] text-[#86868b] mb-1">
              {format(new Date(), "EEEE d MMMM yyyy", { locale: th })}
            </p>
            <h1 className="text-[32px] font-bold text-[#1d1d1f]">
              สวัสดี, {employee?.name?.split(" ")[0]}
            </h1>
          </div>
          {(employee?.role === "admin" || employee?.role === "supervisor") && (
            <Link
              href="/admin"
              className="flex items-center gap-2 px-4 py-2 bg-[#0071e3]/10 text-[#0071e3] text-[14px] font-medium rounded-xl hover:bg-[#0071e3]/20 transition-colors active:scale-95"
            >
              <Shield className="w-4 h-4" />
              Admin
            </Link>
          )}
        </div>

        {/* Today's Status Card */}
        <TodayStatusCard
          todayAttendance={todayAttendance}
          workDuration={workDuration}
          workProgress={workProgress}
          isOvertime={isOvertime}
          timeRemaining={timeRemaining}
          isRestDay={isRestDay}
          todayHoliday={todayHoliday}
          pendingOT={pendingOT}
          activeOT={activeOT}
        />

        {/* OT Timer Card */}
        <OTTimerCard activeOT={activeOT} otDuration={otDuration} />

        {/* Pending OT Ready to Start */}
        <PendingOTCard pendingOT={pendingOT} activeOT={activeOT} />

        {/* Today Holiday Banner */}
        {todayHoliday && (
          <div className="rounded-2xl p-5 mb-4 bg-gradient-to-br from-[#af52de] to-[#9b59b6]">
            <div className="flex items-center gap-3">
              <div className="text-[32px]">🎉</div>
              <div className="flex-1">
                <p className="text-[15px] font-medium text-white/80">วันนี้วันหยุด</p>
                <p className="text-[20px] font-bold text-white">{todayHoliday.name}</p>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Holidays Card */}
        <UpcomingHolidaysCard upcomingHolidays={upcomingHolidays} />

        {/* Monthly Summary Cards */}
        <MonthlySummaryCards
          monthlyOT={monthlyOT}
          leaveBalance={leaveBalance}
          employee={employee}
        />

        {/* Quick Actions Grid */}
        <QuickActionsGrid unreadAnnouncementCount={unreadAnnouncementCount} />

        {/* My Profile Link */}
        <Link href="/my-profile">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e8e8ed] mb-4 hover:bg-[#f5f5f7] transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={employee?.name || "User"} size="md" />
                <div>
                  <h3 className="text-[15px] font-semibold text-[#1d1d1f]">ประวัติของฉัน</h3>
                  <p className="text-[13px] text-[#86868b]">ดู OT, ลา, WFH, สถิติ</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-[#86868b]" />
            </div>
          </div>
        </Link>

      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
