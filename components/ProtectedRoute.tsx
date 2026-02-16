"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { ShieldAlert } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("staff" | "supervisor" | "admin")[];
}

export function ProtectedRoute({
  children,
  allowedRoles = ["staff", "supervisor", "admin"],
}: ProtectedRouteProps) {
  const { user, employee, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (!employee) {
        // User exists but employee record missing - redirect to login
        router.push("/login");
      } else if (!allowedRoles.includes(employee.role)) {
        router.push("/");
      }
    }
  }, [user, employee, loading, router, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-[15px] text-[#86868b]">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!user || !employee) {
    return null;
  }

  if (!allowedRoles.includes(employee.role)) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#ff3b30]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-[#ff3b30]" />
          </div>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] mb-2">
            ไม่มีสิทธิ์เข้าถึง
          </h1>
          <p className="text-[17px] text-[#86868b]">
            คุณไม่มีสิทธิ์เข้าถึงหน้านี้
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
