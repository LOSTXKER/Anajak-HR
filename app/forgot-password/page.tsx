"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Mail, ArrowLeft, Check } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาด");
      }

      setSent(true);
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center px-6">
        <div className="max-w-[480px] text-center animate-fade-in">
          <div className="w-20 h-20 bg-[#34c759] rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-white" strokeWidth={3} />
          </div>
          <h2 className="text-[28px] font-semibold text-[#1d1d1f] mb-3">
            ส่งลิงก์แล้ว
          </h2>
          <p className="text-[17px] text-[#86868b] mb-2">
            เราได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปยัง
          </p>
          <p className="text-[17px] font-medium text-[#1d1d1f] mb-6">
            {email}
          </p>
          <p className="text-[15px] text-[#86868b] mb-8">
            กรุณาตรวจสอบอีเมลของคุณ (รวมถึงโฟลเดอร์ Spam/Junk)
          </p>
          <div className="space-y-3">
            <Button
              variant="secondary"
              onClick={() => {
                setSent(false);
                setEmail("");
              }}
            >
              ส่งอีเมลอีกครั้ง
            </Button>
            <div>
              <Link
                href="/login"
                className="text-[15px] text-[#0071e3] hover:underline"
              >
                กลับไปหน้าเข้าสู่ระบบ
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbfd] flex flex-col">
      {/* Header */}
      <header className="py-4 px-6">
        <Link href="/" className="text-[#1d1d1f] font-semibold text-xl">
          Anajak HR
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px] animate-fade-in">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-[#0071e3]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-[#0071e3]" />
            </div>
            <h1 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight mb-3">
              ลืมรหัสผ่าน?
            </h1>
            <p className="text-[17px] text-[#86868b]">
              กรอกอีเมลที่ใช้สมัครสมาชิก
              <br />
              เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้คุณ
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              type="email"
              placeholder="อีเมล"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-5 h-5" />}
              required
            />

            {error && (
              <div className="text-center py-3 px-4 bg-[#ff3b30]/10 rounded-xl">
                <p className="text-[15px] text-[#ff3b30]">{error}</p>
              </div>
            )}

            <Button type="submit" fullWidth loading={loading} className="mt-8">
              ส่งลิงก์รีเซ็ตรหัสผ่าน
            </Button>
          </form>

          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-[15px] text-[#0071e3] hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับไปหน้าเข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-[12px] text-[#86868b]">
          © 2024 Anajak HR System. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
