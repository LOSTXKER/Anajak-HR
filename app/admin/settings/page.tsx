"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  Clock,
  Bell,
  DollarSign,
  Calendar,
  Building2,
  MessageCircle,
  UserCheck,
  Zap,
  ChevronRight,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Settings Menu Items
const settingsMenuItems = [
  {
    section: "การตั้งค่าหลัก",
    items: [
      {
        href: "/admin/settings/work-time",
        icon: Clock,
        iconColor: "text-[#0071e3]",
        iconBg: "bg-[#0071e3]/10",
        title: "เวลาทำงาน",
        description: "เวลาเข้า-ออก, วันทำงาน, เกณฑ์มาสาย",
      },
      {
        href: "/admin/settings/ot-payroll",
        icon: DollarSign,
        iconColor: "text-[#34c759]",
        iconBg: "bg-[#34c759]/10",
        title: "OT & เงินเดือน",
        description: "อัตรา OT, กฎการคำนวณ",
      },
      {
        href: "/admin/settings/leave-quota",
        icon: Calendar,
        iconColor: "text-[#5ac8fa]",
        iconBg: "bg-[#5ac8fa]/10",
        title: "โควต้าวันลา",
        description: "วันลาเริ่มต้นสำหรับพนักงานใหม่",
      },
      {
        href: "/admin/settings/auto-approve",
        icon: Zap,
        iconColor: "text-[#ff9500]",
        iconBg: "bg-[#ff9500]/10",
        title: "อนุมัติอัตโนมัติ",
        description: "OT, ลา, WFH, มาสาย",
      },
    ],
  },
  {
    section: "การแจ้งเตือน",
    items: [
      {
        href: "/admin/settings/notifications",
        icon: Bell,
        iconColor: "text-[#ff3b30]",
        iconBg: "bg-[#ff3b30]/10",
        title: "การแจ้งเตือน",
        description: "แจ้งเตือนเข้า-ออก, OT, Auto-checkout",
      },
      {
        href: "/admin/settings/line",
        icon: MessageCircle,
        iconColor: "text-[#06C755]",
        iconBg: "bg-[#06C755]/10",
        title: "LINE Integration",
        description: "เชื่อมต่อ LINE API",
      },
    ],
  },
  {
    section: "จัดการข้อมูล",
    items: [
      {
        href: "/admin/holidays",
        icon: Calendar,
        iconColor: "text-[#ff3b30]",
        iconBg: "bg-[#ff3b30]/10",
        title: "วันหยุด",
        description: "เพิ่ม/แก้ไขวันหยุดประจำปี",
      },
      {
        href: "/admin/branches",
        icon: Building2,
        iconColor: "text-[#af52de]",
        iconBg: "bg-[#af52de]/10",
        title: "สาขา",
        description: "จัดการสาขาและตำแหน่ง GPS",
      },
      {
        href: "/admin/employees",
        icon: UserCheck,
        iconColor: "text-[#0071e3]",
        iconBg: "bg-[#0071e3]/10",
        title: "พนักงาน",
        description: "ดูรายชื่อ, อนุมัติบัญชีใหม่",
      },
    ],
  },
];

// Sidebar Menu Item Component
const SidebarMenuItem = ({
  href,
  icon: Icon,
  iconColor,
  iconBg,
  title,
  description,
  isActive,
}: {
  href: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  isActive: boolean;
}) => (
  <Link href={href}>
    <div
      className={`
        flex items-center gap-3 px-3 py-3 rounded-xl transition-all cursor-pointer group
        ${isActive 
          ? "bg-[#0071e3] text-white" 
          : "hover:bg-[#f5f5f7]"
        }
      `}
    >
      <div className={`w-9 h-9 ${isActive ? "bg-white/20" : iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${isActive ? "text-white" : iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className={`text-[14px] font-medium ${isActive ? "text-white" : "text-[#1d1d1f]"}`}>
          {title}
        </h4>
        <p className={`text-[12px] truncate ${isActive ? "text-white/70" : "text-[#86868b]"}`}>
          {description}
        </p>
      </div>
      <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white/70" : "text-[#86868b] opacity-0 group-hover:opacity-100"} transition-opacity`} />
    </div>
  </Link>
);

