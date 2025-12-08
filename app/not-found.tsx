"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center px-6">
      <div className="text-center">
        <h1 className="text-[120px] font-bold text-[#e8e8ed] leading-none">
          404
        </h1>
        <h2 className="text-[28px] font-semibold text-[#1d1d1f] mt-4 mb-2">
          ไม่พบหน้านี้
        </h2>
        <p className="text-[17px] text-[#86868b] mb-8">
          หน้าที่คุณกำลังค้นหาไม่มีอยู่หรือถูกย้ายไปที่อื่น
        </p>
        <Link href="/">
          <Button size="lg">
            <Home className="w-5 h-5" />
            กลับหน้าแรก
          </Button>
        </Link>
      </div>
    </div>
  );
}
