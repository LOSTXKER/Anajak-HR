"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import {
  LayoutGrid,
  Users,
  Clock,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  FileText,
  Home,
  Building2,
  PartyPopper,
  AlertTriangle,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useState } from "react";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { employee, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { title: "Dashboard", href: "/admin", icon: LayoutGrid },
    { title: "พนักงาน", href: "/admin/employees", icon: Users },
    { title: "สาขา", href: "/admin/branches", icon: Building2 },
    { title: "วันหยุด", href: "/admin/holidays", icon: PartyPopper },
    { title: "การเข้างาน", href: "/admin/attendance", icon: Clock },
    { title: "ตรวจสอบความผิดปกติ", href: "/admin/anomalies", icon: AlertTriangle },
    { title: "คำขอ OT", href: "/admin/ot", icon: Calendar },
    { title: "คำขอลา", href: "/admin/leave", icon: FileText },
    { title: "คำขอ WFH", href: "/admin/wfh", icon: Home },
    { title: "รายงาน", href: "/admin/reports", icon: BarChart3 },
    { title: "ตั้งค่า", href: "/admin/settings", icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="h-12 flex items-center px-6 border-b border-[#e8e8ed]">
        <Link href="/admin" className="text-[#1d1d1f] font-semibold text-lg">
          Anajak HR
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl
                  text-[15px] font-medium transition-all duration-200
                  ${
                    isActive
                      ? "bg-[#0071e3] text-white"
                      : "text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                {item.title}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-[#e8e8ed]">
        <div className="flex items-center gap-3 mb-3">
          <Avatar name={employee?.name || "User"} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium text-[#1d1d1f] truncate">
              {employee?.name}
            </p>
            <p className="text-[12px] text-[#86868b]">
              {employee?.role === "admin" ? "ผู้ดูแลระบบ" : "หัวหน้างาน"}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[14px] text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          ออกจากระบบ
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-3 left-4 z-50 p-2 bg-white rounded-xl shadow-lg lg:hidden"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-screen w-64 bg-white border-r border-[#e8e8ed]
          flex flex-col z-40
          transition-transform duration-300 lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
