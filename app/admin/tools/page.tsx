"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import {
  Clock,
  Calendar,
  AlertCircle,
  Edit3,
  Wrench,
  FileEdit,
  ChevronRight,
  Zap,
  Users,
  Plus,
  MapPin,
  Home,
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle,
} from "lucide-react";

interface ToolCard {
  title: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
  href: string;
  badge?: string;
  badgeColor?: string;
}

interface QuickAction {
  title: string;
  count: number;
  href: string;
  color: string;
  icon: any;
}

function AdminToolsContent() {
  const [quickStats, setQuickStats] = useState({
    pendingOT: 0,
    pendingLeave: 0,
    noCheckout: 0,
    pendingEmployees: 0,
  });

  useEffect(() => {
    fetchQuickStats();
  }, []);

  const fetchQuickStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const [otRes, leaveRes, checkoutRes, empRes] = await Promise.all([
        supabase.from("ot_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("attendance_logs").select("id", { count: "exact", head: true }).eq("work_date", today).is("clock_out_time", null),
        supabase.from("employees").select("id", { count: "exact", head: true }).eq("account_status", "pending"),
      ]);

      setQuickStats({
        pendingOT: otRes.count || 0,
        pendingLeave: leaveRes.count || 0,
        noCheckout: checkoutRes.count || 0,
        pendingEmployees: empRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // Main tools
  const tools: ToolCard[] = [
    {
      title: "จัดการคำขอทั้งหมด",
      description: "ดู แก้ไข อนุมัติ ยกเลิก ทุกประเภทคำขอ",
      icon: FileEdit,
      color: "text-[#0071e3]",
      bgColor: "bg-[#0071e3]/10",
      href: "/admin/requests",
    },
    {
      title: "เพิ่มคำขอใหม่",
      description: "สร้าง OT, ลา, WFH, มาสาย, งานนอกสถานที่",
      icon: Plus,
      color: "text-[#34c759]",
      bgColor: "bg-[#34c759]/10",
      href: "/admin/requests/create",
    },
    {
      title: "Quick Fix Dashboard",
      description: "แก้ไขปัญหาด่วน ด้วยคลิกเดียว",
      icon: Zap,
      color: "text-[#ff3b30]",
      bgColor: "bg-[#ff3b30]/10",
      href: "/admin/tools/quick-fix",
      badge: (quickStats.noCheckout > 0) ? `${quickStats.noCheckout}` : undefined,
      badgeColor: "bg-[#ff3b30]",
    },
    {
      title: "แก้ไขเวลาเข้า-ออก",
      description: "แก้ไขเวลาเช็คอิน-เช็คเอาท์ของพนักงาน",
      icon: Edit3,
      color: "text-[#ff9500]",
      bgColor: "bg-[#ff9500]/10",
      href: "/admin/attendance",
    },
    {
      title: "จัดการพนักงาน",
      description: "เพิ่ม แก้ไข หรือจัดการข้อมูลพนักงาน",
      icon: Users,
      color: "text-[#af52de]",
      bgColor: "bg-[#af52de]/10",
      href: "/admin/employees",
      badge: quickStats.pendingEmployees > 0 ? `${quickStats.pendingEmployees}` : undefined,
      badgeColor: "bg-[#af52de]",
    },
  ];

  // Settings tools
  const settingsTools: ToolCard[] = [
    {
      title: "จัดการสาขา",
      description: "เพิ่ม แก้ไข ตำแหน่งสาขา และรัศมี",
      icon: Building2,
      color: "text-[#5ac8fa]",
      bgColor: "bg-[#5ac8fa]/10",
      href: "/admin/branches",
    },
    {
      title: "วันหยุดประจำปี",
      description: "จัดการวันหยุดนักขัตฤกษ์",
      icon: CalendarDays,
      color: "text-[#34c759]",
      bgColor: "bg-[#34c759]/10",
      href: "/admin/holidays",
    },
  ];

  // Quick actions
  const quickActions: QuickAction[] = [
    {
      title: "OT รออนุมัติ",
      count: quickStats.pendingOT,
      href: "/admin/approvals?type=ot",
      color: "text-[#ff9500]",
      icon: Clock,
    },
    {
      title: "ลางานรออนุมัติ",
      count: quickStats.pendingLeave,
      href: "/admin/approvals?type=leave",
      color: "text-[#0071e3]",
      icon: Calendar,
    },
    {
      title: "ยังไม่เช็คเอาท์",
      count: quickStats.noCheckout,
      href: "/admin/tools/quick-fix",
      color: "text-[#ff3b30]",
      icon: AlertCircle,
    },
  ];

  const totalPending = quickStats.pendingOT + quickStats.pendingLeave;

  return (
    <AdminLayout 
      title="Admin Tools" 
      description="ศูนย์รวมเครื่องมือสำหรับจัดการระบบ"
    >
      {/* Hero Section */}
      <div className="mb-8 p-6 bg-gradient-to-br from-[#0071e3]/10 via-[#af52de]/5 to-[#ff9500]/10 rounded-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-[#0071e3] rounded-xl flex items-center justify-center shadow-lg">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-[24px] font-semibold text-[#1d1d1f]">Admin Tools Hub</h2>
            <p className="text-[15px] text-[#86868b]">
              เครื่องมือทรงพลังสำหรับจัดการระบบ HR
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-lg text-[13px] text-[#1d1d1f] font-medium">
            ✨ สร้างคำขอแทนพนักงาน
          </span>
          <span className="px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-lg text-[13px] text-[#1d1d1f] font-medium">
            🔧 แก้ไขข้อมูลย้อนหลัง
          </span>
          <span className="px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-lg text-[13px] text-[#1d1d1f] font-medium">
            ⚡ Quick Fix ด้วยคลิกเดียว
          </span>
        </div>
      </div>

      {/* Quick Actions - Only show if there are pending items */}
      {(totalPending > 0 || quickStats.noCheckout > 0) && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-[#ff9500]" />
            <h3 className="text-[17px] font-semibold text-[#1d1d1f]">ต้องดำเนินการ</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.filter(a => a.count > 0).map((action, idx) => (
              <Link key={idx} href={action.href}>
                <Card className="hover:shadow-lg transition-all cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color.replace('text-', 'bg-')}/10`}>
                        <action.icon className={`w-5 h-5 ${action.color}`} />
                      </div>
                      <div>
                        <p className="text-[13px] text-[#86868b]">รอดำเนินการ</p>
                        <p className={`text-[15px] font-medium ${action.color}`}>
                          {action.title}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[28px] font-bold text-[#1d1d1f]">
                        {action.count}
                      </span>
                      <ChevronRight className="w-5 h-5 text-[#86868b] group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* No Pending - Show success state */}
      {totalPending === 0 && quickStats.noCheckout === 0 && (
        <div className="mb-8">
          <Card className="!bg-[#34c759]/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#34c759]/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#34c759]" />
              </div>
              <div>
                <p className="text-[15px] font-medium text-[#1d1d1f]">ไม่มีงานค้าง</p>
                <p className="text-[13px] text-[#86868b]">ทุกอย่างเรียบร้อยดี ✨</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Main Tools Grid */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Wrench className="w-5 h-5 text-[#0071e3]" />
          <h3 className="text-[17px] font-semibold text-[#1d1d1f]">เครื่องมือหลัก</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tools.map((tool, idx) => (
            <Link key={idx} href={tool.href}>
              <Card className="hover:shadow-lg transition-all cursor-pointer group h-full">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 ${tool.bgColor} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0`}>
                    <tool.icon className={`w-6 h-6 ${tool.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-[17px] font-semibold text-[#1d1d1f]">
                        {tool.title}
                      </h4>
                      {tool.badge && (
                        <span className={`px-2 py-0.5 ${tool.badgeColor} text-white text-[11px] font-medium rounded-md`}>
                          {tool.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[14px] text-[#86868b]">
                      {tool.description}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#86868b] group-hover:translate-x-1 transition-transform flex-shrink-0" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Settings Tools */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <FileEdit className="w-5 h-5 text-[#86868b]" />
          <h3 className="text-[17px] font-semibold text-[#1d1d1f]">ตั้งค่าระบบ</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {settingsTools.map((tool, idx) => (
            <Link key={idx} href={tool.href}>
              <Card className="hover:shadow-md transition-all cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${tool.bgColor} rounded-lg flex items-center justify-center`}>
                    <tool.icon className={`w-5 h-5 ${tool.color}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[15px] font-medium text-[#1d1d1f]">
                      {tool.title}
                    </h4>
                    <p className="text-[13px] text-[#86868b]">
                      {tool.description}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#86868b] group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Tips Section */}
      <div className="p-5 bg-[#f5f5f7] rounded-2xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-[#0071e3]/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-[#0071e3]" />
          </div>
          <div>
            <h4 className="text-[15px] font-semibold text-[#1d1d1f] mb-2">
              💡 เคล็ดลับการใช้งาน
            </h4>
            <ul className="space-y-1.5 text-[14px] text-[#86868b]">
              <li>• <strong>เพิ่มคำขอใหม่</strong> - สร้างคำขอแทนพนักงาน (OT, ลา, WFH, มาสาย, งานนอกสถานที่) พร้อมอนุมัติทันที</li>
              <li>• <strong>Quick Fix</strong> - แก้ไขปัญหาด่วน เช่น พนักงานลืมเช็คเอาท์</li>
              <li>• <strong>แก้ไขเวลา</strong> - แก้ไขเวลาเข้า-ออกงาน พร้อมบันทึกประวัติ</li>
              <li>• การแก้ไขทั้งหมดจะบันทึก audit trail (ใครแก้ เมื่อไร ทำไม)</li>
            </ul>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default function AdminToolsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminToolsContent />
    </ProtectedRoute>
  );
}
