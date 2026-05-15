"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminMaintenancePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/maintenance/quick-fix");
  }, [router]);

  return null;
}
