"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/Card";
import { BottomNav } from "@/components/BottomNav";
import { Info, Package, Code, Heart, Users, Sparkles, ArrowLeft } from "lucide-react";

function AboutContent() {
  return (
    <div className="min-h-screen bg-[#fbfbfd] pb-20 pt-safe">
      <main className="max-w-[600px] mx-auto px-4 pt-6 pb-4">
        {/* Page Title */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/settings"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-[#86868b]" />
          </Link>
          <h1 className="text-[32px] font-bold text-[#1d1d1f]">เกี่ยวกับแอป</h1>
        </div>

        {/* App Logo & Version */}
        <Card elevated className="mb-6">
          <div className="text-center p-8">
            <div className="w-20 h-20 bg-gradient-to-br from-[#0071e3] to-[#0050a0] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-[28px] font-bold text-[#1d1d1f] mb-2">
              Anajak HR
            </h2>
            <p className="text-[15px] text-[#86868b] mb-1">
              ระบบบันทึกเวลาและจัดการ OT
            </p>
            <p className="text-[17px] font-semibold text-[#0071e3]">
              เวอร์ชัน 1.0.0
            </p>
          </div>
        </Card>

        {/* Features */}
        <div className="space-y-3 mb-6">
          <Card elevated className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#34c759]/10 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-[#34c759]" />
              </div>
              <div className="flex-1">
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                  จัดการพนักงาน
                </h3>
                <p className="text-[14px] text-[#86868b] mt-1">
                  บันทึกเวลาเข้า-ออกงานอัตโนมัติ
                </p>
              </div>
            </div>
          </Card>

          <Card elevated className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-[#ff9500]" />
              </div>
              <div className="flex-1">
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                  จัดการ OT
                </h3>
                <p className="text-[14px] text-[#86868b] mt-1">
                  ขอและอนุมัติ OT ผ่านระบบ
                </p>
              </div>
            </div>
          </Card>

          <Card elevated className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#0071e3]/10 rounded-xl flex items-center justify-center">
                <Code className="w-6 h-6 text-[#0071e3]" />
              </div>
              <div className="flex-1">
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                  Progressive Web App
                </h3>
                <p className="text-[14px] text-[#86868b] mt-1">
                  ติดตั้งบนมือถือได้เหมือน Native App
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tech Stack */}
        <Card className="mb-6 p-5">
          <div className="flex items-center gap-3 mb-4">
            <Code className="w-5 h-5 text-[#86868b]" />
            <h3 className="text-[16px] font-semibold text-[#1d1d1f]">
              เทคโนโลยีที่ใช้
            </h3>
          </div>
          <div className="space-y-2 text-[14px]">
            <div className="flex justify-between">
              <span className="text-[#86868b]">Framework:</span>
              <span className="text-[#1d1d1f] font-medium">Next.js 15</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#86868b]">Database:</span>
              <span className="text-[#1d1d1f] font-medium">Supabase</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#86868b]">UI:</span>
              <span className="text-[#1d1d1f] font-medium">Tailwind CSS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#86868b]">Deployment:</span>
              <span className="text-[#1d1d1f] font-medium">Vercel</span>
            </div>
          </div>
        </Card>

        {/* Made with Love */}
        <div className="flex items-center justify-center gap-2 text-[14px] text-[#86868b]">
          <span>สร้างด้วย</span>
          <Heart className="w-4 h-4 text-[#ff3b30] fill-[#ff3b30]" />
          <span>สำหรับ Anajak Company</span>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

export default function AboutPage() {
  return (
    <ProtectedRoute>
      <AboutContent />
    </ProtectedRoute>
  );
}

