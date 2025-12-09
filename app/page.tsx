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
  ChevronDown,
  Settings,
  Timer,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { format } from "date-fns";

export default function HomePage() {
  const { user, employee, loading, signOut } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [activeOT, setActiveOT] = useState<any>(null);
  const [workSettings, setWorkSettings] = useState({ startTime: "09:00", endTime: "18:00", hoursPerDay: 8 });
  
  // Timer states
  const [workDuration, setWorkDuration] = useState<string>("00:00:00");
  const [otDuration, setOtDuration] = useState<string>("00:00:00");
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [workProgress, setWorkProgress] = useState(0);
  const [isOvertime, setIsOvertime] = useState(false);
  
  // Holiday states
  const [todayHoliday, setTodayHoliday] = useState<any>(null);
  const [upcomingHolidays, setUpcomingHolidays] = useState<any[]>([]);
  const [showAllHolidays, setShowAllHolidays] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch today's data (attendance, OT, settings)
  useEffect(() => {
    if (employee) {
      fetchTodayData();
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchTodayData, 30000);
      return () => clearInterval(interval);
    }
  }, [employee]);

  // Refresh when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && employee) {
        fetchTodayData();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [employee]);

  // Live timer update every second
  useEffect(() => {
    const updateTimers = () => {
      const now = new Date();
      
      // Work Duration
      if (todayAttendance?.clock_in_time && !todayAttendance?.clock_out_time) {
        const clockInTime = new Date(todayAttendance.clock_in_time);
        const diffMs = now.getTime() - clockInTime.getTime();
        
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        
        setWorkDuration(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
        
        // Progress (based on standard hours)
        const progressPercent = Math.min((diffMs / (workSettings.hoursPerDay * 60 * 60 * 1000)) * 100, 100);
        setWorkProgress(progressPercent);
        
        // Time remaining until end of work
        const [endHour, endMinute] = workSettings.endTime.split(":").map(Number);
        const endOfWork = new Date(now);
        endOfWork.setHours(endHour, endMinute, 0, 0);
        
        const remainingMs = endOfWork.getTime() - now.getTime();
        if (remainingMs > 0) {
          const remHours = Math.floor(remainingMs / (1000 * 60 * 60));
          const remMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
          setTimeRemaining(`${remHours} ชม. ${remMinutes} นาที`);
          setIsOvertime(false);
        } else {
          const overtimeMs = Math.abs(remainingMs);
          const otHours = Math.floor(overtimeMs / (1000 * 60 * 60));
          const otMinutes = Math.floor((overtimeMs % (1000 * 60 * 60)) / (1000 * 60));
          setTimeRemaining(`เกินเวลา ${otHours} ชม. ${otMinutes} นาที`);
          setIsOvertime(true);
        }
      } else if (todayAttendance?.clock_out_time) {
        // Already checked out - show total
        const clockInTime = new Date(todayAttendance.clock_in_time);
        const clockOutTime = new Date(todayAttendance.clock_out_time);
        const diffMs = clockOutTime.getTime() - clockInTime.getTime();
        
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        setWorkDuration(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`);
        setWorkProgress(Math.min((diffMs / (workSettings.hoursPerDay * 60 * 60 * 1000)) * 100, 100));
        setTimeRemaining("");
        setIsOvertime(false);
      } else {
        setWorkDuration("00:00:00");
        setWorkProgress(0);
        setTimeRemaining("");
        setIsOvertime(false);
      }
      
      // OT Duration
      if (activeOT?.actual_start_time && !activeOT?.actual_end_time) {
        const otStartTime = new Date(activeOT.actual_start_time);
        const diffMs = now.getTime() - otStartTime.getTime();
        
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        
        setOtDuration(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
      } else {
        setOtDuration("00:00:00");
      }
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [todayAttendance, activeOT, workSettings]);

  const fetchTodayData = async () => {
    if (!employee) return;
    const today = new Date().toISOString().split("T")[0];
    
    // Fetch attendance, active OT, settings, and holidays in parallel
    const [attendanceRes, otRes, settingsRes, holidaysRes] = await Promise.all([
      supabase
        .from("attendance_logs")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("work_date", today)
        .single(),
      supabase
        .from("ot_requests")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("request_date", today)
        .eq("status", "approved")
        .not("actual_start_time", "is", null)
        .is("actual_end_time", null)
        .single(),
      supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["work_start_time", "work_end_time", "work_hours_per_day"]),
      supabase
        .from("holidays")
        .select("*")
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(10),
    ]);

    setTodayAttendance(attendanceRes.data);
    setActiveOT(otRes.data);
    
    // Parse settings
    if (settingsRes.data) {
      const settings: Record<string, string> = {};
      settingsRes.data.forEach((s: any) => {
        settings[s.setting_key] = s.setting_value;
      });
      setWorkSettings({
        startTime: settings.work_start_time || "09:00",
        endTime: settings.work_end_time || "18:00",
        hoursPerDay: parseFloat(settings.work_hours_per_day || "8"),
      });
    }
    
    // Parse holidays
    if (holidaysRes.data) {
      const holidays = holidaysRes.data;
      
      // Check if today is a holiday
      const todayHol = holidays.find((h: any) => h.date === today);
      setTodayHoliday(todayHol);
      
      // Get upcoming holidays (next 3, excluding today)
      const upcoming = holidays.filter((h: any) => h.date > today).slice(0, 3);
      setUpcomingHolidays(upcoming);
    }
  };

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
      <main className="max-w-[480px] mx-auto px-4 py-6">
        {/* Welcome & Date */}
        <div className="mb-6">
          <p className="text-[13px] text-[#86868b] mb-1">
            {new Date().toLocaleDateString("th-TH", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <h1 className="text-[28px] font-bold text-[#1d1d1f]">
            สวัสดี, {employee?.name?.split(" ")[0]}
          </h1>
        </div>

        {/* Today's Status Card */}
        <div className={`rounded-2xl p-5 mb-4 ${
          todayAttendance 
            ? isOvertime
              ? "bg-gradient-to-br from-[#ff9500] to-[#ff6b00]"
              : "bg-gradient-to-br from-[#34c759] to-[#248a3d]" 
            : "bg-gradient-to-br from-[#1d1d1f] to-[#3d3d3d]"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] text-white/70 font-medium">สถานะวันนี้</span>
            <div className={`w-2.5 h-2.5 rounded-full ${todayAttendance ? "bg-white" : "bg-[#ff9500]"} animate-pulse`} />
          </div>
          
          {todayAttendance ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <UserCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-white/80">
                      {todayAttendance.clock_out_time ? "เสร็จสิ้น" : isOvertime ? "⚠️ ทำงานเกินเวลา" : "กำลังทำงาน"}
                    </p>
                    <p className="text-[13px] text-white/60">
                      เข้า {format(new Date(todayAttendance.clock_in_time), "HH:mm")} น.
                      {todayAttendance.clock_out_time && ` - ออก ${format(new Date(todayAttendance.clock_out_time), "HH:mm")} น.`}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Work Timer */}
              <div className="text-center mb-4">
                <p className="text-[42px] font-bold text-white tracking-tight font-mono">
                  {workDuration}
                </p>
                <p className="text-[13px] text-white/60">
                  {todayAttendance.clock_out_time ? "ชั่วโมงทำงานวันนี้" : "เวลาทำงาน"}
                </p>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-[12px] text-white/70 mb-1.5">
                  <span>ความคืบหน้า</span>
                  <span>{Math.round(workProgress)}%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-500"
                    style={{ width: `${workProgress}%` }}
                  />
                </div>
              </div>
              
              {/* Time Remaining / Overtime Alert */}
              {!todayAttendance.clock_out_time && timeRemaining && (
                <div className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl mb-3 ${
                  isOvertime ? "bg-white/20" : "bg-white/10"
                }`}>
                  {isOvertime ? (
                    <AlertCircle className="w-4 h-4 text-white" />
                  ) : (
                    <Clock className="w-4 h-4 text-white/70" />
                  )}
                  <span className="text-[14px] text-white font-medium">
                    {timeRemaining}
                  </span>
                </div>
              )}
              
              {!todayAttendance.clock_out_time && (
                <Link href="/checkout">
                  <button className="w-full py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-all">
                    เช็คเอาท์
                  </button>
                </Link>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white/70" />
                </div>
                <div>
                  <p className="text-[22px] font-bold text-white">ยังไม่ได้เช็คอิน</p>
                  <p className="text-[14px] text-white/60">กดปุ่มด้านล่างเพื่อเริ่มงาน</p>
                </div>
              </div>
              <Link href="/checkin">
                <button className="w-full py-3.5 bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  เช็คอินเลย
                </button>
              </Link>
            </div>
          )}
        </div>
        
        {/* OT Timer Card */}
        {activeOT && (
          <div className="rounded-2xl p-5 mb-4 bg-gradient-to-br from-[#ff9500] to-[#ff6b00]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-white/80" />
                <span className="text-[13px] text-white/80 font-medium">กำลังทำ OT</span>
              </div>
              <Badge className="bg-white/20 text-white border-0">
                {activeOT.ot_type === "holiday" ? "2x" : "1.5x"}
              </Badge>
            </div>
            
            <div className="text-center mb-4">
              <p className="text-[42px] font-bold text-white tracking-tight font-mono">
                {otDuration}
              </p>
              <p className="text-[13px] text-white/60">
                เริ่ม {format(new Date(activeOT.actual_start_time), "HH:mm")} น.
              </p>
            </div>
            
            <Link href={`/ot/end/${activeOT.id}`}>
              <button className="w-full py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
                จบ OT
              </button>
            </Link>
          </div>
        )}
        
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
        {upcomingHolidays.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e8e8ed] mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#0071e3]" />
                <h3 className="text-[16px] font-semibold text-[#1d1d1f]">วันหยุดถัดไป</h3>
              </div>
              <button
                onClick={() => setShowAllHolidays(!showAllHolidays)}
                className="text-[13px] text-[#0071e3] hover:underline"
              >
                {showAllHolidays ? "ซ่อน" : "ดูทั้งหมด"}
              </button>
            </div>
            
            <div className="space-y-3">
              {upcomingHolidays.map((holiday: any) => {
                const holidayDate = new Date(holiday.date);
                const today = new Date();
                const daysUntil = Math.ceil((holidayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <div key={holiday.id} className="flex items-center gap-3 p-3 bg-[#f5f5f7] rounded-xl">
                    <div className="w-12 h-12 bg-[#af52de]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-[20px]">🗓️</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium text-[#1d1d1f] truncate">
                        {holiday.name}
                      </p>
                      <p className="text-[13px] text-[#86868b]">
                        {format(holidayDate, "d MMMM yyyy", { locale: require("date-fns/locale/th") })}
                        {daysUntil > 0 && (
                          <span className="text-[#af52de]"> • อีก {daysUntil} วัน</span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {showAllHolidays && (
              <Link href="/holidays">
                <button className="w-full mt-3 py-2.5 text-[14px] text-[#0071e3] font-medium hover:bg-[#0071e3]/10 rounded-xl transition-colors">
                  ดูปฏิทินวันหยุดทั้งหมด
                </button>
              </Link>
            )}
          </div>
        )}

        {/* Main Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link href="/checkin">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e8e8ed] hover:shadow-md hover:border-[#0071e3]/30 transition-all cursor-pointer group">
              <div className="w-12 h-12 bg-[#0071e3]/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-[#0071e3]/20 transition-colors">
                <UserCheck className="w-6 h-6 text-[#0071e3]" />
              </div>
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">เข้างาน</h2>
              <p className="text-[13px] text-[#86868b]">บันทึกเวลาเข้า</p>
            </div>
          </Link>
          <Link href="/checkout">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e8e8ed] hover:shadow-md hover:border-[#ff3b30]/30 transition-all cursor-pointer group">
              <div className="w-12 h-12 bg-[#ff3b30]/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-[#ff3b30]/20 transition-colors">
                <LogOut className="w-6 h-6 text-[#ff3b30]" />
              </div>
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">ออกงาน</h2>
              <p className="text-[13px] text-[#86868b]">บันทึกเวลาออก</p>
            </div>
          </Link>
        </div>

        {/* Quick Actions Grid */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e8e8ed] mb-6">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4 px-1">เมนูด่วน</h3>
          <div className="grid grid-cols-4 gap-2">
            {[
              { href: "/ot", icon: Timer, title: "OT", color: "#ff9500" },
              { href: "/leave/request", icon: Calendar, title: "ลางาน", color: "#af52de" },
              { href: "/wfh/request", icon: Home, title: "WFH", color: "#007aff" },
              { href: "/late-request", icon: AlertCircle, title: "ขอสาย", color: "#ff3b30" },
            ].map((action, i) => (
              <Link key={i} href={action.href}>
                <div className="flex flex-col items-center p-3 rounded-xl hover:bg-[#f5f5f7] transition-colors cursor-pointer">
                  <div 
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-2"
                    style={{ backgroundColor: `${action.color}15` }}
                  >
                    <action.icon className="w-5 h-5" style={{ color: action.color }} />
                  </div>
                  <span className="text-[12px] font-medium text-[#1d1d1f]">{action.title}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* History Link */}
        <Link href="/history">
          <div className="bg-gradient-to-r from-[#5856d6] to-[#7c7aff] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <ChartBar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold text-white">ดูประวัติการทำงาน</h3>
                  <p className="text-[13px] text-white/70">เช็คสถิติและรายละเอียด</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-white/70" />
            </div>
          </div>
        </Link>
      </main>
    </div>
  );
}
