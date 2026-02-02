"use client";

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
        description: "เวลาเข้า-ออก, วันทำงาน",
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
        description: "วันลาสำหรับพนักงานใหม่",
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
        description: "แจ้งเตือน, Auto-checkout",
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
        description: "วันหยุดประจำปี",
      },
      {
        href: "/admin/branches",
        icon: Building2,
        iconColor: "text-[#af52de]",
        iconBg: "bg-[#af52de]/10",
        title: "สาขา",
        description: "จัดการสาขา, GPS",
      },
      {
        href: "/admin/employees",
        icon: UserCheck,
        iconColor: "text-[#0071e3]",
        iconBg: "bg-[#0071e3]/10",
        title: "พนักงาน",
        description: "รายชื่อ, อนุมัติบัญชี",
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
        flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer group
        ${isActive 
          ? "bg-[#0071e3] text-white" 
          : "hover:bg-[#f5f5f7]"
        }
      `}
    >
      <div className={`w-8 h-8 ${isActive ? "bg-white/20" : iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${isActive ? "text-white" : iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className={`text-[13px] font-medium ${isActive ? "text-white" : "text-[#1d1d1f]"}`}>
          {title}
        </h4>
        <p className={`text-[11px] truncate ${isActive ? "text-white/70" : "text-[#86868b]"}`}>
          {description}
        </p>
      </div>
      <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white/70" : "text-[#86868b] opacity-0 group-hover:opacity-100"} transition-opacity`} />
    </div>
  </Link>
);

// Settings Sidebar Component
const SettingsSidebar = ({ currentPath }: { currentPath: string }) => (
  <div className="w-full lg:w-64 flex-shrink-0">
    <div className="bg-white rounded-2xl border border-[#e8e8ed] overflow-hidden sticky top-4">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#f5f5f7] border-b border-[#e8e8ed]">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
          <Settings className="w-4 h-4 text-[#86868b]" />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-[#1d1d1f]">ตั้งค่าระบบ</h2>
        </div>
      </div>

      {/* Menu Sections */}
      <div className="p-3 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
        {settingsMenuItems.map((section) => (
          <div key={section.section}>
            <h3 className="text-[10px] font-semibold text-[#86868b] uppercase tracking-wider px-3 mb-1.5">
              {section.section}
            </h3>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <SidebarMenuItem
                  key={item.href}
                  {...item}
                  isActive={currentPath === item.href || currentPath.startsWith(item.href + "/")}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Settings Layout Component
interface SettingsLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

export function SettingsLayout({ children, title, description }: SettingsLayoutProps) {
  const pathname = usePathname();

  return (
    <AdminLayout title={title} description={description}>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar - Hidden on mobile, visible on desktop */}
        <div className="hidden lg:block">
          <SettingsSidebar currentPath={pathname} />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </AdminLayout>
  );
}
