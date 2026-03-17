"use client";

import { useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/Card";
import { BottomNav } from "@/components/BottomNav";
import {
  Info,
  Package,
  Code,
  Heart,
  Users,
  Sparkles,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Zap,
  Bug,
  TrendingUp,
  Trash2,
} from "lucide-react";
import { APP_VERSION, CHANGELOG, type ChangelogEntry } from "@/lib/version";

const categoryConfig = {
  feat: { label: "ใหม่", icon: Zap, color: "text-[#34c759]", bg: "bg-[#34c759]/10" },
  fix: { label: "แก้ไข", icon: Bug, color: "text-[#ff9500]", bg: "bg-[#ff9500]/10" },
  improve: { label: "ปรับปรุง", icon: TrendingUp, color: "text-[#0071e3]", bg: "bg-[#0071e3]/10" },
  remove: { label: "ลบ", icon: Trash2, color: "text-[#ff3b30]", bg: "bg-[#ff3b30]/10" },
};

function ChangelogCard({ entry, defaultOpen }: { entry: ChangelogEntry; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  const typeLabel = entry.type === "major" ? "Major" : entry.type === "minor" ? "Minor" : "Patch";
  const typeBg =
    entry.type === "major"
      ? "bg-[#0071e3]/10 text-[#0071e3]"
      : entry.type === "minor"
      ? "bg-[#34c759]/10 text-[#34c759]"
      : "bg-[#ff9500]/10 text-[#ff9500]";

  return (
    <Card elevated className="overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center gap-3 text-left active:bg-[#f5f5f7] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[17px] font-semibold text-[#1d1d1f]">
              v{entry.version}
            </span>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${typeBg}`}>
              {typeLabel}
            </span>
          </div>
          <p className="text-[14px] text-[#1d1d1f] font-medium">{entry.title}</p>
          <p className="text-[12px] text-[#86868b] mt-0.5">
            {new Date(entry.date).toLocaleDateString("th-TH", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        {open ? (
          <ChevronUp className="w-5 h-5 text-[#86868b] flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[#86868b] flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-[#e8e8ed] pt-3">
          {entry.changes.map((change, i) => {
            const config = categoryConfig[change.category];
            const Icon = config.icon;
            return (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-[11px] font-semibold ${config.color}`}>
                    {config.label}
                  </span>
                  <p className="text-[14px] text-[#1d1d1f] leading-snug">
                    {change.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

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
              เวอร์ชัน {APP_VERSION}
            </p>
          </div>
        </Card>

        {/* Patch Notes / Changelog */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 px-1">
            <Info className="w-5 h-5 text-[#86868b]" />
            <h3 className="text-[16px] font-semibold text-[#1d1d1f]">
              อัปเดตล่าสุด
            </h3>
          </div>
          <div className="space-y-3">
            {CHANGELOG.map((entry, i) => (
              <ChangelogCard key={entry.version} entry={entry} defaultOpen={i === 0} />
            ))}
          </div>
        </div>

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
