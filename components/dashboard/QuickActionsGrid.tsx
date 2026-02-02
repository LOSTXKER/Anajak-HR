"use client";

import Link from "next/link";
import {
  Timer,
  Calendar,
  Home,
  MapPin,
  AlertCircle,
  Megaphone,
  LucideIcon,
} from "lucide-react";

interface QuickAction {
  href: string;
  icon: LucideIcon;
  title: string;
  color: string;
  badge?: number;
}

interface QuickActionsGridProps {
  unreadAnnouncementCount?: number;
}

const defaultActions: Omit<QuickAction, "badge">[] = [
  { href: "/announcements", icon: Megaphone, title: "ประกาศ", color: "#0071e3" },
  { href: "/ot", icon: Timer, title: "OT", color: "#ff9500" },
  { href: "/leave/request", icon: Calendar, title: "ลางาน", color: "#af52de" },
  { href: "/wfh/request", icon: Home, title: "WFH", color: "#007aff" },
  { href: "/field-work/request", icon: MapPin, title: "งานนอกที่", color: "#34c759" },
  { href: "/late-request", icon: AlertCircle, title: "ขอสาย", color: "#ff3b30" },
];

export function QuickActionsGrid({
  unreadAnnouncementCount = 0,
}: QuickActionsGridProps) {
  const actions: QuickAction[] = defaultActions.map((action) => ({
    ...action,
    badge: action.href === "/announcements" ? unreadAnnouncementCount : undefined,
  }));

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e8e8ed] mb-4">
      <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4 px-1">
        เมนูด่วน
      </h3>
      <div className="grid grid-cols-4 gap-2">
        {actions.map((action, i) => (
          <Link key={i} href={action.href}>
            <div className="flex flex-col items-center p-3 rounded-xl hover:bg-[#f5f5f7] transition-colors cursor-pointer relative">
              {action.badge && action.badge > 0 && (
                <div className="absolute top-1 right-1 w-5 h-5 bg-[#ff3b30] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {action.badge > 9 ? "9+" : action.badge}
                </div>
              )}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-2"
                style={{ backgroundColor: `${action.color}15` }}
              >
                <action.icon
                  className="w-5 h-5"
                  style={{ color: action.color }}
                />
              </div>
              <span className="text-[12px] font-medium text-[#1d1d1f]">
                {action.title}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
