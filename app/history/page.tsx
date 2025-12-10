"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HistoryRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/my-profile");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fbfbfd]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#86868b]">กำลังนำทางไปหน้าประวัติของฉัน...</p>
      </div>
    </div>
  );
}