// Settings Sidebar Component
const SettingsSidebar = ({ currentPath }: { currentPath: string }) => (
  <div className="w-full lg:w-72 flex-shrink-0">
    <div className="bg-white rounded-2xl border border-[#e8e8ed] p-4 sticky top-4">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 pb-4 mb-2 border-b border-[#e8e8ed]">
        <div className="w-10 h-10 bg-[#f5f5f7] rounded-xl flex items-center justify-center">
          <Settings className="w-5 h-5 text-[#86868b]" />
        </div>
        <div>
          <h2 className="text-[16px] font-semibold text-[#1d1d1f]">ตั้งค่าระบบ</h2>
          <p className="text-[12px] text-[#86868b]">จัดการการตั้งค่าต่างๆ</p>
        </div>
      </div>

      {/* Menu Sections */}
      <div className="space-y-4">
        {settingsMenuItems.map((section) => (
          <div key={section.section}>
            <h3 className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider px-3 mb-2">
              {section.section}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => (
                <SidebarMenuItem
                  key={item.href}
                  {...item}
                  isActive={currentPath === item.href}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

function SettingsContent() {
  const pathname = usePathname();

  return (
    <AdminLayout title="ตั้งค่าระบบ" description="จัดการการตั้งค่าต่างๆ ของระบบ">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <SettingsSidebar currentPath={pathname} />

        {/* Main Content Area - Welcome Screen */}
        <div className="flex-1">
          <div className="bg-gradient-to-br from-[#f5f5f7] to-[#e8e8ed] rounded-2xl p-8 min-h-[400px] flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
              <Settings className="w-8 h-8 text-[#86868b]" />
            </div>
            <h2 className="text-[20px] font-semibold text-[#1d1d1f] mb-2">
              ยินดีต้อนรับสู่การตั้งค่า
            </h2>
            <p className="text-[14px] text-[#86868b] max-w-md mb-6">
              เลือกหมวดหมู่จากเมนูด้านซ้ายเพื่อปรับแต่งการทำงานของระบบ
            </p>
            
            {/* Quick Links */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
              <Link href="/admin/settings/work-time">
                <div className="p-4 bg-white rounded-xl hover:shadow-md transition-shadow cursor-pointer">
                  <Clock className="w-6 h-6 text-[#0071e3] mx-auto mb-2" />
                  <p className="text-[13px] font-medium text-[#1d1d1f]">เวลาทำงาน</p>
                </div>
              </Link>
              <Link href="/admin/settings/notifications">
                <div className="p-4 bg-white rounded-xl hover:shadow-md transition-shadow cursor-pointer">
                  <Bell className="w-6 h-6 text-[#ff3b30] mx-auto mb-2" />
                  <p className="text-[13px] font-medium text-[#1d1d1f]">การแจ้งเตือน</p>
                </div>
              </Link>
              <Link href="/admin/settings/ot-payroll">
                <div className="p-4 bg-white rounded-xl hover:shadow-md transition-shadow cursor-pointer">
                  <DollarSign className="w-6 h-6 text-[#34c759] mx-auto mb-2" />
                  <p className="text-[13px] font-medium text-[#1d1d1f]">OT & เงินเดือน</p>
                </div>
              </Link>
              <Link href="/admin/settings/line">
                <div className="p-4 bg-white rounded-xl hover:shadow-md transition-shadow cursor-pointer">
                  <MessageCircle className="w-6 h-6 text-[#06C755] mx-auto mb-2" />
                  <p className="text-[13px] font-medium text-[#1d1d1f]">LINE</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <SettingsContent />
    </ProtectedRoute>
  );
}
