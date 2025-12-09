"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Home,
    Clock,
    Timer,
    Menu,
    X,
    Calendar,
    Briefcase,
    AlertCircle,
    LogOut,
    Settings,
    UserCheck,
    User,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";

interface NavItem {
    href: string;
    icon: React.ElementType;
    label: string;
    color?: string;
}

export function BottomNav() {
    const pathname = usePathname();
    const { employee, signOut } = useAuth();
    const [showMore, setShowMore] = useState(false);

    const mainNavItems: NavItem[] = [
        { href: "/", icon: Home, label: "หน้าหลัก" },
        { href: "/history", icon: Clock, label: "ประวัติ" },
    ];

    const rightNavItems: NavItem[] = [
        { href: "/ot", icon: Timer, label: "OT" },
    ];

    const moreMenuItems: NavItem[] = [
        { href: "/leave/request", icon: Calendar, label: "ลางาน", color: "#af52de" },
        { href: "/wfh/request", icon: Briefcase, label: "WFH", color: "#007aff" },
        { href: "/late-request", icon: AlertCircle, label: "ขอสาย", color: "#ff3b30" },
        { href: "/holidays", icon: Calendar, label: "วันหยุด", color: "#34c759" },
    ];

    const isActive = (href: string) => {
        if (href === "/") return pathname === "/";
        return pathname.startsWith(href);
    };

    return (
        <>
            {/* More Menu Overlay */}
            {showMore && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
                    onClick={() => setShowMore(false)}
                />
            )}

            {/* More Menu Panel */}
            {showMore && (
                <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-50 bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
                    <div className="p-4 border-b border-[#e8e8ed]">
                        <div className="flex items-center justify-between">
                            <span className="text-[15px] font-semibold text-[#1d1d1f]">เมนูเพิ่มเติม</span>
                            <button
                                onClick={() => setShowMore(false)}
                                className="p-1.5 hover:bg-[#f5f5f7] rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-[#86868b]" />
                            </button>
                        </div>
                    </div>

                    {/* User Profile Card */}
                    <div className="px-3 pt-3">
                        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-[#0071e3]/10 to-[#5856d6]/10 rounded-xl">
                            <div className="w-12 h-12 bg-[#0071e3] rounded-full flex items-center justify-center">
                                <User className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[15px] font-semibold text-[#1d1d1f]">{employee?.name}</p>
                                <p className="text-[12px] text-[#86868b]">
                                    {employee?.role === "admin" ? "ผู้ดูแลระบบ" :
                                        employee?.role === "supervisor" ? "หัวหน้างาน" : "พนักงาน"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-3 grid grid-cols-4 gap-2">
                        {moreMenuItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setShowMore(false)}
                                className="flex flex-col items-center p-3 rounded-xl hover:bg-[#f5f5f7] transition-colors"
                            >
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-2"
                                    style={{ backgroundColor: `${item.color}15` }}
                                >
                                    <item.icon className="w-6 h-6" style={{ color: item.color }} />
                                </div>
                                <span className="text-[12px] font-medium text-[#1d1d1f]">{item.label}</span>
                            </Link>
                        ))}
                    </div>

                    {/* Admin Link */}
                    {(employee?.role === "admin" || employee?.role === "supervisor") && (
                        <div className="px-3 pb-3">
                            <Link
                                href="/admin"
                                onClick={() => setShowMore(false)}
                                className="flex items-center gap-3 p-3 bg-[#f5f5f7] rounded-xl hover:bg-[#e8e8ed] transition-colors"
                            >
                                <Settings className="w-5 h-5 text-[#0071e3]" />
                                <span className="text-[14px] font-medium text-[#1d1d1f]">จัดการระบบ (Admin)</span>
                            </Link>
                        </div>
                    )}

                    {/* Logout */}
                    <div className="px-3 pb-3">
                        <button
                            onClick={async () => {
                                setShowMore(false);
                                await signOut();
                            }}
                            className="w-full flex items-center gap-3 p-3 bg-[#ff3b30]/10 rounded-xl hover:bg-[#ff3b30]/20 transition-colors"
                        >
                            <LogOut className="w-5 h-5 text-[#ff3b30]" />
                            <span className="text-[14px] font-medium text-[#ff3b30]">ออกจากระบบ</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-[#e8e8ed] pb-[env(safe-area-inset-bottom)]">
                <div className="max-w-[480px] mx-auto px-4">
                    <div className="flex items-center justify-around h-16 relative">
                        {/* Left Nav Items */}
                        {mainNavItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all ${isActive(item.href)
                                    ? "text-[#0071e3]"
                                    : "text-[#86868b] hover:text-[#1d1d1f]"
                                    }`}
                            >
                                <item.icon className={`w-6 h-6 ${isActive(item.href) ? "text-[#0071e3]" : ""}`} />
                                <span className="text-[10px] font-medium mt-1">{item.label}</span>
                            </Link>
                        ))}

                        {/* Center Check-in/out Button */}
                        <Link
                            href="/checkin"
                            className="relative -top-4"
                        >
                            <div className="w-16 h-16 bg-gradient-to-br from-[#0071e3] to-[#0077ed] rounded-full flex items-center justify-center shadow-lg shadow-[#0071e3]/30 hover:shadow-xl hover:shadow-[#0071e3]/40 transition-all active:scale-95">
                                <UserCheck className="w-7 h-7 text-white" />
                            </div>
                            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-[#0071e3] whitespace-nowrap">
                                เช็คอิน
                            </span>
                        </Link>

                        {/* Right Nav Items */}
                        {rightNavItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all ${isActive(item.href)
                                    ? "text-[#0071e3]"
                                    : "text-[#86868b] hover:text-[#1d1d1f]"
                                    }`}
                            >
                                <item.icon className={`w-6 h-6 ${isActive(item.href) ? "text-[#0071e3]" : ""}`} />
                                <span className="text-[10px] font-medium mt-1">{item.label}</span>
                            </Link>
                        ))}

                        {/* More Button */}
                        <button
                            onClick={() => setShowMore(!showMore)}
                            className={`flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all ${showMore
                                ? "text-[#0071e3]"
                                : "text-[#86868b] hover:text-[#1d1d1f]"
                                }`}
                        >
                            <Menu className="w-6 h-6" />
                            <span className="text-[10px] font-medium mt-1">อื่นๆ</span>
                        </button>
                    </div>
                </div>
            </nav>
        </>
    );
}
