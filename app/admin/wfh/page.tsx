"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WFHRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/approvals?type=wfh");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#86868b]">กำลังนำทางไปหน้าอนุมัติ WFH...</p>
      </div>
    </div>
  );
}
