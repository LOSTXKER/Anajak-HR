"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">!</span>
        </div>
        <h2 className="text-[20px] font-semibold text-[#1d1d1f] mb-2">
          เกิดข้อผิดพลาดในระบบ Admin
        </h2>
        <p className="text-[15px] text-[#86868b] mb-6">
          {error.message || "กรุณาลองใหม่อีกครั้ง"}
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset}>ลองใหม่</Button>
          <Button
            variant="secondary"
            onClick={() => (window.location.href = "/admin")}
          >
            กลับหน้า Admin
          </Button>
        </div>
      </div>
    </div>
  );
}
