"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Lock, Check, AlertCircle } from "lucide-react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    let timeout: NodeJS.Timeout | null = null;

    const init = async () => {
      // Listen for auth state change first (before getSession)
      // so we don't miss the PASSWORD_RECOVERY event
      const { data } = supabase.auth.onAuthStateChange(
        (event: AuthChangeEvent, session: Session | null) => {
          if (
            (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") &&
            session
          ) {
            setSessionReady(true);
          }
        }
      );
      subscription = data.subscription;

      // Check if there's already an active session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
        return;
      }

      // Give Supabase time to process the hash fragment
      timeout = setTimeout(() => {
        setInvalidLink(true);
      }, 6000);
    };

    init();

    return () => {
      subscription?.unsubscribe();
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (password !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        if (error.message.includes("same")) {
          setError("รหัสผ่านใหม่ต้องไม่เหมือนกับรหัสผ่านเดิม");
        } else {
          setError(error.message);
        }
        return;
      }

      setSuccess(true);
      // Sign out so they log in fresh with new password
      await supabase.auth.signOut();
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center px-6">
        <div className="max-w-[480px] text-center animate-fade-in">
          <div className="w-20 h-20 bg-[#34c759] rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-white" strokeWidth={3} />
          </div>
          <h2 className="text-[28px] font-semibold text-[#1d1d1f] mb-3">
            เปลี่ยนรหัสผ่านสำเร็จ
          </h2>
          <p className="text-[17px] text-[#86868b] mb-8">
            กำลังนำคุณไปยังหน้าเข้าสู่ระบบ...
          </p>
          <Button onClick={() => router.push("/login")} variant="secondary">
            เข้าสู่ระบบเลย
          </Button>
        </div>
      </div>
    );
  }

  if (invalidLink && !sessionReady) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center px-6">
        <div className="max-w-[480px] text-center animate-fade-in">
          <div className="w-20 h-20 bg-[#ff3b30]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-[#ff3b30]" />
          </div>
          <h2 className="text-[28px] font-semibold text-[#1d1d1f] mb-3">
            ลิงก์ไม่ถูกต้องหรือหมดอายุ
          </h2>
          <p className="text-[17px] text-[#86868b] mb-8">
            ลิงก์สำหรับรีเซ็ตรหัสผ่านอาจหมดอายุแล้ว
            <br />
            กรุณาขอลิงก์ใหม่อีกครั้ง
          </p>
          <div className="space-y-3">
            <Button onClick={() => router.push("/forgot-password")}>
              ขอลิงก์ใหม่
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

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-[#0071e3] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[17px] text-[#86868b]">กำลังตรวจสอบลิงก์...</p>
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
            <div className="w-16 h-16 bg-[#5856d6]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-[#5856d6]" />
            </div>
            <h1 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight mb-3">
              ตั้งรหัสผ่านใหม่
            </h1>
            <p className="text-[17px] text-[#86868b]">
              กรอกรหัสผ่านใหม่ที่ต้องการใช้งาน
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              type="password"
              placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-5 h-5" />}
              required
            />

            <Input
              type="password"
              placeholder="ยืนยันรหัสผ่านใหม่"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={<Lock className="w-5 h-5" />}
              required
            />

            {error && (
              <div className="text-center py-3 px-4 bg-[#ff3b30]/10 rounded-xl">
                <p className="text-[15px] text-[#ff3b30]">{error}</p>
              </div>
            )}

            <Button type="submit" fullWidth loading={loading} className="mt-8">
              ตั้งรหัสผ่านใหม่
            </Button>
          </form>
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
