"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { LogOut, Settings } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

export function Navbar() {
  const { user, employee, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-50 apple-glass border-b border-[#d2d2d7]/30">
      <div className="max-w-[980px] mx-auto px-6 h-12 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-[#1d1d1f] font-semibold">
          Anajak HR
        </Link>

        {/* User Menu */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Avatar name={employee?.name || "User"} size="sm" />
            <div className="hidden sm:block">
              <p className="text-[13px] font-medium text-[#1d1d1f]">
                {employee?.name}
              </p>
              <p className="text-[11px] text-[#86868b]">
                {employee?.role === "admin" && "ผู้ดูแลระบบ"}
                {employee?.role === "supervisor" && "หัวหน้างาน"}
                {employee?.role === "staff" && "พนักงาน"}
              </p>
            </div>
          </div>

          {(employee?.role === "admin" || employee?.role === "supervisor") && (
            <Link
              href="/admin"
              className="p-2 text-[#86868b] hover:text-[#0071e3] hover:bg-[#f5f5f7] rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </Link>
          )}

          <button
            onClick={handleSignOut}
            className="p-2 text-[#86868b] hover:text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
}
