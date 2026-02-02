/**
 * Admin Redirect Hook
 * =============================================
 * Redirects admin users to admin panel
 * Use this in pages that should not be accessible by admins
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";

/**
 * Hook to redirect admin users to admin panel
 * @param redirectTo - URL to redirect to (default: "/admin")
 */
export function useAdminRedirect(redirectTo: string = "/admin") {
  const { employee } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (employee?.role === "admin") {
      router.replace(redirectTo);
    }
  }, [employee, router, redirectTo]);

  return {
    isAdmin: employee?.role === "admin",
    isLoading: !employee,
  };
}
