"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, User, Bell, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { employee } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread announcement count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!employee?.id) return;

      try {
        const { data: announcements } = await supabase
          .from("announcements")
          .select("id")
          .eq("published", true)
          .is("deleted_at", null)
          .lte("published_at", new Date().toISOString())
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

        if (!announcements || announcements.length === 0) {
          setUnreadCount(0);
          return;
        }

        const { data: reads } = await supabase
          .from("announcement_reads")
          .select("announcement_id")
          .eq("employee_id", employee.id);

        const readIds = new Set(reads?.map((r: any) => r.announcement_id) || []);
        const unread = announcements.filter((a: any) => !readIds.has(a.id)).length;

        setUnreadCount(unread);
      } catch (error) {
        console.error("Error fetching unread count:", error);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [employee?.id]);

  const tabs = [
    {
      name: "หน้าหลัก",
      href: "/",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      name: "ประกาศ",
      href: "/announcements",
      icon: Bell,
      isActive: pathname?.startsWith("/announcements"),
      badge: unreadCount,
    },
    {
      name: "ประวัติ",
      href: "/my-profile",
      icon: User,
      isActive: pathname?.startsWith("/my-profile"),
    },
    {
      name: "ตั้งค่า",
      href: "/settings",
      icon: Settings,
      isActive: pathname?.startsWith("/settings"),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#e8e8ed] pb-safe">
      <div className="max-w-[600px] mx-auto px-2">
        <div className="flex items-center justify-around h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.href}
                onClick={() => router.push(tab.href)}
                className={`flex flex-col items-center justify-center min-w-[60px] px-2 py-1.5 rounded-xl transition-all relative ${
                  tab.isActive
                    ? "text-[#0071e3]"
                    : "text-[#86868b] active:bg-[#f5f5f7]"
                }`}
              >
                {/* Badge */}
                {tab.badge && tab.badge > 0 && (
                  <div className="absolute top-0 right-1/2 translate-x-3 -translate-y-0.5">
                    <div className="min-w-[18px] h-[18px] px-1 bg-[#ff3b30] rounded-full flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white leading-none">
                        {tab.badge > 9 ? "9+" : tab.badge}
                      </span>
                    </div>
                  </div>
                )}

                {/* Icon */}
                <Icon
                  className={`w-6 h-6 mb-0.5 transition-all ${
                    tab.isActive ? "scale-110" : ""
                  }`}
                  strokeWidth={tab.isActive ? 2.5 : 2}
                />

                {/* Label */}
                <span
                  className={`text-[11px] font-medium ${
                    tab.isActive ? "font-semibold" : ""
                  }`}
                >
                  {tab.name}
                </span>

                {/* Active Indicator */}
                {tab.isActive && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#0071e3] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
