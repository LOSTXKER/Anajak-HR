"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { supabase } from "@/lib/supabase/client";
import {
  LayoutGrid,
  Users,
  Clock,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  FileText,
  DollarSign,
  Activity,
  Megaphone,
  Zap,
  Building2,
  CalendarDays,
  Target,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useState, useEffect } from "react";

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface MenuItem {
  title: string;
  href: string;
  icon: any;
  badge?: number;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { employee, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCounts, setPendingCounts] = useState({
    employees: 0,
    approvals: 0,
  });

  useEffect(() => {
    fetchPendingCounts();
    const interval = setInterval(fetchPendingCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingCounts = async () => {
    try {
      const [employeesResult, otResult, leaveResult, wfhResult, lateResult, fieldWorkResult] = await Promise.all([
        supabase
          .from("employees")
          .select("id", { count: "exact", head: true })
          .eq("account_status", "pending")
          .is("deleted_at", null),
        supabase
          .from("ot_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("leave_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("wfh_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("late_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("field_work_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);

      setPendingCounts({
        employees: employeesResult.count || 0,
        approvals: (otResult.count || 0) + (leaveResult.count || 0) + (wfhResult.count || 0) + (lateResult.count || 0) + (fieldWorkResult.count || 0),
      });
    } catch (error) {
      console.error("Error fetching pending counts:", error);
    }
  };

  const menuSections: MenuSection[] = [
    {
      title: "หลัก",
      items: [
        { title: "Dashboard", href: "/admin", icon: LayoutGrid },
        { title: "ประกาศ", href: "/admin/announcements", icon: Megaphone },
        { title: "คำขอ", href: "/admin/requests", icon: FileText, badge: pendingCounts.approvals },
      ],
    },
    {
      title: "จัดการ",
      items: [
        { title: "พนักงาน", href: "/admin/employees", icon: Users, badge: pendingCounts.employees },
        { title: "การเข้างาน", href: "/admin/attendance", icon: Clock },
        { title: "Quick Fix", href: "/admin/tools/quick-fix", icon: Zap },
        { title: "Monitor", href: "/admin/monitor", icon: Activity },
      ],
    },
    {
      title: "ผลงาน",
      items: [
        { title: "KPI", href: "/admin/kpi", icon: Target },
      ],
    },
    {
      title: "การเงิน",
      items: [
        { title: "เงินเดือน", href: "/admin/payroll", icon: DollarSign },
        { title: "รายงาน", href: "/admin/reports", icon: BarChart3 },
      ],
    },
    {
      title: "ตั้งค่า",
      items: [
        { title: "ตั้งค่าระบบ", href: "/admin/settings", icon: Settings },
        { title: "สาขา", href: "/admin/branches", icon: Building2 },
        { title: "วันหยุด", href: "/admin/holidays", icon: CalendarDays },
      ],
    },
  ];

  const totalPending = pendingCounts.employees + pendingCounts.approvals;

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-[#e8e8ed]">
        <Link href="/admin" className="text-[#1d1d1f] font-semibold text-lg">
          Anajak HR
        </Link>
        {totalPending > 0 && (
          <span className="px-2 py-0.5 bg-[#ff3b30] text-white text-[11px] font-bold rounded-full animate-pulse">
            {totalPending}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3 overflow-y-auto">
        {menuSections.map((section) => (
          <div key={section.title} className="mb-4">
            {/* Section Header */}
            <div className="px-3 py-1.5 text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">
              {section.title}
            </div>

            {/* Section Items */}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== "/admin" && pathname.startsWith(item.href + "/")) ||
                  (item.href === "/admin" && pathname === "/admin");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-xl
                      text-[14px] font-medium transition-all duration-200 relative
                      ${isActive
                        ? "bg-[#0071e3] text-white"
                        : "text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                      }
                    `}
                  >
                    <item.icon className="w-[18px] h-[18px]" />
                    <span className="flex-1">{item.title}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`
                          px-1.5 py-0.5 text-[10px] font-bold rounded-full min-w-[20px] text-center
                          ${isActive ? "bg-white/20 text-white" : "bg-[#ff3b30] text-white"}
                        `}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
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
        {totalPending > 0 && !mobileOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#ff3b30] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {totalPending}
          </span>
        )}
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
