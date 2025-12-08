"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { User, Mail, Phone, Lock, Check } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [requireApproval, setRequireApproval] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาด");
      }

      setRequireApproval(data.requireApproval !== false);
      setSuccess(true);
      
      // ถ้าไม่ต้องรอการอนุมัติ ให้ redirect ไปหน้า login ทันที
      if (data.requireApproval === false) {
        setTimeout(() => router.push("/login"), 1500);
      }
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center px-6">
        <div className="max-w-[480px] text-center animate-scale-in">
          <div className={`w-20 h-20 ${requireApproval ? 'bg-[#ff9500]' : 'bg-[#34c759]'} rounded-full flex items-center justify-center mx-auto mb-6`}>
            <Check className="w-10 h-10 text-white" strokeWidth={3} />
          </div>
          <h2 className="text-[28px] font-semibold text-[#1d1d1f] mb-3">
            {requireApproval ? 'ส่งคำขอสมัครสมาชิกแล้ว' : 'สมัครสมาชิกสำเร็จ'}
          </h2>
          <p className="text-[17px] text-[#86868b] mb-8">
            {requireApproval ? (
              <>บัญชีของคุณอยู่ในระหว่างการตรวจสอบ<br />กรุณารอผู้ดูแลระบบอนุมัติก่อนเข้าใช้งาน</>
            ) : (
              <>บัญชีของคุณพร้อมใช้งานแล้ว<br />กำลังนำคุณไปยังหน้าเข้าสู่ระบบ...</>
            )}
          </p>
          <Button onClick={() => router.push("/login")} variant="secondary">
            {requireApproval ? 'กลับสู่หน้าเข้าสู่ระบบ' : 'เข้าสู่ระบบเลย'}
          </Button>
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
            <h1 className="text-[40px] font-semibold text-[#1d1d1f] tracking-tight mb-3">
              สมัครสมาชิก
            </h1>
            <p className="text-[17px] text-[#86868b]">
              สร้างบัญชีใหม่เพื่อเริ่มใช้งาน
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              placeholder="ชื่อ-นามสกุล"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              icon={<User className="w-5 h-5" />}
              required
            />

            <Input
              type="email"
              placeholder="อีเมล"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              icon={<Mail className="w-5 h-5" />}
              required
            />

            <Input
              type="tel"
              placeholder="เบอร์โทรศัพท์"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              icon={<Phone className="w-5 h-5" />}
              required
            />

            <Input
              type="password"
              placeholder="รหัสผ่าน"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              icon={<Lock className="w-5 h-5" />}
              required
            />

            <Input
              type="password"
              placeholder="ยืนยันรหัสผ่าน"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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
              className="mt-6"
            >
              สมัครสมาชิก
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[15px] text-[#86868b]">
              มีบัญชีอยู่แล้ว?{" "}
              <Link
                href="/login"
                className="text-[#0071e3] hover:underline"
              >
                เข้าสู่ระบบ
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
