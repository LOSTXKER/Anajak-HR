"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        } else {
          setError(error.message);
        }
        throw error;
      }

      if (data.user) {
        const { data: employee } = await supabase
          .from("employees")
          .select("role, account_status")
          .eq("id", data.user.id)
          .maybeSingle();

        // Check account status
        if (employee?.account_status === "pending") {
          await supabase.auth.signOut();
          setError("บัญชีของคุณกำลังรอการอนุมัติจากผู้ดูแลระบบ");
          return;
        }

        if (employee?.account_status === "rejected") {
          await supabase.auth.signOut();
          setError("บัญชีของคุณถูกปฏิเสธ กรุณาติดต่อผู้ดูแลระบบ");
          return;
        }

        if (employee?.role === "admin" || employee?.role === "supervisor") {
          router.push("/admin");
        } else {
          router.push("/");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-[40px] font-semibold text-[#1d1d1f] tracking-tight mb-3">
              เข้าสู่ระบบ
            </h1>
            <p className="text-[17px] text-[#86868b]">
              ยินดีต้อนรับกลับ
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <Input
              type="email"
              placeholder="อีเมล"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-5 h-5" />}
              required
            />

            <Input
              type="password"
              placeholder="รหัสผ่าน"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-5 h-5" />}
              required
            />

            {error && (
              <div className="text-center py-3 px-4 bg-[#ff3b30]/10 rounded-xl">
                <p className="text-[15px] text-[#ff3b30]">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              loading={loading}
              className="mt-8"
            >
              เข้าสู่ระบบ
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[15px] text-[#86868b]">
              ยังไม่มีบัญชี?{" "}
              <Link
                href="/register"
                className="text-[#0071e3] hover:underline"
              >
                สมัครสมาชิก
              </Link>
            </p>
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
