"use client";

import Link from "next/link";
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
  TrendingUp,
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

const tools: ToolCard[] = [
  {
    title: "จัดการ OT",
    description: "สร้าง แก้ไข หรือยกเลิก OT ของพนักงาน",
    icon: Clock,
    color: "text-[#ff9500]",
    bgColor: "bg-[#ff9500]/10",
    href: "/admin/tools/ot-manage",
    badge: "ใหม่",
    badgeColor: "bg-[#ff9500]",
  },
  {
    title: "แก้ไขเวลาเข้า-ออก",
    description: "แก้ไขเวลาเช็คอิน-เช็คเอาท์ของพนักงาน",
    icon: Edit3,
    color: "text-[#0071e3]",
    bgColor: "bg-[#0071e3]/10",
    href: "/admin/attendance",
  },
  {
    title: "Quick Fix Dashboard",
    description: "แสดงปัญหาที่ต้องแก้ไขด่วน",
    icon: AlertCircle,
    color: "text-[#ff3b30]",
    bgColor: "bg-[#ff3b30]/10",
    href: "/admin/tools/quick-fix",
    badge: "ใหม่",
    badgeColor: "bg-[#ff3b30]",
  },
  {
    title: "จัดการคำขอทั้งหมด",
    description: "ดู แก้ไข หรือยกเลิกคำขอ (Leave, WFH, Late)",
    icon: FileEdit,
    color: "text-[#34c759]",
    bgColor: "bg-[#34c759]/10",
    href: "/admin/approvals",
  },
  {
    title: "จัดการพนักงาน",
    description: "เพิ่ม แก้ไข หรือลบข้อมูลพนักงาน",
    icon: Users,
    color: "text-[#af52de]",
    bgColor: "bg-[#af52de]/10",
    href: "/admin/employees",
  },
  {
    title: "ตรวจสอบความผิดปกติ",
    description: "ดูและจัดการความผิดปกติในการทำงาน",
    icon: TrendingUp,
    color: "text-[#5ac8fa]",
    bgColor: "bg-[#5ac8fa]/10",
    href: "/admin/anomalies",
  },
];

const quickActions = [
  {
    title: "อนุมัติ OT ที่ pending",
    count: 0,
    href: "/admin/approvals?type=ot",
    color: "text-[#ff9500]",
  },
  {
    title: "อนุมัติการลาที่ pending",
    count: 0,
    href: "/admin/approvals?type=leave",
    color: "text-[#0071e3]",
  },
  {
    title: "พนักงานที่ยังไม่เช็คเอาท์",
    count: 0,
    href: "/admin/monitor",
    color: "text-[#ff3b30]",
  },
];

function AdminToolsContent() {
  return (
    <AdminLayout 
      title="Admin Tools" 
      description="ศูนย์รวมเครื่องมือสำหรับจัดการระบบ"
    >
      {/* Hero Section */}
      <div className="mb-8 p-6 bg-gradient-to-br from-[#0071e3]/10 to-[#af52de]/10 rounded-2xl border border-[#0071e3]/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-[#0071e3] rounded-xl flex items-center justify-center">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-[24px] font-semibold text-[#1d1d1f]">Admin Tools Hub</h2>
            <p className="text-[15px] text-[#86868b]">
              เครื่องมือทรงพลังสำหรับจัดการระบบ HR ของคุณ
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-lg text-[13px] text-[#1d1d1f] font-medium border border-[#e8e8ed]">
            ✨ แก้ไขข้อมูลได้
          </span>
          <span className="px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-lg text-[13px] text-[#1d1d1f] font-medium border border-[#e8e8ed]">
            🔒 Audit Trail ครบถ้วน
          </span>
          <span className="px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-lg text-[13px] text-[#1d1d1f] font-medium border border-[#e8e8ed]">
            ⚡ รวดเร็ว ง่าย ปลอดภัย
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-[#ff9500]" />
          <h3 className="text-[17px] font-semibold text-[#1d1d1f]">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, idx) => (
            <Link key={idx} href={action.href}>
              <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-[#0071e3]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] text-[#86868b] mb-1">รอดำเนินการ</p>
                    <p className={`text-[15px] font-medium ${action.color}`}>
                      {action.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[24px] font-semibold text-[#1d1d1f]">
                      {action.count}
                    </span>
                    <ChevronRight className="w-5 h-5 text-[#86868b]" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Main Tools Grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Wrench className="w-5 h-5 text-[#0071e3]" />
          <h3 className="text-[17px] font-semibold text-[#1d1d1f]">เครื่องมือทั้งหมด</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool, idx) => (
            <Link key={idx} href={tool.href}>
              <Card className="hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-[#0071e3]">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 ${tool.bgColor} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <tool.icon className={`w-6 h-6 ${tool.color}`} />
                  </div>
                  {tool.badge && (
                    <span className={`px-2 py-1 ${tool.badgeColor} text-white text-[11px] font-medium rounded-md`}>
                      {tool.badge}
                    </span>
                  )}
                </div>
                <h4 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">
                  {tool.title}
                </h4>
                <p className="text-[14px] text-[#86868b] mb-4">
                  {tool.description}
                </p>
                <div className="flex items-center gap-2 text-[#0071e3] text-[14px] font-medium">
                  เปิดใช้งาน
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Tips Section */}
      <div className="mt-8 p-6 bg-[#f5f5f7] rounded-2xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-[#0071e3]/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-[#0071e3]" />
          </div>
          <div>
            <h4 className="text-[15px] font-semibold text-[#1d1d1f] mb-2">
              💡 เคล็ดลับการใช้งาน
            </h4>
            <ul className="space-y-1 text-[14px] text-[#86868b]">
              <li>• การแก้ไขทั้งหมดจะบันทึก audit trail (ใครแก้ เมื่อไร ทำไม)</li>
              <li>• สามารถยกเลิกคำขอที่อนุมัติไปแล้วได้ โดยระบุเหตุผล</li>
              <li>• Quick Fix Dashboard จะแสดงปัญหาที่ต้องแก้ไขอัตโนมัติ</li>
              <li>• ข้อมูลทั้งหมดสามารถ export เป็น CSV ได้</li>
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

